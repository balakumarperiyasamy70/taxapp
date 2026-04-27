"use client"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../../ReturnNav"

export default function IPPINPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const base = `/dashboard/returns/${id}`
  const [taxpayerPIN, setTaxpayerPIN] = useState("")
  const [spousePIN, setSpousePIN] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/returns/${id}/ip-pin`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taxpayerPIN, spousePIN }),
    })
    setSaving(false)
    router.push(`${base}/basic-info`)
  }

  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={2025} />
      <main className="main">
        <h1 className="title">IRS Identity Protection PIN</h1>
        <div className="card">
          <p className="note">Enter the 6-digit Identity Protection PIN (IP PIN) issued by the IRS. You will find this on the CP01A notice sent to you by the IRS. If you did not receive an IP PIN, leave this blank.</p>
          <div className="field">
            <label>Taxpayer IP PIN</label>
            <input maxLength={6} placeholder="6-digit PIN" value={taxpayerPIN} onChange={(e: any) => setTaxpayerPIN(e.target.value.replace(/\D/g, ""))} style={{maxWidth: 200}} />
          </div>
          <div className="field">
            <label>Spouse IP PIN</label>
            <input maxLength={6} placeholder="6-digit PIN" value={spousePIN} onChange={(e: any) => setSpousePIN(e.target.value.replace(/\D/g, ""))} style={{maxWidth: 200}} />
          </div>
        </div>
        <div className="footer">
          <button className="back-btn" onClick={() => router.push(`${base}/basic-info`)}>BACK</button>
          <button className="continue-btn" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "CONTINUE"}</button>
        </div>
      </main>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .root{display:flex;min-height:100vh;font-family:'DM Sans',sans-serif;background:#f8fafc}
        .main{flex:1;margin-left:220px;padding:32px 40px;display:flex;flex-direction:column;gap:20px}
        .title{font-size:22px;font-weight:600;color:#0f172a}
        .card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:24px;display:flex;flex-direction:column;gap:16px}
        .note{font-size:13px;color:#64748b;line-height:1.6}
        .field{display:flex;flex-direction:column;gap:6px}
        .field label{font-size:13px;font-weight:500;color:#374151}
        .field input{padding:9px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;letter-spacing:4px}
        .field input:focus{border-color:#3b82f6}
        .footer{display:flex;justify-content:space-between}
        .back-btn,.continue-btn{background:#1e3a5f;color:#fff;border:none;padding:10px 24px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
        .back-btn:hover,.continue-btn:hover{background:#1e40af}
        .continue-btn:disabled{opacity:0.5;cursor:not-allowed}
      `}</style>
    </div>
  )
}
