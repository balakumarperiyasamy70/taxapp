"use client"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../../../ReturnNav"
import AddressField from "../../../../../../components/AddressField"
import { EINField } from "../../../../../../components/TaxFields"

const STATES = ["","AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"]
const TYPES = ["--Select--","Rental Real Estate","Royalties","Partnership","S Corporation","Estate","Trust","REMIC"]

export default function ScheduleEPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const base = `/dashboard/returns/${id}`
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    whose:"taxpayer", type:"", description:"", country:"United States",
    address:"", zip:"", city:"", state:"", personalUse:false, ownershipPct:"100",
    rentalIncome:"", daysRented:"", daysPersonal:"",
    qualifiedJointVenture:false, activelyParticipated:false,
    realEstateProfessional:false, allAtRisk:true,
    // Expenses
    advertising:"", autoTravel:"", cleaning:"", commissions:"",
    insurance:"", legalPro:"", management:"", mortgage:"",
    repairs:"", supplies:"", taxes:"", utilities:"", depreciation:"", otherExpenses:"",
  })
  function set(f: string, v: any) { setForm(p => ({ ...p, [f]: v })) }

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/returns/${id}/income/schedule-e`, {
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
        <div className="breadcrumb">Income › Schedule E</div>
        <h1 className="title">Schedule E Rent and Royalty Information</h1>
        <button className="cancel-btn" onClick={() => router.push(`${base}/federal/income`)}>CANCEL</button>

        <div className="card">
          <div className="radio-row">
            <Radio label="Taxpayer" checked={form.whose==="taxpayer"} onChange={() => set("whose","taxpayer")} />
            <Radio label="Spouse" checked={form.whose==="spouse"} onChange={() => set("whose","spouse")} />
            <Radio label="Joint" checked={form.whose==="joint"} onChange={() => set("whose","joint")} />
          </div>
          <div className="field">
            <label>Type *</label>
            <select value={form.type} onChange={e => set("type",e.target.value)}>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <Field label="Description *" value={form.description} onChange={v => set("description",v)} />
          <div className="field">
            <label>Country</label>
            <select value={form.country} onChange={e => set("country",e.target.value)}>
              <option>United States</option>
            </select>
          </div>
          <div className="form-row">
            <Field label="ZIP code" value={form.zip} onChange={v => set("zip",v)} />
            <Field label="City" value={form.city} onChange={v => set("city",v)} />
            <div className="field">
              <label>State</label>
              <select value={form.state} onChange={e => set("state",e.target.value)}>
                {STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <CB label="Check if personal use" checked={form.personalUse} onChange={v => set("personalUse",v)} />
          <div className="field">
            <label>Percent of ownership *</label>
            <input value={form.ownershipPct} onChange={e => set("ownershipPct",e.target.value)} style={{maxWidth:100}} />
          </div>
          <MF label="Rental Payments Received (including rental income reported on Form 1099-K)" value={form.rentalIncome} onChange={v => set("rentalIncome",v)} />
          <Field label="Enter the number of days the property was rented at fair rental value" value={form.daysRented} onChange={v => set("daysRented",v)} />
          <Field label="Enter the number of days the property was used for personal purposes" value={form.daysPersonal} onChange={v => set("daysPersonal",v)} />
          <div className="checkboxes">
            <CB label="Check here if you are a member of a Qualified Joint Venture" checked={form.qualifiedJointVenture} onChange={v => set("qualifiedJointVenture",v)} />
            <CB label="Check if you actively participated" checked={form.activelyParticipated} onChange={v => set("activelyParticipated",v)} />
            <CB label="Check here if you are a real estate professional or sold or disposed of the property this year (This will allow ALL losses)." checked={form.realEstateProfessional} onChange={v => set("realEstateProfessional",v)} />
            <CB label="All Investment is At-Risk." checked={form.allAtRisk} onChange={v => set("allAtRisk",v)} />
          </div>
        </div>

        <div className="card">
          <h2>Expenses</h2>
          <div className="exp-grid">
            <MF label="Advertising" value={form.advertising} onChange={v => set("advertising",v)} />
            <MF label="Auto and travel" value={form.autoTravel} onChange={v => set("autoTravel",v)} />
            <MF label="Cleaning and maintenance" value={form.cleaning} onChange={v => set("cleaning",v)} />
            <MF label="Commissions" value={form.commissions} onChange={v => set("commissions",v)} />
            <MF label="Insurance" value={form.insurance} onChange={v => set("insurance",v)} />
            <MF label="Legal and professional fees" value={form.legalPro} onChange={v => set("legalPro",v)} />
            <MF label="Management fees" value={form.management} onChange={v => set("management",v)} />
            <MF label="Mortgage interest paid" value={form.mortgage} onChange={v => set("mortgage",v)} />
            <MF label="Repairs" value={form.repairs} onChange={v => set("repairs",v)} />
            <MF label="Supplies" value={form.supplies} onChange={v => set("supplies",v)} />
            <MF label="Taxes" value={form.taxes} onChange={v => set("taxes",v)} />
            <MF label="Utilities" value={form.utilities} onChange={v => set("utilities",v)} />
            <MF label="Depreciation expense or depletion" value={form.depreciation} onChange={v => set("depreciation",v)} />
            <MF label="Other expenses" value={form.otherExpenses} onChange={v => set("otherExpenses",v)} />
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
        .footer{display:flex;justify-content:space-between}
        .cancel-btn,.continue-btn{background:#1e3a5f;color:#fff;border:none;padding:9px 20px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
        .cancel-btn:hover,.continue-btn:hover{background:#1e40af}
        .continue-btn:disabled{opacity:0.5}
      `}</style>
    </div>
  )
}
function Field({ label, value, onChange, placeholder }: any) {
  return <div className="field"><label>{label}</label><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} /></div>
}
function MF({ label, value, onChange }: any) {
  return <div className="field"><label>{label}</label><div className="money-input"><span>$</span><input type="number" step="0.01" value={value} onChange={e => onChange(e.target.value)} /></div></div>
}
function Radio({ label, checked, onChange }: any) {
  return <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:14,color:"#374151"}}><input type="radio" checked={checked} onChange={onChange} />{label}</label>
}
function CB({ label, checked, onChange }: any) {
  return <label style={{display:"flex",alignItems:"flex-start",gap:8,cursor:"pointer",fontSize:13,color:"#374151",lineHeight:1.5}}><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{marginTop:2,flexShrink:0}} />{label}</label>
}
