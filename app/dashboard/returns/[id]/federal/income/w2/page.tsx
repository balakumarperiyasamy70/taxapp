"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import AddressField from "../../../../../../components/AddressField"
import { EINField } from "../../../../../../components/TaxFields"
import ReturnNav from "../../../ReturnNav"

const STATES = ["", "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"]

const BOX12_CODES = ["A","B","C","D","E","F","G","H","J","K","L","M","N","P","Q","R","S","T","V","W","X","Y","Z","AA","BB","DD","EE","FF","GG","HH"]

export default function W2Page() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const base = `/dashboard/returns/${id}`

  const [saving, setSaving] = useState(false)
  const [whose, setWhose] = useState("taxpayer")
  const [w2Type, setW2Type] = useState("standard")

  const [employer, setEmployer] = useState({
    ein: "", name: "", country: "United States",
    address: "", zip: "", city: "", state: "",
  })

  const [employee, setEmployee] = useState({
    controlNumber: "", fullName: "", country: "United States",
    address: "", zip: "", city: "", state: "",
  })

  const [boxes, setBoxes] = useState({
    box1: "", box2: "", box3: "", box4: "",
    box5: "", box6: "", box7: "", box8: "",
    box9: "", box10: "", box11: "",
    federalWithheld: "", ssWithheld: "", medicareWithheld: "",
    allocatedTips: "", dependentCare: "", uncollectedTips: "",
  })

  const [box12, setBox12] = useState([
    { code: "", amount: "" },
    { code: "", amount: "" },
    { code: "", amount: "" },
    { code: "", amount: "" },
  ])

  const [box13, setBox13] = useState({
    statutoryEmployee: false, retirementPlan: false, thirdPartySick: false,
  })

  const [box14, setBox14] = useState([
    { code: "", show: "", amount: "", medicaidWaiver: "" },
  ])

  const [stateLocal, setStateLocal] = useState([{
    state: "", stateWages: "", stateIncomeTax: "",
    localWages: "", localIncomeTax: "", localityName: "",
    employerStateId: "",
  }])

  function setBox(field: string, val: string) {
    setBoxes(b => ({ ...b, [field]: val }))
  }

  function setEmp(field: string, val: string) {
    setEmployer(e => ({ ...e, [field]: val }))
  }

  function setEmpe(field: string, val: string) {
    setEmployee(e => ({ ...e, [field]: val }))
  }

  function updateBox12(i: number, field: string, val: string) {
    setBox12(b => b.map((item, idx) => idx === i ? { ...item, [field]: val } : item))
  }

  function updateBox14(i: number, field: string, val: string) {
    setBox14(b => b.map((item, idx) => idx === i ? { ...item, [field]: val } : item))
  }

  function updateStateLocal(i: number, field: string, val: string) {
    setStateLocal(s => s.map((item, idx) => idx === i ? { ...item, [field]: val } : item))
  }

  async function handleSave(andAnother = false) {
    setSaving(true)
    const payload = { whose, w2Type, employer, employee, boxes, box12, box13, box14, stateLocal }
    await fetch(`/api/returns/${id}/income/w2`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (andAnother) {
      // Reset form
      setBoxes({ box1:"",box2:"",box3:"",box4:"",box5:"",box6:"",box7:"",box8:"",box9:"",box10:"",box11:"",federalWithheld:"",ssWithheld:"",medicareWithheld:"",allocatedTips:"",dependentCare:"",uncollectedTips:"" })
    } else {
      router.push(`${base}/federal/income`)
    }
  }

  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={2025} />
      <main className="main">
        <div className="breadcrumb">Income &rsaquo; W-2</div>
        <h1 className="page-title">Wage and tax statement</h1>

        <div className="top-bar">
          <button className="cancel-btn" onClick={() => router.push(`${base}/federal/income`)}>CANCEL</button>
          <div className="right">
            <button className="save-another-btn" onClick={() => handleSave(true)} disabled={saving}>SAVE & ENTER ANOTHER</button>
            <button className="continue-btn" onClick={() => handleSave(false)} disabled={saving}>CONTINUE</button>
          </div>
        </div>

        {/* Whose W-2 */}
        <div className="card">
          <div className="whose-row">
            <Radio label="Taxpayer" checked={whose === "taxpayer"} onChange={() => setWhose("taxpayer")} />
            <Radio label="Spouse" checked={whose === "spouse"} onChange={() => setWhose("spouse")} />
          </div>
          <div className="type-row">
            <Checkbox label="This is a standard W2" checked={w2Type === "standard"} onChange={() => setW2Type("standard")} />
            <Checkbox label="This is a corrected W2" checked={w2Type === "corrected"} onChange={() => setW2Type("corrected")} />
            <Checkbox label="This is a substitute W2" checked={w2Type === "substitute"} onChange={() => setW2Type("substitute")} />
            <Checkbox label="This is a railroad W2" checked={w2Type === "railroad"} onChange={() => setW2Type("railroad")} />
          </div>
        </div>

        {/* Employer + Employee Info */}
        <div className="two-col">
          <div className="card">
            <h2 className="card-title">Employer information</h2>
            <EINField label="Employer identification number (EIN) *" required value={employer.ein} onChange={v => setEmp("ein", v)} />
            <Field label="Employer's name *" value={employer.name} onChange={v => setEmp("name", v)} />
            <div className="form-row">
              <div className="field">
                <label>Country</label>
                <select value={employer.country} onChange={e => setEmp("country", e.target.value)}>
                  <option>United States</option>
                </select>
              </div>
            </div>
            <Field label="Address *" value={employer.address} onChange={v => setEmp("address", v)} />
            <div className="form-row">
              <Field label="ZIP Code *" value={employer.zip} onChange={v => setEmp("zip", v)} />
              <Field label="City *" value={employer.city} onChange={v => setEmp("city", v)} />
              <div className="field">
                <label>State *</label>
                <select value={employer.state} onChange={e => setEmp("state", e.target.value)}>
                  {STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="card-title">Employee information</h2>
            <Field label="Control number" value={employee.controlNumber} onChange={v => setEmpe("controlNumber", v)} />
            <Field label="Employee's full name *" value={employee.fullName} onChange={v => setEmpe("fullName", v)} />
            <div className="form-row">
              <div className="field">
                <label>Country *</label>
                <select value={employee.country} onChange={e => setEmpe("country", e.target.value)}>
                  <option>United States</option>
                </select>
              </div>
            </div>
            <Field label="Address *" value={employee.address} onChange={v => setEmpe("address", v)} />
            <div className="form-row">
              <Field label="ZIP Code *" value={employee.zip} onChange={v => setEmpe("zip", v)} />
              <Field label="City *" value={employee.city} onChange={v => setEmpe("city", v)} />
              <div className="field">
                <label>State *</label>
                <select value={employee.state} onChange={e => setEmpe("state", e.target.value)}>
                  {STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* W-2 Boxes */}
        <div className="two-col">
          <div className="card">
            <h2 className="card-title">W-2 Box Amounts (Left)</h2>
            <MoneyField label="1 - Wages, tips, other compensation" value={boxes.box1} onChange={v => setBox("box1", v)} />
            <MoneyField label="3 - Social security wages" value={boxes.box3} onChange={v => setBox("box3", v)} />
            <MoneyField label="5 - Medicare wages and tips" value={boxes.box5} onChange={v => setBox("box5", v)} />
            <MoneyField label="7 - Social security tips" value={boxes.box7} onChange={v => setBox("box7", v)} />
            <Field label="9 - W-2 verification code" value={boxes.box9} onChange={v => setBox("box9", v)} />
            <MoneyField label="11 - Nonqualified plans" value={boxes.box11} onChange={v => setBox("box11", v)} />
          </div>
          <div className="card">
            <h2 className="card-title">W-2 Box Amounts (Right)</h2>
            <MoneyField label="2 - Federal income tax withheld" value={boxes.federalWithheld} onChange={v => setBox("federalWithheld", v)} />
            <MoneyField label="4 - Social security withheld" value={boxes.ssWithheld} onChange={v => setBox("ssWithheld", v)} />
            <MoneyField label="6 - Medicare withheld" value={boxes.medicareWithheld} onChange={v => setBox("medicareWithheld", v)} />
            <MoneyField label="8 - Allocated tips" value={boxes.allocatedTips} onChange={v => setBox("allocatedTips", v)} />
            <MoneyField label="10 - Dependent care benefits" value={boxes.dependentCare} onChange={v => setBox("dependentCare", v)} />
            <MoneyField label="Uncollected tips" value={boxes.uncollectedTips} onChange={v => setBox("uncollectedTips", v)} />
          </div>
        </div>

        {/* Boxes 12 & 13 */}
        <div className="card">
          <h2 className="card-title">Boxes 12 & 13</h2>
          <p className="card-note">This section reports codes for informational contributions, deferrals, and costs. Enter any box 12 codes and amounts. If the code label does not appear, refer to your W-2 instructions.</p>
          <div className="box12-grid">
            {box12.map((item, i) => (
              <div key={i} className="box12-row">
                <div className="field" style={{maxWidth: 80}}>
                  <label>12{String.fromCharCode(65 + i)} - Code</label>
                  <select value={item.code} onChange={e => updateBox12(i, "code", e.target.value)}>
                    <option value="">--</option>
                    {BOX12_CODES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Amount</label>
                  <div className="money-input"><span>$</span><input type="number" value={item.amount} onChange={e => updateBox12(i, "amount", e.target.value)} /></div>
                </div>
              </div>
            ))}
          </div>
          <div className="box13-row">
            <label>13:</label>
            <Checkbox label="Statutory employee" checked={box13.statutoryEmployee} onChange={v => setBox13(b => ({...b, statutoryEmployee: v}))} />
            <Checkbox label="Retirement plan" checked={box13.retirementPlan} onChange={v => setBox13(b => ({...b, retirementPlan: v}))} />
            <Checkbox label="Third-party sick pay" checked={box13.thirdPartySick} onChange={v => setBox13(b => ({...b, thirdPartySick: v}))} />
          </div>
        </div>

        {/* Box 14 */}
        <div className="card">
          <h2 className="card-title">Box 14</h2>
          <p className="card-note">Enter any box 14 codes and amounts. If you need to add more, click Add Below. If an item is taxed, select Filter When to enter the amount.</p>
          {box14.map((item, i) => (
            <div key={i} className="box14-row">
              <div className="field">
                <label>14 - Show</label>
                <select value={item.show} onChange={e => updateBox14(i, "show", e.target.value)}>
                  <option value="">Select...</option>
                  <option>Shown on W-2</option>
                  <option>Entered manually</option>
                </select>
              </div>
              <Field label="Code" value={item.code} onChange={v => updateBox14(i, "code", v)} />
              <div className="field">
                <label>Amount</label>
                <div className="money-input"><span>$</span><input type="number" value={item.amount} onChange={e => updateBox14(i, "amount", e.target.value)} /></div>
              </div>
            </div>
          ))}
          <div className="field" style={{maxWidth: 200}}>
            <label>Medicaid Waiver Payment</label>
            <div className="money-input"><span>$</span><input type="number" value={box14[0]?.medicaidWaiver} onChange={e => updateBox14(0, "medicaidWaiver", e.target.value)} /></div>
          </div>
        </div>

        {/* State & Local */}
        <div className="card">
          <div className="card-header-row">
            <h2 className="card-title">State and local information</h2>
            <button className="clear-btn">Clear</button>
          </div>
          {stateLocal.map((item, i) => (
            <div key={i} className="state-block">
              <div className="form-row">
                <div className="field" style={{maxWidth: 100}}>
                  <label>15 - State</label>
                  <select value={item.state} onChange={e => updateStateLocal(i, "state", e.target.value)}>
                    {STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Employer's state ID number</label>
                  <input value={item.employerStateId} onChange={e => updateStateLocal(i, "employerStateId", e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label>16 - State wages, tips, etc.</label>
                  <div className="money-input"><span>$</span><input type="number" value={item.stateWages} onChange={e => updateStateLocal(i, "stateWages", e.target.value)} /></div>
                </div>
                <div className="field">
                  <label>17 - State income tax</label>
                  <div className="money-input"><span>$</span><input type="number" value={item.stateIncomeTax} onChange={e => updateStateLocal(i, "stateIncomeTax", e.target.value)} /></div>
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label>18 - Local wages, tips, etc.</label>
                  <div className="money-input"><span>$</span><input type="number" value={item.localWages} onChange={e => updateStateLocal(i, "localWages", e.target.value)} /></div>
                </div>
                <div className="field">
                  <label>19 - Local income tax</label>
                  <div className="money-input"><span>$</span><input type="number" value={item.localIncomeTax} onChange={e => updateStateLocal(i, "localIncomeTax", e.target.value)} /></div>
                </div>
                <div className="field">
                  <label>20 - Locality name</label>
                  <input value={item.localityName} onChange={e => updateStateLocal(i, "localityName", e.target.value)} />
                </div>
              </div>
            </div>
          ))}
          <button className="add-state-btn" onClick={() => setStateLocal(s => [...s, { state:"",stateWages:"",stateIncomeTax:"",localWages:"",localIncomeTax:"",localityName:"",employerStateId:"" }])}>
            + Add another state
          </button>
        </div>

        <div className="bottom-bar">
          <button className="cancel-btn" onClick={() => router.push(`${base}/federal/income`)}>CANCEL</button>
          <div className="right">
            <button className="save-another-btn" onClick={() => handleSave(true)} disabled={saving}>SAVE & ENTER ANOTHER</button>
            <button className="continue-btn" onClick={() => handleSave(false)} disabled={saving}>CONTINUE</button>
          </div>
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .root { display: flex; min-height: 100vh; font-family: 'DM Sans', sans-serif; background: #f8fafc; }
        .main { flex: 1; margin-left: 220px; padding: 24px 36px; display: flex; flex-direction: column; gap: 18px; }
        .breadcrumb { font-size: 12px; color: #94a3b8; }
        .page-title { font-size: 22px; font-weight: 700; color: #0f172a; }
        .top-bar, .bottom-bar { display: flex; justify-content: space-between; align-items: center; }
        .right { display: flex; gap: 10px; }
        .cancel-btn { background: #1e3a5f; color: #fff; border: none; padding: 9px 20px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .save-another-btn { background: #fff; border: 1.5px solid #1e3a5f; color: #1e3a5f; padding: 9px 16px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .continue-btn { background: #1e3a5f; color: #fff; border: none; padding: 9px 20px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .cancel-btn:hover, .continue-btn:hover { background: #1e40af; }
        .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }
        .card-title { font-size: 15px; font-weight: 700; color: #0f172a; }
        .card-note { font-size: 12px; color: #64748b; line-height: 1.5; }
        .card-header-row { display: flex; justify-content: space-between; align-items: center; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
        .whose-row { display: flex; gap: 24px; }
        .type-row { display: flex; gap: 24px; flex-wrap: wrap; }
        .form-row { display: flex; gap: 12px; align-items: flex-end; }
        .field { flex: 1; display: flex; flex-direction: column; gap: 5px; }
        .field label { font-size: 12px; font-weight: 500; color: #374151; }
        .field input, .field select { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none; }
        .field input:focus, .field select:focus { border-color: #3b82f6; }
        .money-input { display: flex; align-items: center; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; }
        .money-input span { padding: 8px 8px; background: #f8fafc; font-size: 13px; color: #64748b; border-right: 1px solid #d1d5db; }
        .money-input input { border: none; padding: 8px 8px; font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none; flex: 1; }
        .box12-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .box12-row { display: flex; gap: 10px; align-items: flex-end; }
        .box13-row { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; font-size: 13px; color: #374151; }
        .box14-row { display: flex; gap: 12px; align-items: flex-end; }
        .state-block { border: 1px solid #f1f5f9; border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
        .add-state-btn { align-self: flex-start; background: none; border: 1.5px dashed #cbd5e1; padding: 8px 16px; border-radius: 6px; font-size: 12px; color: #64748b; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .add-state-btn:hover { border-color: #3b82f6; color: #3b82f6; }
        .clear-btn { background: none; border: none; color: #3b82f6; font-size: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif; }
      `}</style>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

function MoneyField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="money-input">
        <span>$</span>
        <input type="number" step="0.01" min="0" value={value} onChange={e => onChange(e.target.value)} />
      </div>
    </div>
  )
}

function Radio({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14, color: "#374151" }}>
      <input type="radio" checked={checked} onChange={onChange} />
      {label}
    </label>
  )
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: "#374151" }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  )
}
