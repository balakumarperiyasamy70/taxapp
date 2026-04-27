"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import AddressField from "../../../../../../components/AddressField"
import { EINField } from "../../../../../../components/TaxFields"
import ReturnNav from "../../../ReturnNav"

const STATES = ["","AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"]

export default function Form1099GBox1Page() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const base = `/dashboard/returns/${id}`
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    payerTIN: "", payerName: "", payerAddress: "", payerZip: "",
    payerCity: "", payerState: "", payerPhone: "",
    whose: "taxpayer", country: "United States",
    address: "", zip: "", city: "", state: "",
    unemploymentComp: "", federalWithheld: "", taxableGrants: "",
    stateCode: "", stateIdNo: "", stateTaxWithheld: "",
  })

  function set(f: string, v: string) { setForm(p => ({ ...p, [f]: v })) }

  async function handleSave(andAnother = false) {
    setSaving(true)
    await fetch(`/api/returns/${id}/income/1099g`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, box: 1 }),
    })
    setSaving(false)
    if (!andAnother) router.push(`${base}/federal/income`)
  }

  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={2025} />
      <main className="main">
        <div className="breadcrumb">Income &rsaquo; 1099-G Box 1</div>
        <div className="top-bar">
          <button className="cancel-btn" onClick={() => router.push(`${base}/federal/income`)}>CANCEL</button>
          <div className="right">
            <button className="save-another-btn" onClick={() => handleSave(true)}>SAVE & ENTER ANOTHER</button>
            <button className="continue-btn" onClick={() => handleSave(false)}>CONTINUE</button>
          </div>
        </div>

        <p className="form-note">Please enter the amount reported to you on your 1099-G.</p>

        <div className="two-col">
          {/* Payer */}
          <div className="card">
            <h2 className="card-title">Payer Information</h2>
            <Field label="Payer Federal ID number (or TIN) *" value={form.payerTIN} onChange={(v: any) => set("payerTIN", v)} placeholder="XX-XXXXXXX" />
            <Field label="Payer's name *" value={form.payerName} onChange={(v: any) => set("payerName", v)} />
            <Field label="Address *" value={form.payerAddress} onChange={(v: any) => set("payerAddress", v)} placeholder="Street number and name" />
            <div className="form-row">
              <Field label="ZIP code *" value={form.payerZip} onChange={(v: any) => set("payerZip", v)} />
              <Field label="City *" value={form.payerCity} onChange={(v: any) => set("payerCity", v)} />
              <div className="field">
                <label>State *</label>
                <select value={form.payerState} onChange={(e: any) => set("payerState", e.target.value)}>
                  {STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <Field label="Phone" value={form.payerPhone} onChange={(v: any) => set("payerPhone", v)} />

            <h2 className="card-title" style={{marginTop: 8}}>Payee Information</h2>
            <div className="radio-row">
              <Radio label="Taxpayer" checked={form.whose === "taxpayer"} onChange={() => set("whose", "taxpayer")} />
              <Radio label="Spouse" checked={form.whose === "spouse"} onChange={() => set("whose", "spouse")} />
            </div>
            <div className="field">
              <label>Country *</label>
              <select value={form.country} onChange={(e: any) => set("country", e.target.value)}>
                <option>United States</option>
              </select>
            </div>
            <Field label="Address *" value={form.address} onChange={(v: any) => set("address", v)} placeholder="Street number and name" />
            <div className="form-row">
              <Field label="ZIP code *" value={form.zip} onChange={(v: any) => set("zip", v)} />
              <Field label="City *" value={form.city} onChange={(v: any) => set("city", v)} />
              <div className="field">
                <label>State *</label>
                <select value={form.state} onChange={(e: any) => set("state", e.target.value)}>
                  {STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 1099-G Info */}
          <div>
            <div className="card">
              <h2 className="card-title">1099-G Information</h2>
              <MoneyField label="Unemployment compensation *" value={form.unemploymentComp} onChange={(v: any) => set("unemploymentComp", v)} />
              <MoneyField label="Federal tax withheld" value={form.federalWithheld} onChange={(v: any) => set("federalWithheld", v)} />
              <MoneyField label="Taxable grants *" value={form.taxableGrants} onChange={(v: any) => set("taxableGrants", v)} />
            </div>
            <div className="card" style={{marginTop: 16}}>
              <h2 className="card-title">State Information</h2>
              <div className="field">
                <label>State</label>
                <select value={form.stateCode} onChange={(e: any) => set("stateCode", e.target.value)}>
                  <option value="">- Please Select -</option>
                  {STATES.filter(Boolean).map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <Field label="State ID no." value={form.stateIdNo} onChange={(v: any) => set("stateIdNo", v)} />
              <MoneyField label="State tax withheld" value={form.stateTaxWithheld} onChange={(v: any) => set("stateTaxWithheld", v)} />
            </div>
          </div>
        </div>

        <div className="bottom-bar">
          <button className="cancel-btn" onClick={() => router.push(`${base}/federal/income`)}>CANCEL</button>
          <div className="right">
            <button className="save-another-btn" onClick={() => handleSave(true)}>SAVE & ENTER ANOTHER</button>
            <button className="continue-btn" onClick={() => handleSave(false)}>CONTINUE</button>
          </div>
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .root { display: flex; min-height: 100vh; font-family: 'DM Sans', sans-serif; background: #f8fafc; }
        .main { flex: 1; margin-left: 220px; padding: 24px 36px; display: flex; flex-direction: column; gap: 16px; }
        .breadcrumb { font-size: 12px; color: #94a3b8; }
        .form-note { font-size: 13px; color: #64748b; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
        .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }
        .card-title { font-size: 14px; font-weight: 700; color: #0f172a; }
        .top-bar, .bottom-bar { display: flex; justify-content: space-between; }
        .right { display: flex; gap: 10px; }
        .form-row { display: flex; gap: 10px; align-items: flex-end; }
        .field { flex: 1; display: flex; flex-direction: column; gap: 5px; }
        .field label { font-size: 12px; font-weight: 500; color: #374151; }
        .field input, .field select { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none; }
        .field input:focus, .field select:focus { border-color: #3b82f6; }
        .money-input { display: flex; align-items: center; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; }
        .money-input span { padding: 8px 8px; background: #f8fafc; font-size: 13px; color: #64748b; border-right: 1px solid #d1d5db; }
        .money-input input { border: none; padding: 8px 8px; font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none; flex: 1; }
        .radio-row { display: flex; gap: 20px; }
        .cancel-btn { background: #1e3a5f; color: #fff; border: none; padding: 9px 20px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .save-another-btn { background: #fff; border: 1.5px solid #1e3a5f; color: #1e3a5f; padding: 9px 16px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .continue-btn { background: #1e3a5f; color: #fff; border: none; padding: 9px 20px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .cancel-btn:hover, .continue-btn:hover { background: #1e40af; }
      `}</style>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: any) {
  return <div className="field"><label>{label}</label><input value={value} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder} /></div>
}
function MoneyField({ label, value, onChange }: any) {
  return <div className="field"><label>{label}</label><div className="money-input"><span>$</span><input type="number" step="0.01" value={value} onChange={(e: any) => onChange(e.target.value)} /></div></div>
}
function Radio({ label, checked, onChange }: any) {
  return <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:14,color:"#374151"}}><input type="radio" checked={checked} onChange={onChange} />{label}</label>
}
