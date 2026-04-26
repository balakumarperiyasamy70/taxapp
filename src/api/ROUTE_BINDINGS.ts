/**
 * TaxApp — Next.js App Router Route Bindings
 *
 * Copy each block below into the corresponding file path shown above it.
 * All logic lives in src/api/routes/ — these files are thin bindings only.
 *
 * File structure:
 *
 *   src/app/api/
 *   ├── extensions/
 *   │   ├── route.ts                  ← GET list, POST create
 *   │   ├── ack/
 *   │   │   └── route.ts              ← POST IRS webhook
 *   │   └── [id]/
 *   │       ├── route.ts              ← GET single
 *   │       └── submit/
 *   │           └── route.ts          ← POST submit to IRS
 *   └── returns/
 *       ├── route.ts                  ← GET list, POST create
 *       ├── ack/
 *       │   └── route.ts              ← POST IRS webhook
 *       └── [id]/
 *           ├── route.ts              ← GET single, PATCH update
 *           ├── transition/
 *           │   └── route.ts          ← POST transition
 *           ├── diagnostics/
 *           │   └── route.ts          ← GET diagnostics
 *           ├── submit/
 *           │   └── route.ts          ← POST submit
 *           └── amend/
 *               └── route.ts          ← POST amend
 */

// ═══════════════════════════════════════════════
// src/app/api/extensions/route.ts
// ═══════════════════════════════════════════════
/*
import { NextRequest } from "next/server"
import { GET_list, POST_create } from "@/api/routes/extensions"

export const GET  = (req: NextRequest) => GET_list(req)
export const POST = (req: NextRequest) => POST_create(req)
*/

// ═══════════════════════════════════════════════
// src/app/api/extensions/[id]/route.ts
// ═══════════════════════════════════════════════
/*
import { NextRequest } from "next/server"
import { GET_single } from "@/api/routes/extensions"

export const GET = (req: NextRequest, ctx: { params: { id: string } }) =>
  GET_single(req, ctx)
*/

// ═══════════════════════════════════════════════
// src/app/api/extensions/[id]/submit/route.ts
// ═══════════════════════════════════════════════
/*
import { NextRequest } from "next/server"
import { POST_submit } from "@/api/routes/extensions"

export const POST = (req: NextRequest, ctx: { params: { id: string } }) =>
  POST_submit(req, ctx)
*/

// ═══════════════════════════════════════════════
// src/app/api/extensions/ack/route.ts
// ═══════════════════════════════════════════════
/*
import { NextRequest } from "next/server"
import { POST_ack } from "@/api/routes/extensions"

export const POST = (req: NextRequest) => POST_ack(req)
*/

// ═══════════════════════════════════════════════
// src/app/api/returns/route.ts
// ═══════════════════════════════════════════════
/*
import { NextRequest } from "next/server"
import { GET_list, POST_create } from "@/api/routes/returns"

export const GET  = (req: NextRequest) => GET_list(req)
export const POST = (req: NextRequest) => POST_create(req)
*/

// ═══════════════════════════════════════════════
// src/app/api/returns/[id]/route.ts
// ═══════════════════════════════════════════════
/*
import { NextRequest } from "next/server"
import { GET_single, PATCH_update } from "@/api/routes/returns"

export const GET   = (req: NextRequest, ctx: { params: { id: string } }) => GET_single(req, ctx)
export const PATCH = (req: NextRequest, ctx: { params: { id: string } }) => PATCH_update(req, ctx)
*/

// ═══════════════════════════════════════════════
// src/app/api/returns/[id]/transition/route.ts
// ═══════════════════════════════════════════════
/*
import { NextRequest } from "next/server"
import { POST_transition } from "@/api/routes/returns"

export const POST = (req: NextRequest, ctx: { params: { id: string } }) =>
  POST_transition(req, ctx)
*/

// ═══════════════════════════════════════════════
// src/app/api/returns/[id]/diagnostics/route.ts
// ═══════════════════════════════════════════════
/*
import { NextRequest } from "next/server"
import { GET_diagnostics } from "@/api/routes/returns"

export const GET = (req: NextRequest, ctx: { params: { id: string } }) =>
  GET_diagnostics(req, ctx)
*/

// ═══════════════════════════════════════════════
// src/app/api/returns/[id]/submit/route.ts
// ═══════════════════════════════════════════════
/*
import { NextRequest } from "next/server"
import { POST_submit } from "@/api/routes/returns"

export const POST = (req: NextRequest, ctx: { params: { id: string } }) =>
  POST_submit(req, ctx)
*/

// ═══════════════════════════════════════════════
// src/app/api/returns/[id]/amend/route.ts
// ═══════════════════════════════════════════════
/*
import { NextRequest } from "next/server"
import { POST_amend } from "@/api/routes/returns"

export const POST = (req: NextRequest, ctx: { params: { id: string } }) =>
  POST_amend(req, ctx)
*/

// ═══════════════════════════════════════════════
// src/app/api/returns/ack/route.ts
// ═══════════════════════════════════════════════
/*
import { NextRequest } from "next/server"
import { POST_ack } from "@/api/routes/returns"

export const POST = (req: NextRequest) => POST_ack(req)
*/

export {} // keeps TypeScript happy as a module
