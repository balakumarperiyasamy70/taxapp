"use client"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../../../ReturnNav"
import { EINField } from "../../../../../../components/TaxFields"

export default function Form6251Page() {
  const router = useRouter(); const params = useParams()
  const id = params.id as string; const base = `/dashboard/returns/${id}`
  const [saving, setSaving] = useState(false)
  const [fields, setFields] = useState<Record<string,any>>({})
  function set(f:string,v:any){setFields(p=>{...p,[f]:v})}
  async function handleSave() {
    setSaving(true)
    await fetch(`/api/returns/${id}/income/other-income`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({...fields, formType:"other-income"}),
    })
    setSaving(false)
    router.push(`${base}/federal/income`)
  }
  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={2025} />
      <main className="main">
        <h1 className="title">Form 6251 <span className="ref">Alternative Minimum Tax (AMT)</span></h1>

        <div className="card">
          <h2>AMT Income Adjustments</h2>
          <p className="note">The AMT ensures high-income taxpayers pay a minimum amount of tax. The 2025 exemption is $137,000 (single) / $220,700 (MFJ).</p>
          <div className="row">
            <MF label="Adjusted gross income (Form 1040 line 11)" fkey="agi" fields={fields} set={set} />
            <SF label="Filing status" fkey="filingStatus" fields={fields} set={set} options={["SINGLE","MARRIED_FILING_JOINTLY","MARRIED_FILING_SEPARATELY","HEAD_OF_HOUSEHOLD"]} />
          </div>
          <div className="row">
            <MF label="Standard/itemized deduction added back" fkey="dedAddBack" fields={fields} set={set} />
            <MF label="State & local tax deduction add-back" fkey="saltAddBack" fields={fields} set={set} />
          </div>
          <div className="row">
            <MF label="ISO stock options exercised" fkey="isoOptions" fields={fields} set={set} />
            <MF label="Accelerated depreciation adjustment" fkey="depreciation" fields={fields} set={set} />
            <MF label="Other AMT adjustments" fkey="otherAdjust" fields={fields} set={set} />
          </div>
        </div>
        <div className="card">
          <h2>AMT Calculation Preview</h2>
          {(() => {
            const agi = parseFloat(fields.agi||"0")
            const fs = fields.filingStatus||"SINGLE"
            const exemption = fs === "MARRIED_FILING_JOINTLY" ? 220700 : fs === "MARRIED_FILING_SEPARATELY" ? 110350 : 137000
            const phaseoutStart = fs === "MARRIED_FILING_JOINTLY" ? 1252700 : 835500
            const addbacks = (parseFloat(fields.dedAddBack||"0") + parseFloat(fields.saltAddBack||"0") + parseFloat(fields.isoOptions||"0") + parseFloat(fields.depreciation||"0") + parseFloat(fields.otherAdjust||"0"))
            const amti = agi + addbacks
            const phaseout = Math.max(0, (amti - phaseoutStart) * 0.25)
            const effectiveExemption = Math.max(0, exemption - phaseout)
            const amtBase = Math.max(0, amti - effectiveExemption)
            const amt = amtBase <= 232600 ? amtBase * 0.26 : (232600 * 0.26) + ((amtBase - 232600) * 0.28)
            return (
              <div className="calc-box">
                <div className="calc-row"><span>AGI</span><span>${agi.toLocaleString()}</span></div>
                <div className="calc-row"><span>AMT add-backs</span><span>+${addbacks.toLocaleString()}</span></div>
                <div className="calc-row"><span>AMTI (Alternative Minimum Taxable Income)</span><span>${amti.toLocaleString()}</span></div>
                <div className="calc-row"><span>AMT exemption</span><span>-${effectiveExemption.toLocaleString()}</span></div>
                <div className="calc-row total"><span>Tentative Minimum Tax</span><span>${amt.toFixed(2)}</span></div>
                <div className="calc-row" style={{color:amt>0?"#dc2626":"#16a34a"}}><span>{amt>0?"⚠ AMT may apply — review with your tax advisor":"✓ AMT likely does not apply"}</span><span></span></div>
              </div>
            )
          })()}
        </div>
        <div className="footer">
          <button className="back-btn" onClick={()=>router.push(`${base}/federal/income`)}>BACK</button>
          <button className="continue-btn" onClick={handleSave} disabled={saving}>{saving?"Saving...":"SAVE & CONTINUE"}</button>
        </div>
      </main>
      <style>{STYLE}</style>
    </div>
  )
}

function MF({label,fkey,fields,set,full=false}:any){return <div className="field" style={full?{flex:"1 1 100%"}:{}}><label>{label}</label><div className="money"><span>$</span><input type="number" step="0.01" min="0" value={fields[fkey]||""} onChange={(e:any)=>set(fkey,e.target.value)} /></div></div>}
function TF({label,fkey,fields,set,full=false}:any){return <div className="field" style={full?{flex:"1 1 100%"}:{}}><label>{label}</label><input value={fields[fkey]||""} onChange={(e:any)=>set(fkey,e.target.value)} /></div>}
function SF({label,fkey,fields,set,options}:any){return <div className="field"><label>{label}</label><select value={fields[fkey]||""} onChange={(e:any)=>set(fkey,e.target.value)}><option value="">Select...</option>{options.map((o:string)=><option key={o}>{o}</option>)}</select></div>}
function CB({label,fkey,fields,set}:any){return <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:14,color:"#374151"}}><input type="checkbox" checked={!!fields[fkey]} onChange={(e:any)=>set(fkey,e.target.checked)} />{label}</label>}
const STYLE=`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');*{box-sizing:border-box;margin:0;padding:0}.root{display:flex;min-height:100vh;font-family:'DM Sans',sans-serif;background:#f8fafc}.main{flex:1;margin-left:220px;padding:24px 36px;display:flex;flex-direction:column;gap:16px}.title{font-size:22px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:10px}.ref{font-size:12px;font-weight:400;color:#94a3b8;background:#f1f5f9;padding:2px 8px;border-radius:10px}.card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;display:flex;flex-direction:column;gap:14px}.card h2{font-size:14px;font-weight:600;color:#0f172a}.row{display:flex;gap:12px;flex-wrap:wrap}.field{display:flex;flex-direction:column;gap:5px;flex:1;min-width:160px}.field label{font-size:12px;font-weight:500;color:#374151}.field input,.field select{padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:7px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none}.field input:focus,.field select:focus{border-color:#3b82f6}.money{display:flex;align-items:center;border:1.5px solid #e2e8f0;border-radius:7px;overflow:hidden}.money span{padding:8px 10px;background:#f8fafc;font-size:13px;color:#64748b;border-right:1px solid #e2e8f0}.money input{border:none;padding:8px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;flex:1}.footer{display:flex;justify-content:space-between;align-items:center}.back-btn{background:none;border:1.5px solid #e2e8f0;color:#64748b;padding:9px 20px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}.continue-btn{background:#1e3a5f;color:#fff;border:none;padding:9px 24px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}.continue-btn:disabled{opacity:0.5;cursor:not-allowed}.note{font-size:12px;color:#64748b;line-height:1.5}.calc-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:8px}.calc-row{display:flex;justify-content:space-between;font-size:13px;color:#374151}.calc-row.total{font-weight:700;border-top:1px solid #e2e8f0;padding-top:8px}`