"use client"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../../../ReturnNav"
import { EINField } from "../../../../../../components/TaxFields"

export default function Form1099saPage() {
  const router = useRouter(); const params = useParams()
  const id = params.id as string; const base = `/dashboard/returns/${id}`
  const [saving, setSaving] = useState(false)
  const [fields, setFields] = useState<Record<string,any>>({})
  function set(f:string,v:any){setFields(p=>({...p,[f]:v}))}
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
        <h1 className="title">Form 1099-SA <span className="ref">HSA & Archer MSA Distributions</span></h1>

        <div className="card">
          <h2>Trustee/Custodian Information</h2>
          <div className="row"><TF label="Trustee/custodian name *" fkey="payerName" fields={fields} set={set} full /></div>
          <div className="row"><EINField label="Trustee EIN" value={fields.ein||""} onChange={(v:string)=>set("ein",v)} /><TF label="Account number" fkey="accountNumber" fields={fields} set={set} /></div>
        </div>
        <div className="card">
          <h2>Distribution Information</h2>
          <p className="note">HSA distributions used for qualified medical expenses are tax-free. Non-qualified distributions are taxable and subject to 20% penalty.</p>
          <div className="row">
            <MF label="Box 1 — Gross distribution *" fkey="box1" fields={fields} set={set} />
            <MF label="Box 2 — Earnings on excess contributions" fkey="box2" fields={fields} set={set} />
            <MF label="Box 3 — Distribution from Archer MSA" fkey="box3" fields={fields} set={set} />
          </div>
          <div className="row">
            <SF label="Box 5 — Account type" fkey="box5" fields={fields} set={set} options={["HSA","Archer MSA","Medicare Advantage MSA"]} />
            <CB label="Box 4 — FMV on date of death" fkey="box4" fields={fields} set={set} />
          </div>
          <div className="row">
            <MF label="Qualified medical expenses paid (reduces taxable amount)" fkey="qualifiedExpenses" fields={fields} set={set} />
          </div>
          {(() => {
            const gross = parseFloat(fields.box1||"0")
            const qualified = parseFloat(fields.qualifiedExpenses||"0")
            const taxable = Math.max(0, gross - qualified)
            const penalty = taxable * 0.20
            return taxable > 0 ? (
              <div className="calc-box">
                <div className="calc-row"><span>Gross distribution</span><span>${gross.toFixed(2)}</span></div>
                <div className="calc-row"><span>Qualified medical expenses</span><span>-${qualified.toFixed(2)}</span></div>
                <div className="calc-row total"><span>Taxable amount</span><span>${taxable.toFixed(2)}</span></div>
                <div className="calc-row" style={{color:"#dc2626"}}><span>20% penalty (if not disabled/65+)</span><span>${penalty.toFixed(2)}</span></div>
              </div>
            ) : <div className="calc-box"><div className="calc-row total" style={{color:"#16a34a"}}><span>✓ All distributions used for qualified expenses — tax free</span><span></span></div></div>
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