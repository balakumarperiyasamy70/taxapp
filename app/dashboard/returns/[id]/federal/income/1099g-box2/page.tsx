"use client"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../../../ReturnNav"

export default function Form1099GBox2Page() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const base = `/dashboard/returns/${id}`
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    bypassAmount: "", stateRefund2024: "",
    priorStateLocalTax: "", priorItemizedDeduction: "",
    priorStateWithheld: "", priorSalesTax: "",
    priorFilingStatus: "", claimedAge65: false, claimedBlind: false,
  })
  function set(f: string, v: any) { setForm(p => ({ ...p, [f]: v })) }

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/returns/${id}/income/1099g-box2`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    router.push(`${base}/federal/income`)
  }

  const FILING_STATUSES = ["Single","Married Filing Jointly","Married Filing Separately","Head of Household","Qualifying Surviving Spouse"]

  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={2025} />
      <main className="main">
        <div className="breadcrumb">Income › 1099-G Box 2</div>
        <h1 className="title">State & Local Refund Worksheet</h1>
        <button className="cancel-btn" onClick={() => router.push(`${base}/federal/income`)}>CANCEL</button>

        <div className="card">
          <h2>Bypass State Refund Worksheet</h2>
          <p className="note">Enter an amount here to bypass worksheet and enter the full amount as taxable on Form 1040</p>
          <MF label="" value={form.bypassAmount} onChange={(v: any) => set("bypassAmount", v)} />
        </div>

        <div className="card">
          <h2>State & Local Refunds</h2>
          <MF label="2024 state tax refunds (all refunds from 1099-G or similar statements)" value={form.stateRefund2024} onChange={(v: any) => set("stateRefund2024", v)} />
        </div>

        <div className="card">
          <h2>Prior Year Taxes</h2>
          <MF label="Last year's (2024 tax return) total state and local tax paid (Schedule A line 5d)" value={form.priorStateLocalTax} onChange={(v: any) => set("priorStateLocalTax", v)} />
          <MF label="Last year's (2024 Tax Return) total itemized or standard deductions (Form 1040 line 12)" value={form.priorItemizedDeduction} onChange={(v: any) => set("priorItemizedDeduction", v)} />
          <MF label="Total amount of prior year state tax withheld (including state estimated payments, Schedule A line 5a)" value={form.priorStateWithheld} onChange={(v: any) => set("priorStateWithheld", v)} />
          <MF label="Prior year sales tax deduction (Schedule A line 5a)" value={form.priorSalesTax} onChange={(v: any) => set("priorSalesTax", v)} />
          <div className="field">
            <label>Last Year's (2024 Tax Return) Filing Status *</label>
            <select value={form.priorFilingStatus} onChange={(e: any) => set("priorFilingStatus", e.target.value)}>
              <option value="">Select one...</option>
              {FILING_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="checkboxes">
            <label className="cb"><input type="checkbox" checked={form.claimedAge65} onChange={(e: any) => set("claimedAge65", e.target.checked)} /> Check here if Taxpayer claimed the Age 65 and older deduction last year.</label>
            <label className="cb"><input type="checkbox" checked={form.claimedBlind} onChange={(e: any) => set("claimedBlind", e.target.checked)} /> Check here if Taxpayer claimed the Blind deduction last year.</label>
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
        .breadcrumb{font-size:12px;color:#94a3b8}
        .title{font-size:22px;font-weight:700;color:#0f172a}
        .card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:22px 24px;display:flex;flex-direction:column;gap:14px}
        .card h2{font-size:15px;font-weight:700;color:#0f172a}
        .note{font-size:12px;color:#64748b}
        .field{display:flex;flex-direction:column;gap:5px}
        .field label{font-size:12px;font-weight:500;color:#374151}
        .field select{padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none}
        .field select:focus{border-color:#3b82f6}
        .money-input{display:flex;align-items:center;border:1px solid #d1d5db;border-radius:6px;overflow:hidden}
        .money-input span{padding:8px 8px;background:#f8fafc;font-size:13px;color:#64748b;border-right:1px solid #d1d5db}
        .money-input input{border:none;padding:8px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;flex:1}
        .checkboxes{display:flex;flex-direction:column;gap:8px}
        .cb{display:flex;align-items:center;gap:8px;font-size:13px;color:#374151;cursor:pointer}
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
