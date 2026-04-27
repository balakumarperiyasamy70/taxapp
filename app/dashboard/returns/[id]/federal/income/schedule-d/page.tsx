"use client"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../../../ReturnNav"

const ADJ_CODES = ["B - Form 1099-B with Basis shown in Box 1e is incorrect","C - Disposed of Collectibles","D - Form 1099-B showing accrued market discount in Box 1f","E - Form 1099-B or 1099-S with Selling Expenses or Options not Reflected on Form","H - Include Some/All of the Gain from the Sale of Your Main Home","L - Nondeductible Loss other than a Wash Sale","M - Reporting Multiple Transactions on a Single Row","N - Received 1099-B/1099-S as a Nominee for the Actual Owner of the Property","O - Other Adjustment Not Explained Above","Q - Exclude Part of the Gain from the Sale of Qualified Small Business Stock","R - Rollover of Gain from QSB Stock, Empowerment Zone, Publicly Traded Securities","S - Loss from the Sale of Small Business Stock more than Allowable Ordinary Loss","T - Form 1099-B & Type of Gain/Loss shown in Box 2 is incorrect","W - Nondeductible Loss from a Wash Sale","X - Exclude Gain from DC Zone Assets or Qualified Community Assets","Y - Reporting Gain from QOF Investment in Prior Tax Year","Z - Postpone Gain for Investments in QOFs"]

