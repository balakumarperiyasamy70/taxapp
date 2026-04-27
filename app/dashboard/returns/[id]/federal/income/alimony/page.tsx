"use client"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../../../ReturnNav"

export default function AlimonyPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const base = `/dashboard/returns/${id}`
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ taxpayerAmount:"", taxpayerDate:"", spouseAmount:"", spouseDate:"" })
  function set(f: string, v: string) { setForm(p => ({ ...p, [f]: v })) }

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/returns/${id}/income/alimony`, {
      method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form),
    })
    setSaving(false)
    router.push(`${base}/federal/income`)
  }

  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={2025} />
      <main className="main">
        <div className="breadcrumb">Income › Alimony Received</div>
        <h1 className="title">Alimony Received</h1>
        <button className="cancel-btn" onClick={() => router.push(`${base}/federal/income`)}>CANCEL</button>
        <div className="card">
          <MF label="Amount of Alimony Taxpayer Received" value={form.taxpayerAmount} onChange={(v: any) => set("taxpayerAmount",v)} />
          <div className="field">
            <label>Date of original divorce or separation agreement</label>
            <p className="note">*If the agreement has been modified to conform to TCJA after 2018, enter this date of modification instead.</p>
            <input type="date" value={form.taxpayerDate} onChange={(e: any) => set("taxpayerDate",e.target.value)} />
          </div>
          <MF label="Amount of Alimony Spouse Received" value={form.spouseAmount} onChange={(v: any) => set("spouseAmount",v)} />
          <div className="field">
            <label>Date of original divorce or separation agreement</label>
            <p className="note">*If the agreement has been modified to conform to TCJA after 2018, enter this date of modification instead.</p>
            <input type="date" value={form.spouseDate} onChange={(e: any) => set("spouseDate",e.target.value)} />
          </div>
        </div>
        <div className="footer">
          <button className="cancel-btn" onClick={() => router.push(`${base}/federal/income`)}>CANCEL</button>
          <button className="continue-btn" onClick={handleSave} disabled={saving}>{saving?"Saving...":"CONTINUE"}</button>
        </div>
      </main>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .root{display:flex;min-height:100vh;font-family:'DM Sans',sans-serif;background:#f8fafc}
        .main{flex:1;margin-left:220px;padding:24px 36px;display:flex;flex-direction:column;gap:16px}
        .breadcrumb{font-size:12px;color:#94a3b8}.title{font-size:22px;font-weight:700;color:#0f172a}
        .card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:22px 24px;display:flex;flex-direction:column;gap:14px}
        .field{display:flex;flex-direction:column;gap:5px}
        .field label{font-size:13px;font-weight:500;color:#374151}
        .field input{padding:9px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none}
        .field input:focus{border-color:#3b82f6}
        .note{font-size:11px;color:#94a3b8;font-style:italic}
        .money-input{display:flex;align-items:center;border:1px solid #d1d5db;border-radius:6px;overflow:hidden}
        .money-input span{padding:8px;background:#f8fafc;font-size:13px;color:#64748b;border-right:1px solid #d1d5db}
        .money-input input{border:none;padding:8px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;flex:1}
        .footer{display:flex;justify-content:space-between}
        .cancel-btn,.continue-btn{background:#1e3a5f;color:#fff;border:none;padding:9px 20px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
        .cancel-btn:hover,.continue-btn:hover{background:#1e40af}
        .continue-btn:disabled{opacity:0.5}
      `}</style>
    </div>
  )
}
function MF({ label, value, onChange }: any) {
  return <div className="field"><label>{label}</label><div className="money-input"><span>$</span><input type="number" step="0.01" value={value} onChange={(e: any) => onChange(e.target.value)} /></div></div>
}
