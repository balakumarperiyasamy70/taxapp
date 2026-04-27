import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/src/lib/prisma"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null

        const user = await prisma.user.findFirst({
          where: { email: { equals: credentials?.email, mode: "insensitive" } },

        })
	console.log("USER FOUND:", user)
        if (!user || !user.isActive) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: (user as any).role,
          firmId: (user as any).firmId,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.firmId = (user as any).firmId
      }
      return token
    },
    async session({ session, token }) {
      (session.user as any) = {
        ...session.user,
        id: token.id as string,
        role: token.role as any,
        firmId: token.firmId as string,
      }
      return session
    },
  },
  session: { strategy: "jwt" },
}
