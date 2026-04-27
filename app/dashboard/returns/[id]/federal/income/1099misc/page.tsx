"use client"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../../../ReturnNav"
import { EINField } from "../../../../../../components/TaxFields"

export default function Form1099miscPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const base = `/dashboard/returns/${id}`
  const [saving, setSaving] = useState(false)
  const [whose, setWhose] = useState("taxpayer")
  const [fields, setFields] = useState<Record<string,string>>({})
  function set(f: string, v: string) { setFields(p => ({ ...p, [f]: v })) }

  async function handleSave(andAnother=false) {
    setSaving(true)
    await fetch(`/api/returns/${id}/income/1099misc`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ whose, ...fields }),
    })
    setSaving(false)
    if (!andAnother) router.push(`${base}/federal/income`)
    else setFields({})
  }

  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={2025} />
      <main className="main">
        <div className="breadcrumb">Income › Form 1099-MISC</div>
        <h1 className="title">Form 1099-MISC</h1>
        <div className="top-bar">
          <button className="cancel-btn" onClick={() => router.push(`${base}/federal/income`)}>CANCEL</button>
          <div className="right">
            <button className="save-btn" onClick={() => handleSave(true)} disabled={saving}>SAVE & ENTER ANOTHER</button>
            <button className="continue-btn" onClick={() => handleSave(false)} disabled={saving}>CONTINUE</button>
          </div>
        </div>
        <div className="card">
          <div className="radio-row">
            <Radio label="Taxpayer" checked={whose==="taxpayer"} onChange={() => setWhose("taxpayer")} />
            <Radio label="Spouse" checked={whose==="spouse"} onChange={() => setWhose("spouse")} />
          </div>
          <Field label="Payer Name *" value={fields.payerName??""} onChange={(v: any) => set("payerName",v)} />
          <EINField label="Payer EIN / TIN" value={fields.payerEIN??""} onChange={(v: any) => set("payerEIN",v)} />
          <MF label="Gross amount *" value={fields.amount??""} onChange={(v: any) => set("amount",v)} />
          <MF label="Federal income tax withheld" value={fields.federalWithheld??""} onChange={(v: any) => set("federalWithheld",v)} />
          <MF label="State tax withheld" value={fields.stateWithheld??""} onChange={(v: any) => set("stateWithheld",v)} />
        </div>
        <div className="top-bar">
          <button className="cancel-btn" onClick={() => router.push(`${base}/federal/income`)}>CANCEL</button>
          <div className="right">
            <button className="save-btn" onClick={() => handleSave(true)} disabled={saving}>SAVE & ENTER ANOTHER</button>
            <button className="continue-btn" onClick={() => handleSave(false)} disabled={saving}>CONTINUE</button>
          </div>
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
        .top-bar{display:flex;justify-content:space-between;align-items:center}
        .right{display:flex;gap:10px}
        .radio-row{display:flex;gap:20px}
        .field{display:flex;flex-direction:column;gap:5px}
        .field label{font-size:12px;font-weight:500;color:#374151}
        .field input{padding:9px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none}
        .field input:focus{border-color:#3b82f6}
        .money-input{display:flex;align-items:center;border:1px solid #d1d5db;border-radius:6px;overflow:hidden}
        .money-input span{padding:8px;background:#f8fafc;font-size:13px;color:#64748b;border-right:1px solid #d1d5db}
        .money-input input{border:none;padding:8px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;flex:1}
        .cancel-btn,.continue-btn{background:#1e3a5f;color:#fff;border:none;padding:9px 20px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
        .save-btn{background:#fff;border:1.5px solid #1e3a5f;color:#1e3a5f;padding:9px 14px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
        .cancel-btn:hover,.continue-btn:hover{background:#1e40af}
      `}</style>
    </div>
  )
}
function Field({ label, value, onChange }: any) {
  return <div className="field"><label>{label}</label><input value={value} onChange={(e: any) => onChange(e.target.value)} /></div>
}
function MF({ label, value, onChange }: any) {
  return <div className="field"><label>{label}</label><div className="money-input"><span>$</span><input type="number" step="0.01" value={value} onChange={(e: any) => onChange(e.target.value)} /></div></div>
}
function Radio({ label, checked, onChange }: any) {
  return <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:14,color:"#374151"}}><input type="radio" checked={checked} onChange={onChange} />{label}</label>
}
