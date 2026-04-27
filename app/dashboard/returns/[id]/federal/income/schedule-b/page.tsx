"use client"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../../../ReturnNav"
import { EINField } from "../../../../../../components/TaxFields"

const INCOME_TYPES = ["Interest Income (Form 1099-INT)","Original Issue Discount (Form 1099-OID)","Dividend Income (Form 1099-DIV)","Seller Financed Interest Income"]

export default function ScheduleBPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const base = `/dashboard/returns/${id}`
  const [type, setType] = useState("")
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    whose:"taxpayer", payerName:"", payerEIN:"", amount:"", taxExempt:"",
    federalWithheld:"", stateWithheld:"", foreignAccount:false, foreignCountry:"",
    // DIV specific
    ordinaryDividends:"", qualifiedDividends:"", totalCapGain:"",
    unrecap1250Gain:"", section1202Gain:"", collectiblesGain:"",
    foreignTax:"", cashLiquidation:"", nonCashLiquidation:"", exemptInterestDiv:"",
  })
  function set(f: string, v: any) { setForm(p => ({ ...p, [f]: v })) }

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/returns/${id}/income/schedule-b`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ type, ...form }),
    })
    setSaving(false)
    router.push(`${base}/federal/income`)
  }

  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={2025} />
      <main className="main">
        <div className="breadcrumb">Income › Schedule B</div>
        <h1 className="title">Interest and Dividend Income</h1>
        <button className="cancel-btn" onClick={() => router.push(`${base}/federal/income`)}>CANCEL</button>

        {step === 1 && (
          <div className="card">
            <h2>Reporting Your Interest Income</h2>
            <p className="note">Choose the type of interest or dividend item you would like to add to your return:</p>
            <div className="options">
              {INCOME_TYPES.map(t => (
                <label key={t} className={`option ${type === t ? "selected" : ""}`}>
                  <input type="radio" checked={type === t} onChange={() => setType(t)} />
                  <span>{t}{t === "Interest Income (Form 1099-INT)" && <span className="sub"> — This should include all interest income, including income less than $1,500</span>}</span>
                </label>
              ))}
            </div>
            <div className="row-btns">
              <button className="cancel-btn" onClick={() => router.push(`${base}/federal/income`)}>CANCEL</button>
              <button className="continue-btn" onClick={() => setStep(2)} disabled={!type}>CONTINUE</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="card">
            <h2>{type}</h2>
            <div className="radio-row">
              <Radio label="Taxpayer" checked={form.whose==="taxpayer"} onChange={() => set("whose","taxpayer")} />
              <Radio label="Spouse" checked={form.whose==="spouse"} onChange={() => set("whose","spouse")} />
            </div>
            <Field label="Payer's Name *" value={form.payerName} onChange={(v: any) => set("payerName",v)} />
            <EINField label="Payer EIN" value={form.payerEIN} onChange={(v: any) => set("payerEIN",v)} />
            {(type.includes("INT") || type.includes("OID")) && <>
              <MF label="Amount *" value={form.amount} onChange={(v: any) => set("amount",v)} />
              <MF label="Tax-exempt interest" value={form.taxExempt} onChange={(v: any) => set("taxExempt",v)} />
              <MF label="Federal income tax withheld" value={form.federalWithheld} onChange={(v: any) => set("federalWithheld",v)} />
              <MF label="State tax withheld" value={form.stateWithheld} onChange={(v: any) => set("stateWithheld",v)} />
            </>}
            {type.includes("DIV") && <>
              <MF label="Ordinary dividends *" value={form.ordinaryDividends} onChange={(v: any) => set("ordinaryDividends",v)} />
              <MF label="Qualified dividends" value={form.qualifiedDividends} onChange={(v: any) => set("qualifiedDividends",v)} />
              <MF label="Total capital gain distributions" value={form.totalCapGain} onChange={(v: any) => set("totalCapGain",v)} />
              <MF label="Unrecaptured Section 1250 gain" value={form.unrecap1250Gain} onChange={(v: any) => set("unrecap1250Gain",v)} />
              <MF label="Section 1202 gain" value={form.section1202Gain} onChange={(v: any) => set("section1202Gain",v)} />
              <MF label="Collectibles (28%) gain" value={form.collectiblesGain} onChange={(v: any) => set("collectiblesGain",v)} />
              <MF label="Federal income tax withheld" value={form.federalWithheld} onChange={(v: any) => set("federalWithheld",v)} />
              <MF label="Foreign tax paid" value={form.foreignTax} onChange={(v: any) => set("foreignTax",v)} />
              <MF label="Cash liquidation distributions" value={form.cashLiquidation} onChange={(v: any) => set("cashLiquidation",v)} />
              <MF label="Exempt-interest dividends" value={form.exemptInterestDiv} onChange={(v: any) => set("exemptInterestDiv",v)} />
            </>}
            <div className="row-btns">
              <button className="cancel-btn" onClick={() => setStep(1)}>BACK</button>
              <button className="continue-btn" onClick={handleSave} disabled={saving}>{saving?"Saving...":"SAVE & CONTINUE"}</button>
            </div>
          </div>
        )}
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
        .note{font-size:13px;color:#64748b}
        .options{display:flex;flex-direction:column;gap:10px}
        .option{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border:1.5px solid #e2e8f0;border-radius:8px;cursor:pointer;font-size:14px;color:#374151;transition:all 0.15s}
        .option:hover{border-color:#93c5fd;background:#f0f9ff}
        .option.selected{border-color:#3b82f6;background:#eff6ff;color:#1e40af}
        .option input{margin-top:2px;flex-shrink:0}
        .sub{font-size:12px;color:#64748b;font-weight:400}
        .radio-row{display:flex;gap:20px}
        .field{display:flex;flex-direction:column;gap:5px}
        .field label{font-size:12px;font-weight:500;color:#374151}
        .field input{padding:9px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none}
        .field input:focus{border-color:#3b82f6}
        .money-input{display:flex;align-items:center;border:1px solid #d1d5db;border-radius:6px;overflow:hidden}
        .money-input span{padding:8px;background:#f8fafc;font-size:13px;color:#64748b;border-right:1px solid #d1d5db}
        .money-input input{border:none;padding:8px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;flex:1}
        .row-btns{display:flex;justify-content:space-between;padding-top:8px}
        .cancel-btn,.continue-btn{background:#1e3a5f;color:#fff;border:none;padding:9px 20px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
        .cancel-btn:hover,.continue-btn:hover{background:#1e40af}
        .continue-btn:disabled{opacity:0.5;cursor:not-allowed}
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
