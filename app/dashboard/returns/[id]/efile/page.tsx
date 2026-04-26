"use client"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../ReturnNav"

export default function efilePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const base = `/dashboard/returns/${id}`

  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={2025} />
      <main className="main">
        <h1 className="title">E-file</h1>
        <div className="card">
          <p className="coming-soon">This section is under construction. Coming soon.</p>
        </div>
        <div className="footer">
          <button className="back-btn" onClick={() => router.back()}>BACK</button>
          <button className="continue-btn" onClick={() => router.push(`${base}/summary`)}>CONTINUE</button>
        </div>
      </main>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .root{display:flex;min-height:100vh;font-family:'DM Sans',sans-serif;background:#f8fafc}
        .main{flex:1;margin-left:220px;padding:32px 40px;display:flex;flex-direction:column;gap:20px}
        .title{font-size:22px;font-weight:600;color:#0f172a}
        .card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:32px;text-align:center}
        .coming-soon{font-size:15px;color:#94a3b8}
        .footer{display:flex;justify-content:space-between}
        .back-btn,.continue-btn{background:#1e3a5f;color:#fff;border:none;padding:10px 24px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
        .back-btn:hover,.continue-btn:hover{background:#1e40af}
      `}</style>
    </div>
  )
}
