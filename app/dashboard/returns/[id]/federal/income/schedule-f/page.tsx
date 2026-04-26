"use client"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../../../ReturnNav"
import { EINField } from "../../../../../../components/TaxFields"

export default function ScheduleFPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const base = `/dashboard/returns/${id}`
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    whose:"taxpayer", ein:"", businessCode:"", principalProduct:"",
    accountingMethod:"cash", priorYearLoss:"",
    materialParticipation:true, filed1099:false, atRisk:true,
    // Income
    salesLivestock:"", salesOtherAnimals:"", cooperativeDistrib:"",
    agriculturalProgram:"", customHire:"", otherIncome:"",
    // Expenses
    carTruck:"", chemicals:"", conservation:"", customHireExp:"",
    depreciation:"", employeeBenefit:"", feedPurchased:"",
    fertilizers:"", freight:"", gasoline:"", insurance:"",
    interestMortgage:"", interestOther:"", labor:"", pension:"",
    rentLease:"", repairs:"", seeds:"", storage:"",
    supplies:"", taxes:"", utilities:"", veterinary:"", otherExpenses:"",
  })
  function set(f: string, v: any) { setForm(p => ({ ...p, [f]: v })) }

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/returns/${id}/income/schedule-f`, {
      method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form),
    })
    setSaving(false)
    router.push(`${base}/federal/income`)
  }

  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={2025} />
      <main className="main">
        <div className="breadcrumb">Income › Schedule F</div>
        <h1 className="title">Schedule F - Basic Information About Your Farm</h1>
        <button className="cancel-btn" onClick={() => router.push(`${base}/federal/income`)}>CANCEL</button>
        <p className="note">Complete the following information regarding your farm.</p>

        <div className="card">
          <div className="radio-row">
            <Radio label="Taxpayer" checked={form.whose==="taxpayer"} onChange={() => set("whose","taxpayer")} />
            <Radio label="Spouse" checked={form.whose==="spouse"} onChange={() => set("whose","spouse")} />
          </div>
          <EINField label="EIN, if any" value={form.ein} onChange={v => set("ein",v)} />
          <div className="field">
            <label>Business Code (if business code not found, enter principal product below)</label>
            <select value={form.businessCode} onChange={e => set("businessCode",e.target.value)}>
              <option value="">-- Please Select --</option>
              <option value="111100">Oilseed and Grain Farming</option>
              <option value="111200">Vegetable and Melon Farming</option>
              <option value="111300">Fruit and Tree Nut Farming</option>
              <option value="111400">Greenhouse, Nursery, and Floriculture</option>
              <option value="111900">Other Crop Farming</option>
              <option value="112100">Cattle Ranching and Farming</option>
              <option value="112200">Hog and Pig Farming</option>
              <option value="112300">Poultry and Egg Production</option>
              <option value="112400">Sheep and Goat Farming</option>
              <option value="112900">Other Animal Production</option>
            </select>
          </div>
          <Field label="Principal Product *" value={form.principalProduct} onChange={v => set("principalProduct",v)} />
          <div className="field">
            <label>Accounting Method *</label>
            <div className="radio-row">
              <Radio label="Cash" checked={form.accountingMethod==="cash"} onChange={() => set("accountingMethod","cash")} />
              <Radio label="Accrual" checked={form.accountingMethod==="accrual"} onChange={() => set("accountingMethod","accrual")} />
            </div>
          </div>
          <MF label="Prior Year Unallowed Loss" value={form.priorYearLoss} onChange={v => set("priorYearLoss",v)} />
          <div className="checkboxes">
            <CB label='Check here if you "materially participated" in the operation of this business during this tax year.' checked={form.materialParticipation} onChange={v => set("materialParticipation",v)} />
            <CB label="Check here if you made any payments in 2025 that would require you to file Form(s) 1099." checked={form.filed1099} onChange={v => set("filed1099",v)} />
            <CB label="All Investment is At-Risk." checked={form.atRisk} onChange={v => set("atRisk",v)} />
          </div>
        </div>

        <div className="card">
          <h2>Farm Income</h2>
          <MF label="Sales of livestock and other items" value={form.salesLivestock} onChange={v => set("salesLivestock",v)} />
          <MF label="Sales of purchased livestock and other items" value={form.salesOtherAnimals} onChange={v => set("salesOtherAnimals",v)} />
          <MF label="Cooperative distributions" value={form.cooperativeDistrib} onChange={v => set("cooperativeDistrib",v)} />
          <MF label="Agricultural program payments" value={form.agriculturalProgram} onChange={v => set("agriculturalProgram",v)} />
          <MF label="Custom hire income" value={form.customHire} onChange={v => set("customHire",v)} />
          <MF label="Other income" value={form.otherIncome} onChange={v => set("otherIncome",v)} />
        </div>

        <div className="card">
          <h2>Farm Expenses</h2>
          <div className="exp-grid">
            <MF label="Car and truck expenses" value={form.carTruck} onChange={v => set("carTruck",v)} />
            <MF label="Chemicals" value={form.chemicals} onChange={v => set("chemicals",v)} />
            <MF label="Conservation expenses" value={form.conservation} onChange={v => set("conservation",v)} />
            <MF label="Custom hire" value={form.customHireExp} onChange={v => set("customHireExp",v)} />
            <MF label="Depreciation" value={form.depreciation} onChange={v => set("depreciation",v)} />
            <MF label="Employee benefit programs" value={form.employeeBenefit} onChange={v => set("employeeBenefit",v)} />
            <MF label="Feed purchased" value={form.feedPurchased} onChange={v => set("feedPurchased",v)} />
            <MF label="Fertilizers and lime" value={form.fertilizers} onChange={v => set("fertilizers",v)} />
            <MF label="Freight and trucking" value={form.freight} onChange={v => set("freight",v)} />
            <MF label="Gasoline, fuel, and oil" value={form.gasoline} onChange={v => set("gasoline",v)} />
            <MF label="Insurance" value={form.insurance} onChange={v => set("insurance",v)} />
            <MF label="Interest - mortgage" value={form.interestMortgage} onChange={v => set("interestMortgage",v)} />
            <MF label="Interest - other" value={form.interestOther} onChange={v => set("interestOther",v)} />
            <MF label="Labor hired" value={form.labor} onChange={v => set("labor",v)} />
            <MF label="Pension and profit-sharing plans" value={form.pension} onChange={v => set("pension",v)} />
            <MF label="Rent or lease" value={form.rentLease} onChange={v => set("rentLease",v)} />
            <MF label="Repairs and maintenance" value={form.repairs} onChange={v => set("repairs",v)} />
            <MF label="Seeds and plants" value={form.seeds} onChange={v => set("seeds",v)} />
            <MF label="Storage and warehousing" value={form.storage} onChange={v => set("storage",v)} />
            <MF label="Supplies" value={form.supplies} onChange={v => set("supplies",v)} />
            <MF label="Taxes" value={form.taxes} onChange={v => set("taxes",v)} />
            <MF label="Utilities" value={form.utilities} onChange={v => set("utilities",v)} />
            <MF label="Veterinary, breeding, medicine" value={form.veterinary} onChange={v => set("veterinary",v)} />
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
        .note{font-size:13px;color:#64748b}
        .card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:22px 24px;display:flex;flex-direction:column;gap:14px}
        .card h2{font-size:15px;font-weight:700;color:#0f172a}
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
