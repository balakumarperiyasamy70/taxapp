"use client"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../../ReturnNav"

const FILING_STATUSES = [
  { value: "SINGLE", label: "Single" },
  { value: "MARRIED_FILING_JOINTLY", label: "Married filing jointly (even if only one had income)" },
  { value: "MARRIED_FILING_SEPARATELY", label: "Married filing separately (MFS). Enter spouse's SSN above and full name here:" },
  { value: "HEAD_OF_HOUSEHOLD", label: "Head of household (HOH)" },
  { value: "QUALIFYING_SURVIVING_SPOUSE", label: "Qualifying surviving spouse (QSS)" },
  { value: "NONRESIDENT_ALIEN", label: "Nonresident Alien" },
]

export default function FilingStatusPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const base = `/dashboard/returns/${id}`
  const [status, setStatus] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/returns/${id}/f1040`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filingStatus: status }),
    })
    setSaving(false)
    router.push(`${base}/basic-info`)
  }

  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={2025} />
      <main className="main">
        <h1 className="title">Filing Status</h1>
        <div className="card">
          <p className="note">Check only one box.</p>
          <div className="options">
            {FILING_STATUSES.map(s => (
              <label key={s.value} className={`option ${status === s.value ? "selected" : ""}`}>
                <input type="radio" name="fs" value={s.value} checked={status === s.value} onChange={() => setStatus(s.value)} />
                <span>{s.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="footer">
          <button className="back-btn" onClick={() => router.push(`${base}/basic-info`)}>BACK</button>
          <button className="continue-btn" onClick={handleSave} disabled={saving || !status}>{saving ? "Saving..." : "CONTINUE"}</button>
        </div>
      </main>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .root{display:flex;min-height:100vh;font-family:'DM Sans',sans-serif;background:#f8fafc}
        .main{flex:1;margin-left:220px;padding:32px 40px;display:flex;flex-direction:column;gap:20px}
        .title{font-size:22px;font-weight:600;color:#0f172a}
        .card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:24px;display:flex;flex-direction:column;gap:16px}
        .note{font-size:13px;color:#64748b}
        .options{display:flex;flex-direction:column;gap:12px}
        .option{display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:12px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;color:#374151;transition:all 0.15s}
        .option:hover{border-color:#93c5fd;background:#f0f9ff}
        .option.selected{border-color:#3b82f6;background:#eff6ff;color:#1e40af;font-weight:500}
        .option input{margin-top:2px;flex-shrink:0}
        .footer{display:flex;justify-content:space-between}
        .back-btn,.continue-btn{background:#1e3a5f;color:#fff;border:none;padding:10px 24px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
        .back-btn:hover,.continue-btn:hover{background:#1e40af}
        .continue-btn:disabled{opacity:0.5;cursor:not-allowed}
      `}</style>
    </div>
  )
}
