"use client"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../../../ReturnNav"

export default function Form8962Page() {
  const router = useRouter(); const params = useParams()
  const id = params.id as string; const base = `dashboard/returns/${id}`
  const [saving, setSaving] = useState(false)
  const [fields, setFields] = useState<Record<string,any>>({})
  function set(f:string,v:any){setFields(p=>({...p,[f]:v}))}

  const agi = parseFloat(fields.agi||"0")
  const familySize = parseInt(fields.familySize||"1")
  const fpl2025: Record<number,number> = {1:15650,2:21150,3:26650,4:32150,5:37650,6:43150,7:48650,8:54150}
  const fpl = fpl2025[Math.min(familySize,8)] || 15650
  const fplPct = agi > 0 ? ((agi/fpl)*100).toFixed(1) : "0"
  const aptc = parseFloat(fields.aptcReceived||"0")
  const annualPremium = parseFloat(fields.annualPremium||"0")
  const slcsp = parseFloat(fields.slcsp||"0")
  const ptcPct = Math.min(Math.max((agi/fpl),1),4) 
  const maxPtc = Math.max(0, slcsp - (agi * 0.0850))
  const ptcAllowed = Math.min(annualPremium, Math.max(0, maxPtc))
  const netPtc = ptcAllowed - aptc

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/returns/${id}/income/other-income`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({...fields, formType:"8962", netPtc, ptcAllowed}),
    })
    setSaving(false)
    router.push(`/${base}/federal/income`)
  }

  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={2025} />
      <main className="main">
        <h1 className="title">Form 8962 <span className="ref">Premium Tax Credit (ACA)</span></h1>
        <div className="card">
          <h2>Part I — Annual and Monthly Contribution Amount</h2>
          <p className="note">Use this form to reconcile the Advance Premium Tax Credit (APTC) you received with the actual Premium Tax Credit you are entitled to based on your income.</p>
          <div className="row">
            <MF label="Modified AGI (from Form 1040 line 11)" fkey="agi" fields={fields} set={set} />
            <SF label="Family size (number of exemptions)" fkey="familySize" fields={fields} set={set} options={["1","2","3","4","5","6","7","8"]} />
          </div>
          <div className="calc-box">
            <div className="calc-row"><span>Federal Poverty Level (2025)</span><span>${fpl.toLocaleString()}</span></div>
            <div className="calc-row"><span>Your income as % of FPL</span><span>{fplPct}%</span></div>
            <div className="calc-row total"><span>{parseFloat(fplPct) < 100 ? "⚠ Below 100% FPL — may not qualify" : parseFloat(fplPct) > 400 ? "⚠ Above 400% FPL — no PTC" : "✓ Eligible for Premium Tax Credit"}</span><span></span></div>
          </div>
        </div>
        <div className="card">
          <h2>Part II — Premium Tax Credit Claim and Reconciliation</h2>
          <p className="note">Enter amounts from your Form 1095-A.</p>
          <div className="row">
            <MF label="Annual enrollment premiums (1095-A Col A)" fkey="annualPremium" fields={fields} set={set} />
            <MF label="Annual SLCSP premium (1095-A Col B)" fkey="slcsp" fields={fields} set={set} />
            <MF label="Advance PTC received (1095-A Col C)" fkey="aptcReceived" fields={fields} set={set} />
          </div>
          <div className="calc-box">
            <div className="calc-row"><span>Maximum PTC allowed</span><span>${ptcAllowed.toFixed(2)}</span></div>
            <div className="calc-row"><span>Advance PTC received</span><span>-${aptc.toFixed(2)}</span></div>
            <div className={`calc-row total`}>
              <span>{netPtc >= 0 ? "Additional PTC (refundable credit)" : "Excess APTC repayment"}</span>
              <span style={{color: netPtc >= 0 ? "#16a34a" : "#dc2626"}}>${Math.abs(netPtc).toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="card">
          <h2>Part IV — Shared Policy Allocation (if applicable)</h2>
          <CB label="Policy shared with another taxpayer (e.g. divorced/separated)" fkey="hasSharedPolicy" fields={fields} set={set} />
          {fields.hasSharedPolicy && (
            <div className="row">
              <TF label="Other taxpayer SSN" fkey="sharedTaxpayerSSN" fields={fields} set={set} />
              <MF label="Allocation percentage (%)" fkey="allocationPct" fields={fields} set={set} />
            </div>
          )}
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
function MF({label,fkey,fields,set,full=false}:any){return <div className="field" style={full?{flex:"1 1 100%"}:{}}><label>{label}</label><div className="money"><span>$</span><input type="number" step="0.01" min="0" value={fields[fkey]||""} onChange={(e:any)=>set(fkey,e.target.value)} /></div></div>}
function TF({label,fkey,fields,set}:any){return <div className="field"><label>{label}</label><input value={fields[fkey]||""} onChange={(e:any)=>set(fkey,e.target.value)} /></div>}
function SF({label,fkey,fields,set,options}:any){return <div className="field"><label>{label}</label><select value={fields[fkey]||""} onChange={(e:any)=>set(fkey,e.target.value)}><option value="">Select...</option>{options.map((o:string)=><option key={o}>{o}</option>)}</select></div>}
function CB({label,fkey,fields,set}:any){return <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:14}}><input type="checkbox" checked={!!fields[fkey]} onChange={(e:any)=>set(fkey,e.target.checked)} />{label}</label>}
const STYLE=`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');*{box-sizing:border-box;margin:0;padding:0}.root{display:flex;min-height:100vh;font-family:'DM Sans',sans-serif;background:#f8fafc}.main{flex:1;margin-left:220px;padding:24px 36px;display:flex;flex-direction:column;gap:16px}.title{font-size:22px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:10px}.ref{font-size:12px;font-weight:400;color:#94a3b8;background:#f1f5f9;padding:2px 8px;border-radius:10px}.card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;display:flex;flex-direction:column;gap:14px}.card h2{font-size:14px;font-weight:600;color:#0f172a}.row{display:flex;gap:12px;flex-wrap:wrap}.field{display:flex;flex-direction:column;gap:5px;flex:1;min-width:160px}.field label{font-size:12px;font-weight:500;color:#374151}.field input,.field select{padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:7px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none}.field input:focus,.field select:focus{border-color:#3b82f6}.money{display:flex;align-items:center;border:1.5px solid #e2e8f0;border-radius:7px;overflow:hidden}.money span{padding:8px 10px;background:#f8fafc;font-size:13px;color:#64748b;border-right:1px solid #e2e8f0}.money input{border:none;padding:8px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;flex:1}.footer{display:flex;justify-content:space-between;align-items:center}.back-btn{background:none;border:1.5px solid #e2e8f0;color:#64748b;padding:9px 20px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}.continue-btn{background:#1e3a5f;color:#fff;border:none;padding:9px 24px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}.continue-btn:disabled{opacity:0.5;cursor:not-allowed}.note{font-size:12px;color:#64748b;line-height:1.5}.calc-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:8px}.calc-row{display:flex;justify-content:space-between;font-size:13px;color:#374151}.calc-row.total{font-weight:700;border-top:1px solid #e2e8f0;padding-top:8px}`