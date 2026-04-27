"use client"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../../../ReturnNav"
import AddressField from "../../../../../../components/AddressField"
import { EINField } from "../../../../../../components/TaxFields"

export default function ScheduleCPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const base = `/dashboard/returns/${id}`
  const [saving, setSaving] = useState(false)
  const STATES = ["","AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"]
  const [form, setForm] = useState({
    whose:"taxpayer", businessName:"", ein:"", address:"", zip:"", city:"", state:"",
    businessCode:"", description:"",
    // Income
    grossReceipts:"", returns:"", otherIncome:"",
    // Expenses
    advertising:"", carTruck:"", commissions:"", contractLabor:"",
    depletion:"", depreciation:"", employeeBenefit:"", insurance:"",
    interestMortgage:"", interestOther:"", legal:"", officeExpense:"",
    pensionPlans:"", repairsMaint:"", supplies:"", taxesLicenses:"",
    travel:"", meals:"", utilities:"", wages:"", otherExpenses:"",
    homeOffice:"", materialParticipation:true, filed1099:false, atRisk:true,
  })
  function set(f: string, v: any) { setForm(p => ({ ...p, [f]: v })) }

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/returns/${id}/income/schedule-c`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(form),
    })
    setSaving(false)
    router.push(`${base}/federal/income`)
  }

  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={2025} />
      <main className="main">
        <div className="breadcrumb">Income › Schedule C</div>
        <h1 className="title">Schedule C</h1>
        <button className="cancel-btn" onClick={() => router.push(`${base}/federal/income`)}>CANCEL</button>

        <div className="radio-row">
          <Radio label="Taxpayer" checked={form.whose==="taxpayer"} onChange={() => set("whose","taxpayer")} />
          <Radio label="Spouse" checked={form.whose==="spouse"} onChange={() => set("whose","spouse")} />
        </div>

        <div className="card">
          <h2>Name and Address</h2>
          <Field label="Business Name (leave blank if no separate business name)" value={form.businessName} onChange={(v: any) => set("businessName",v)} />
          <EINField label="Employer ID (leave blank if using SSN as your EIN)" value={form.ein} onChange={(v: any) => set("ein",v)} />
          <div className="form-row">
            <Field label="ZIP code" value={form.zip} onChange={(v: any) => set("zip",v)} />
            <Field label="City" value={form.city} onChange={(v: any) => set("city",v)} />
            <div className="field">
              <label>State</label>
              <select value={form.state} onChange={(e: any) => set("state",e.target.value)}>
                {STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Business Type</h2>
          <div className="field">
            <label>Business Code <a href="https://www.irs.gov/pub/irs-pdf/i1040sc.pdf" target="_blank" rel="noopener noreferrer" className="link">Click here for a list of Business Codes</a></label>
            <input value={form.businessCode} onChange={(e: any) => set("businessCode",e.target.value)} style={{maxWidth:200}} />
          </div>
          <Field label="Description of Business *" value={form.description} onChange={(v: any) => set("description",v)} />
          <div className="checkboxes">
            <CB label='Check here if you "materially participated" in the operation of this business during this tax year.' checked={form.materialParticipation} onChange={(v: any) => set("materialParticipation",v)} />
            <CB label="Check here if you made any payments in 2025 that would require you to file Form(s) 1099." checked={form.filed1099} onChange={(v: any) => set("filed1099",v)} />
            <CB label="All Investment is At-Risk." checked={form.atRisk} onChange={(v: any) => set("atRisk",v)} />
          </div>
        </div>

        <div className="card">
          <h2>Income</h2>
          <MF label="Gross receipts or sales" value={form.grossReceipts} onChange={(v: any) => set("grossReceipts",v)} />
          <MF label="Returns and allowances" value={form.returns} onChange={(v: any) => set("returns",v)} />
          <MF label="Other income" value={form.otherIncome} onChange={(v: any) => set("otherIncome",v)} />
        </div>

        <div className="card">
          <h2>Expenses</h2>
          <div className="exp-grid">
            <MF label="Advertising" value={form.advertising} onChange={(v: any) => set("advertising",v)} />
            <MF label="Car and truck expenses" value={form.carTruck} onChange={(v: any) => set("carTruck",v)} />
            <MF label="Commissions and fees" value={form.commissions} onChange={(v: any) => set("commissions",v)} />
            <MF label="Contract labor" value={form.contractLabor} onChange={(v: any) => set("contractLabor",v)} />
            <MF label="Depletion" value={form.depletion} onChange={(v: any) => set("depletion",v)} />
            <MF label="Depreciation" value={form.depreciation} onChange={(v: any) => set("depreciation",v)} />
            <MF label="Employee benefit programs" value={form.employeeBenefit} onChange={(v: any) => set("employeeBenefit",v)} />
            <MF label="Insurance (other than health)" value={form.insurance} onChange={(v: any) => set("insurance",v)} />
            <MF label="Interest - mortgage" value={form.interestMortgage} onChange={(v: any) => set("interestMortgage",v)} />
            <MF label="Interest - other" value={form.interestOther} onChange={(v: any) => set("interestOther",v)} />
            <MF label="Legal and professional services" value={form.legal} onChange={(v: any) => set("legal",v)} />
            <MF label="Office expense" value={form.officeExpense} onChange={(v: any) => set("officeExpense",v)} />
            <MF label="Pension and profit-sharing plans" value={form.pensionPlans} onChange={(v: any) => set("pensionPlans",v)} />
            <MF label="Repairs and maintenance" value={form.repairsMaint} onChange={(v: any) => set("repairsMaint",v)} />
            <MF label="Supplies" value={form.supplies} onChange={(v: any) => set("supplies",v)} />
            <MF label="Taxes and licenses" value={form.taxesLicenses} onChange={(v: any) => set("taxesLicenses",v)} />
            <MF label="Travel" value={form.travel} onChange={(v: any) => set("travel",v)} />
            <MF label="Meals (50% deductible)" value={form.meals} onChange={(v: any) => set("meals",v)} />
            <MF label="Utilities" value={form.utilities} onChange={(v: any) => set("utilities",v)} />
            <MF label="Wages" value={form.wages} onChange={(v: any) => set("wages",v)} />
            <MF label="Other expenses" value={form.otherExpenses} onChange={(v: any) => set("otherExpenses",v)} />
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
        .card h2{font-size:15px;font-weight:700;color:#0f172a}
        .form-row{display:flex;gap:12px;align-items:flex-end}
        .field{display:flex;flex-direction:column;gap:5px;flex:1}
        .field label{font-size:12px;font-weight:500;color:#374151}
        .field input,.field select{padding:9px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none}
        .field input:focus,.field select:focus{border-color:#3b82f6}
        .money-input{display:flex;align-items:center;border:1px solid #d1d5db;border-radius:6px;overflow:hidden}
        .money-input span{padding:8px;background:#f8fafc;font-size:13px;color:#64748b;border-right:1px solid #d1d5db}
        .money-input input{border:none;padding:8px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;flex:1}
        .radio-row{display:flex;gap:20px}
        .checkboxes{display:flex;flex-direction:column;gap:10px}
        .exp-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .link{font-size:11px;margin-left:8px;color:#3b82f6;text-decoration:none}
        .footer{display:flex;justify-content:space-between}
        .cancel-btn,.continue-btn{background:#1e3a5f;color:#fff;border:none;padding:9px 20px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
        .cancel-btn:hover,.continue-btn:hover{background:#1e40af}
        .continue-btn:disabled{opacity:0.5}
      `}</style>
    </div>
  )
}
function Field({ label, value, onChange, placeholder }: any) {
  return <div className="field"><label>{label}</label><input value={value} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder} /></div>
}
function MF({ label, value, onChange }: any) {
  return <div className="field"><label>{label}</label><div className="money-input"><span>$</span><input type="number" step="0.01" value={value} onChange={(e: any) => onChange(e.target.value)} /></div></div>
}
function Radio({ label, checked, onChange }: any) {
  return <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:14,color:"#374151"}}><input type="radio" checked={checked} onChange={onChange} />{label}</label>
}
function CB({ label, checked, onChange }: any) {
  return <label style={{display:"flex",alignItems:"flex-start",gap:8,cursor:"pointer",fontSize:13,color:"#374151",lineHeight:1.5}}><input type="checkbox" checked={checked} onChange={(e: any) => onChange(e.target.checked)} style={{marginTop:2,flexShrink:0}} />{label}</label>
}
