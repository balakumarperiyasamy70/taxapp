"use client"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../../../ReturnNav"

export default function Form8812Page() {
  const router = useRouter(); const params = useParams()
  const id = params.id as string; const base = `dashboard/returns/${id}`
  const [saving, setSaving] = useState(false)
  const [fields, setFields] = useState<Record<string,any>>({})
  function set(f:string,v:any){setFields(p=>({...p,[f]:v}))}

  const numChildren = parseInt(fields.numQualifyingChildren||"0")
  const numOtherDep = parseInt(fields.numOtherDependents||"0")
  const agi = parseFloat(fields.agi||"0")
  const filingStatus = fields.filingStatus||"SINGLE"
  const threshold = filingStatus === "MARRIED_FILING_JOINTLY" ? 400000 : 200000
  const excess = Math.max(0, agi - threshold)
  const phaseout = Math.ceil(excess / 1000) * 50
  const ctcPerChild = 2000
  const otherDepCredit = 500
  const maxCTC = (numChildren * ctcPerChild) + (numOtherDep * otherDepCredit)
  const ctcAfterPhaseout = Math.max(0, maxCTC - phaseout)
  const earnedIncome = parseFloat(fields.earnedIncome||"0")
  const actc = Math.min(Math.max(0, (earnedIncome - 2500) * 0.15), numChildren * 1700)

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/returns/${id}/income/other-income`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({...fields, formType:"8812", ctcAfterPhaseout, actc}),
    })
    setSaving(false)
    router.push(`/${base}/federal/income`)
  }

  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={2025} />
      <main className="main">
        <h1 className="title">Schedule 8812 <span className="ref">Child Tax Credit & Additional CTC</span></h1>
        <div className="card">
          <h2>Qualifying Children & Dependents</h2>
          <p className="note">Child Tax Credit: $2,000 per qualifying child under 17. Credit for Other Dependents: $500 per qualifying dependent.</p>
          <div className="row">
            <SF label="Number of qualifying children under age 17" fkey="numQualifyingChildren" fields={fields} set={set} options={["0","1","2","3","4","5","6","7","8","9","10"]} />
            <SF label="Number of other qualifying dependents" fkey="numOtherDependents" fields={fields} set={set} options={["0","1","2","3","4","5"]} />
          </div>
        </div>
        <div className="card">
          <h2>Income Information</h2>
          <div className="row">
            <MF label="Modified AGI (Form 1040 line 11)" fkey="agi" fields={fields} set={set} />
            <SF label="Filing status" fkey="filingStatus" fields={fields} set={set} options={["SINGLE","MARRIED_FILING_JOINTLY","MARRIED_FILING_SEPARATELY","HEAD_OF_HOUSEHOLD"]} />
          </div>
          <div className="row">
            <MF label="Earned income (wages + self-employment income)" fkey="earnedIncome" fields={fields} set={set} />
          </div>
        </div>
        <div className="card">
          <h2>Credit Calculation</h2>
          <div className="calc-box">
            <div className="calc-row"><span>Child Tax Credit ({numChildren} × $2,000)</span><span>${(numChildren*2000).toLocaleString()}</span></div>
            <div className="calc-row"><span>Other Dependent Credit ({numOtherDep} × $500)</span><span>${(numOtherDep*500).toLocaleString()}</span></div>
            <div className="calc-row"><span>Maximum credit</span><span>${maxCTC.toLocaleString()}</span></div>
            <div className="calc-row"><span>Phase-out (AGI over ${threshold.toLocaleString()})</span><span>-${phaseout.toLocaleString()}</span></div>
            <div className="calc-row total"><span>Child Tax Credit</span><span>${ctcAfterPhaseout.toLocaleString()}</span></div>
            <div className="calc-row" style={{marginTop:8}}><span>Additional Child Tax Credit (refundable)</span><span>${actc.toFixed(2)}</span></div>
          </div>
        </div>
        <div className="footer">
          <button className="back-btn" onClick={()=>router.push(`/${base}/federal/income`)}>BACK</button>
          <button className="continue-btn" onClick={handleSave} disabled={saving}>{saving?"Saving...":"SAVE & CONTINUE"}</button>
        </div>
      </main>
      <style>{STYLE}</style>
    </div>
  )
}
function MF({label,fkey,fields,set}:any){return <div className="field"><label>{label}</label><div className="money"><span>$</span><input type="number" step="0.01" min="0" value={fields[fkey]||""} onChange={(e:any)=>set(fkey,e.target.value)} /></div></div>}
function SF({label,fkey,fields,set,options}:any){return <div className="field"><label>{label}</label><select value={fields[fkey]||""} onChange={(e:any)=>set(fkey,e.target.value)}><option value="">Select...</option>{options.map((o:string)=><option key={o}>{o}</option>)}</select></div>}
const STYLE=`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');*{box-sizing:border-box;margin:0;padding:0}.root{display:flex;min-height:100vh;font-family:'DM Sans',sans-serif;background:#f8fafc}.main{flex:1;margin-left:220px;padding:24px 36px;display:flex;flex-direction:column;gap:16px}.title{font-size:22px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:10px}.ref{font-size:12px;font-weight:400;color:#94a3b8;background:#f1f5f9;padding:2px 8px;border-radius:10px}.card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;display:flex;flex-direction:column;gap:14px}.card h2{font-size:14px;font-weight:600;color:#0f172a}.row{display:flex;gap:12px;flex-wrap:wrap}.field{display:flex;flex-direction:column;gap:5px;flex:1;min-width:160px}.field label{font-size:12px;font-weight:500;color:#374151}.field input,.field select{padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:7px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none}.field input:focus,.field select:focus{border-color:#3b82f6}.money{display:flex;align-items:center;border:1.5px solid #e2e8f0;border-radius:7px;overflow:hidden}.money span{padding:8px 10px;background:#f8fafc;font-size:13px;color:#64748b;border-right:1px solid #e2e8f0}.money input{border:none;padding:8px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;flex:1}.footer{display:flex;justify-content:space-between;align-items:center}.back-btn{background:none;border:1.5px solid #e2e8f0;color:#64748b;padding:9px 20px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}.continue-btn{background:#1e3a5f;color:#fff;border:none;padding:9px 24px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}.continue-btn:disabled{opacity:0.5;cursor:not-allowed}.note{font-size:12px;color:#64748b;line-height:1.5}.calc-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:8px}.calc-row{display:flex;justify-content:space-between;font-size:13px;color:#374151}.calc-row.total{font-weight:700;border-top:1px solid #e2e8f0;padding-top:8px}`