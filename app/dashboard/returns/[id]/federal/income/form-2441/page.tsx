"use client"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../../../ReturnNav"

export default function Form2441Page() {
  const router = useRouter(); const params = useParams()
  const id = params.id as string; const base = `dashboard/returns/${id}`
  const [saving, setSaving] = useState(false)
  const [fields, setFields] = useState<Record<string,any>>({})
  const [providers, setProviders] = useState([{name:"",ein:"",address:"",amount:""}])
  const [qualifying, setQualifying] = useState([{name:"",ssn:"",dob:"",days:""}])
  function set(f:string,v:any){setFields(p=>({...p,[f]:v}))}

  const totalPaid = providers.reduce((s,p)=>s+parseFloat(p.amount||"0"),0)
  const agi = parseFloat(fields.agi||"0")
  const filingStatus = fields.filingStatus||"SINGLE"
  const numChildren = qualifying.length
  const expenseLimit = numChildren >= 2 ? 6000 : 3000
  const eligibleExpenses = Math.min(totalPaid, expenseLimit)
  const creditPct = agi <= 15000 ? 0.35 : agi >= 43000 ? 0.20 : 0.35 - ((agi-15000)/2000)*0.01
  const credit = Math.round(eligibleExpenses * creditPct)

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/returns/${id}/income/other-income`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({...fields, formType:"2441", providers, qualifying, totalPaid, credit}),
    })
    setSaving(false)
    router.push(`/${base}/federal/income`)
  }

  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={2025} />
      <main className="main">
        <h1 className="title">Form 2441 <span className="ref">Child & Dependent Care Expenses</span></h1>
        <div className="card">
          <h2>Part I — Care Providers</h2>
          <p className="note">List all persons or organizations that provided care. You must include the provider's SSN or EIN.</p>
          {providers.map((p,i)=>(
            <div key={i} style={{border:"1px solid #e2e8f0",borderRadius:8,padding:14,display:"flex",flexDirection:"column",gap:10}}>
              <div style={{fontSize:13,fontWeight:600,color:"#1e40af"}}>Provider {i+1}</div>
              <div className="row">
                <div className="field" style={{flex:"1 1 100%"}}><label>Provider name</label><input value={p.name} onChange={(e:any)=>{const np=[...providers];np[i]={...np[i],name:e.target.value};setProviders(np)}} /></div>
              </div>
              <div className="row">
                <div className="field"><label>Address</label><input value={p.address} onChange={(e:any)=>{const np=[...providers];np[i]={...np[i],address:e.target.value};setProviders(np)}} /></div>
                <div className="field"><label>EIN/SSN</label><input value={p.ein} onChange={(e:any)=>{const np=[...providers];np[i]={...np[i],ein:e.target.value};setProviders(np)}} /></div>
                <div className="field"><label>Amount paid</label><div className="money"><span>$</span><input type="number" min="0" value={p.amount} onChange={(e:any)=>{const np=[...providers];np[i]={...np[i],amount:e.target.value};setProviders(np)}} /></div></div>
              </div>
            </div>
          ))}
          <button style={{alignSelf:"flex-start",background:"none",border:"1.5px dashed #cbd5e1",padding:"8px 16px",borderRadius:7,fontSize:13,color:"#64748b",cursor:"pointer"}} onClick={()=>setProviders(p=>[...p,{name:"",ein:"",address:"",amount:""}])}>+ Add Provider</button>
        </div>
        <div className="card">
          <h2>Part II — Credit for Child & Dependent Care Expenses</h2>
          <div className="row">
            <div className="field"><label>Your filing status</label><select value={fields.filingStatus||""} onChange={(e:any)=>set("filingStatus",e.target.value)}><option value="">Select...</option><option>SINGLE</option><option>MARRIED_FILING_JOINTLY</option><option>HEAD_OF_HOUSEHOLD</option></select></div>
            <div className="field"><label>Modified AGI</label><div className="money"><span>$</span><input type="number" value={fields.agi||""} onChange={(e:any)=>set("agi",e.target.value)} /></div></div>
          </div>
          <div className="card">
            <h2>Qualifying Persons</h2>
            {qualifying.map((q,i)=>(
              <div key={i} className="row">
                <div className="field"><label>Name</label><input value={q.name} onChange={(e:any)=>{const nq=[...qualifying];nq[i]={...nq[i],name:e.target.value};setQualifying(nq)}} /></div>
                <div className="field"><label>SSN</label><input value={q.ssn} onChange={(e:any)=>{const nq=[...qualifying];nq[i]={...nq[i],ssn:e.target.value};setQualifying(nq)}} /></div>
                <div className="field"><label>Date of birth</label><input type="date" value={q.dob} onChange={(e:any)=>{const nq=[...qualifying];nq[i]={...nq[i],dob:e.target.value};setQualifying(nq)}} /></div>
              </div>
            ))}
            <button style={{alignSelf:"flex-start",background:"none",border:"1.5px dashed #cbd5e1",padding:"8px 16px",borderRadius:7,fontSize:13,color:"#64748b",cursor:"pointer"}} onClick={()=>setQualifying(q=>[...q,{name:"",ssn:"",dob:"",days:""}])}>+ Add Person</button>
          </div>
          <div className="calc-box">
            <div className="calc-row"><span>Total care expenses paid</span><span>${totalPaid.toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
            <div className="calc-row"><span>Expense limit ({numChildren>=2?"2+":"1"} qualifying person{numChildren>=2?"s":""})</span><span>${expenseLimit.toLocaleString()}</span></div>
            <div className="calc-row"><span>Eligible expenses</span><span>${eligibleExpenses.toLocaleString()}</span></div>
            <div className="calc-row"><span>Credit percentage</span><span>{(creditPct*100).toFixed(0)}%</span></div>
            <div className="calc-row total"><span>Child & Dependent Care Credit</span><span>${credit.toLocaleString()}</span></div>
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
const STYLE=`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');*{box-sizing:border-box;margin:0;padding:0}.root{display:flex;min-height:100vh;font-family:'DM Sans',sans-serif;background:#f8fafc}.main{flex:1;margin-left:220px;padding:24px 36px;display:flex;flex-direction:column;gap:16px}.title{font-size:22px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:10px}.ref{font-size:12px;font-weight:400;color:#94a3b8;background:#f1f5f9;padding:2px 8px;border-radius:10px}.card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;display:flex;flex-direction:column;gap:14px}.card h2{font-size:14px;font-weight:600;color:#0f172a}.row{display:flex;gap:12px;flex-wrap:wrap}.field{display:flex;flex-direction:column;gap:5px;flex:1;min-width:160px}.field label{font-size:12px;font-weight:500;color:#374151}.field input,.field select{padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:7px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none}.field input:focus,.field select:focus{border-color:#3b82f6}.money{display:flex;align-items:center;border:1.5px solid #e2e8f0;border-radius:7px;overflow:hidden}.money span{padding:8px 10px;background:#f8fafc;font-size:13px;color:#64748b;border-right:1px solid #e2e8f0}.money input{border:none;padding:8px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;flex:1}.footer{display:flex;justify-content:space-between;align-items:center}.back-btn{background:none;border:1.5px solid #e2e8f0;color:#64748b;padding:9px 20px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}.continue-btn{background:#1e3a5f;color:#fff;border:none;padding:9px 24px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}.continue-btn:disabled{opacity:0.5;cursor:not-allowed}.note{font-size:12px;color:#64748b;line-height:1.5}.calc-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:8px}.calc-row{display:flex;justify-content:space-between;font-size:13px;color:#374151}.calc-row.total{font-weight:700;border-top:1px solid #e2e8f0;padding-top:8px}`