export default function ScheduleDPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const base = `/dashboard/returns/${id}`
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [transaction, setTransaction] = useState({
    whose:"taxpayer", description:"", dateAcquired:"", dateAcquiredAlt:false,
    dateSold:"", dateSoldAlt:false, shortSale:false,
    salesPrice:"", salesPriceAlt:false, costBasisType:"",
    shortTermPartnership:false, cost:"", costAlt:false,
    adjustment:"", adjustmentCodes:[] as string[], isCollectible:false,
  })
  const [noAdj, setNoAdj] = useState({ tpShort:"", tpLong:"", spShort:"", spLong:"", jointShort:"", jointLong:"" })
  const [lossCarryover, setLossCarryover] = useState({ section1250:"", gain28:"", tpShortTerm:"", spShortTerm:"", jointShortTerm:"", tpLongTerm:"", spLongTerm:"", jointLongTerm:"" })

  function setTx(f: string, v: any) { setTransaction(p => ({ ...p, [f]: v })) }

  const SECTIONS = [
    { key:"stocks", label:"Stocks, Mutual Funds, Cryptocurrency, Collectibles, etc.", desc:"Form 1099-B, 1099-DA or broker statements" },
    { key:"other", label:"Other Capital Gains Distributions", desc:"Capital gains that are not reported on the other forms" },
    { key:"carryover", label:"Capital Loss Carryover", desc:"Unused prior year capital loss" },
    { key:"home", label:"Sale of Main Home Worksheet", desc:"1099-S/closing documents" },
    { key:"noadj", label:"1099-B Transactions with No Adjustments", desc:"Short term and Long Term totals with reported basis and no adjustments" },
    { key:"pdf", label:"PDF Attachments", desc:"" },
    { key:"8997", label:"Form 8997 - Initial and Annual Statement of Qualified Opportunity Fund (QOF) Investments", desc:"" },
  ]

  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={2025} />
      <main className="main">
        <div className="breadcrumb">Income › Schedule D</div>
        <h1 className="title">Schedule D Capital Gains</h1>

        <div className="hub-list">
          {SECTIONS.map(s => (
            <div key={s.key}>
              <div className="hub-row" onClick={() => setActiveSection(activeSection===s.key?null:s.key)}>
                <div>
                  <div className="hub-label">{s.label}</div>
                  {s.desc && <div className="hub-desc">{s.desc}</div>}
                </div>
                <button className="begin-btn">BEGIN</button>
              </div>

              {activeSection === "stocks" && s.key === "stocks" && (
                <div className="form-panel">
                  <div className="radio-row">
                    <Radio label="Taxpayer" checked={transaction.whose==="taxpayer"} onChange={() => setTx("whose","taxpayer")} />
                    <Radio label="Spouse" checked={transaction.whose==="spouse"} onChange={() => setTx("whose","spouse")} />
                    <Radio label="Joint" checked={transaction.whose==="joint"} onChange={() => setTx("whose","joint")} />
                  </div>
                  <Field label="Description of Property *" value={transaction.description} onChange={(v: any) => setTx("description",v)} />
                  <div className="field">
                    <label>Date Acquired *</label>
                    <CB label="Alternate Option: If Date Acquired is not known, leave the date blank and select an option here" checked={transaction.dateAcquiredAlt} onChange={(v: any) => setTx("dateAcquiredAlt",v)} />
                    <input type="date" value={transaction.dateAcquired} onChange={(e: any) => setTx("dateAcquired",e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Date Sold *</label>
                    <CB label="Alternate Option" checked={transaction.dateSoldAlt} onChange={(v: any) => setTx("dateSoldAlt",v)} />
                    <CB label="Check here if a short sale" checked={transaction.shortSale} onChange={(v: any) => setTx("shortSale",v)} />
                    <input type="date" value={transaction.dateSold} onChange={(e: any) => setTx("dateSold",e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Sales Price *</label>
                    <CB label="Alternate Option: If Sale Price is Expired, leave the sales price blank and select an option here" checked={transaction.salesPriceAlt} onChange={(v: any) => setTx("salesPriceAlt",v)} />
                    <MF label="" value={transaction.salesPrice} onChange={(v: any) => setTx("salesPrice",v)} />
                  </div>
                  <div className="field">
                    <label>Select cost basis type *</label>
                    <select value={transaction.costBasisType} onChange={(e: any) => setTx("costBasisType",e.target.value)}>
                      <option value="">- Please Select -</option>
                      <option>A - Short-term reported to IRS</option>
                      <option>B - Short-term not reported to IRS</option>
                      <option>C - Short-term basis not reported</option>
                      <option>D - Long-term reported to IRS</option>
                      <option>E - Long-term not reported to IRS</option>
                      <option>F - Long-term basis not reported</option>
                    </select>
                  </div>
                  <CB label="Is the transaction a Short Term Section 1061 Partnership Interest?" checked={transaction.shortTermPartnership} onChange={(v: any) => setTx("shortTermPartnership",v)} />
                  <div className="field">
                    <label>Cost *</label>
                    <CB label="Alternate Option: If Cost is Expired, leave the cost blank and select an option here" checked={transaction.costAlt} onChange={(v: any) => setTx("costAlt",v)} />
                    <MF label="" value={transaction.cost} onChange={(v: any) => setTx("cost",v)} />
                  </div>
                  <div className="field">
                    <label>Adjustments</label>
                    <MF label="Enter any necessary adjustments to Gain or Loss" value={transaction.adjustment} onChange={(v: any) => setTx("adjustment",v)} />
                    <div className="adj-codes">
                      {ADJ_CODES.map(code => (
                        <label key={code} className="adj-cb">
                          <input type="checkbox"
                            checked={transaction.adjustmentCodes.includes(code.split(" - ")[0])}
                            onChange={(e: any) => {
                              const c = code.split(" - ")[0]
                              setTx("adjustmentCodes", e.target.checked
                                ? [...transaction.adjustmentCodes, c]
                                : transaction.adjustmentCodes.filter((x: string) => x !== c))
                            }} />
                          {code}
                        </label>
                      ))}
                    </div>
                  </div>
                  <CB label="Is this a Collectible Exchange?" checked={transaction.isCollectible} onChange={(v: any) => setTx("isCollectible",v)} />
                  <button className="continue-btn" onClick={async () => { setSaving(true); await fetch(`/api/returns/${id}/income/schedule-d`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(transaction)}); setSaving(false); setActiveSection(null) }} disabled={saving}>{saving?"Saving...":"SAVE TRANSACTION"}</button>
                </div>
              )}

              {activeSection === "noadj" && s.key === "noadj" && (
                <div className="form-panel">
                  {[{label:"Short-Term Transactions",tp:"tpShort",sp:"spShort",j:"jointShort"},{label:"Long-Term Transactions",tp:"tpLong",sp:"spLong",j:"jointLong"}].map(group => (
                    <div key={group.label}>
                      <h3 className="group-title">{group.label}</h3>
                      <div className="three-col">
                        <MF label="Total proceeds (sales price)" value={(noAdj as any)[group.tp]} onChange={(v: string) => setNoAdj(p => ({...p,[group.tp]:v}))} />
                        <MF label="Total cost or other basis" value={(noAdj as any)[group.sp]} onChange={(v: string) => setNoAdj(p => ({...p,[group.sp]:v}))} />
                        <MF label="Total gain or loss" value={(noAdj as any)[group.j]} onChange={(v: string) => setNoAdj(p => ({...p,[group.j]:v}))} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeSection === "carryover" && s.key === "carryover" && (
                <div className="form-panel">
                  <MF label="Adjust Section 1250 Amounts" value={lossCarryover.section1250} onChange={(v: string) => setLossCarryover(p => ({...p,section1250:v}))} />
                  <MF label="Adjust 28% Gain" value={lossCarryover.gain28} onChange={(v: string) => setLossCarryover(p => ({...p,gain28:v}))} />
                  <h3 className="group-title">Short Term Loss Carryover from 2024 (enter as a positive number)</h3>
                  <MF label="Taxpayer" value={lossCarryover.tpShortTerm} onChange={(v: string) => setLossCarryover(p => ({...p,tpShortTerm:v}))} />
                  <MF label="Spouse" value={lossCarryover.spShortTerm} onChange={(v: string) => setLossCarryover(p => ({...p,spShortTerm:v}))} />
                  <MF label="Joint" value={lossCarryover.jointShortTerm} onChange={(v: string) => setLossCarryover(p => ({...p,jointShortTerm:v}))} />
                  <h3 className="group-title">Long Term Loss Carryover from 2024 (enter as a positive number)</h3>
                  <MF label="Taxpayer" value={lossCarryover.tpLongTerm} onChange={(v: string) => setLossCarryover(p => ({...p,tpLongTerm:v}))} />
                  <MF label="Spouse" value={lossCarryover.spLongTerm} onChange={(v: string) => setLossCarryover(p => ({...p,spLongTerm:v}))} />
                  <MF label="Joint" value={lossCarryover.jointLongTerm} onChange={(v: string) => setLossCarryover(p => ({...p,jointLongTerm:v}))} />
                </div>
              )}

              {activeSection === "pdf" && s.key === "pdf" && (
                <div className="form-panel">
                  <div className="upload-zone">
                    <div className="upload-icon">⬆</div>
                    <p>Drag and Drop PDF here, or click to upload</p>
                    <p className="upload-note">You may upload each PDF file up to 5 MB</p>
                  </div>
                </div>
              )}

              {activeSection === "8997" && s.key === "8997" && (
                <div className="form-panel">
                  <p className="field-label">Are you a foreign eligible taxpayer? *</p>
                  <div className="radio-row"><Radio label="Yes" checked={false} onChange={()=>{}} /><Radio label="No" checked={false} onChange={()=>{}} /></div>
                  <p className="field-label">Did you dispose of any investment(s) and didn't receive a Form 1099-B reporting the disposition from the qualified opportunity fund or other third party?</p>
                  <div className="radio-row"><Radio label="Yes" checked={false} onChange={()=>{}} /><Radio label="No" checked={false} onChange={()=>{}} /></div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="footer">
          <button className="back-btn" onClick={() => router.push(`${base}/federal/income`)}>BACK</button>
          <button className="continue-btn" onClick={() => router.push(`${base}/federal/income`)}>CONTINUE</button>
        </div>
      </main>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .root{display:flex;min-height:100vh;font-family:'DM Sans',sans-serif;background:#f8fafc}
        .main{flex:1;margin-left:220px;padding:24px 36px;display:flex;flex-direction:column;gap:16px}
        .breadcrumb{font-size:12px;color:#94a3b8}.title{font-size:22px;font-weight:700;color:#0f172a}
        .hub-list{background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}
        .hub-row{display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-bottom:1px solid #f1f5f9;cursor:pointer}
        .hub-row:hover{background:#f8fafc}
        .hub-label{font-size:14px;font-weight:600;color:#0f172a}
        .hub-desc{font-size:12px;color:#64748b;margin-top:2px}
        .begin-btn{background:#1e3a5f;color:#fff;border:none;padding:7px 18px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap}
        .begin-btn:hover{background:#1e40af}
        .form-panel{padding:20px 24px;background:#fafafa;border-bottom:1px solid #f1f5f9;display:flex;flex-direction:column;gap:14px}
        .field{display:flex;flex-direction:column;gap:5px}
        .field label,.field-label{font-size:12px;font-weight:500;color:#374151}
        .field input,.field select{padding:9px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none}
        .field input:focus,.field select:focus{border-color:#3b82f6}
        .money-input{display:flex;align-items:center;border:1px solid #d1d5db;border-radius:6px;overflow:hidden}
        .money-input span{padding:8px;background:#f8fafc;font-size:13px;color:#64748b;border-right:1px solid #d1d5db}
        .money-input input{border:none;padding:8px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;flex:1}
        .radio-row{display:flex;gap:20px}
        .three-col{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
        .group-title{font-size:14px;font-weight:700;color:#0f172a;margin-top:4px}
        .adj-codes{display:flex;flex-direction:column;gap:6px;margin-top:8px;max-height:300px;overflow-y:auto}
        .adj-cb{display:flex;align-items:flex-start;gap:8px;font-size:12px;color:#374151;cursor:pointer;line-height:1.4}
        .upload-zone{border:2px dashed #cbd5e1;border-radius:10px;padding:40px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px;color:#94a3b8;cursor:pointer}
        .upload-icon{font-size:32px;color:#3b82f6}
        .upload-note{font-size:11px}
        .footer{display:flex;justify-content:space-between}
        .back-btn,.continue-btn{background:#1e3a5f;color:#fff;border:none;padding:9px 20px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
        .back-btn:hover,.continue-btn:hover{background:#1e40af}
        .continue-btn:disabled{opacity:0.5}
      `}</style>
    </div>
  )
}
function Field({ label, value, onChange, placeholder }: any) {
  return <div className="field"><label>{label}</label><input value={value} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder} /></div>
}
function MF({ label, value, onChange }: any) {
  return <div className="field">{label && <label>{label}</label>}<div className="money-input"><span>$</span><input type="number" step="0.01" value={value} onChange={(e: any) => onChange(e.target.value)} /></div></div>
}
function Radio({ label, checked, onChange }: any) {
  return <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:14,color:"#374151"}}><input type="radio" checked={checked} onChange={onChange} />{label}</label>
}
function CB({ label, checked, onChange }: any) {
  return <label style={{display:"flex",alignItems:"flex-start",gap:8,cursor:"pointer",fontSize:12,color:"#374151",lineHeight:1.5}}><input type="checkbox" checked={checked} onChange={(e: any) => onChange(e.target.checked)} style={{marginTop:2,flexShrink:0}} />{label}</label>
}
