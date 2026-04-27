"use client"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../../../ReturnNav"
import { EINField } from "../../../../../../components/TaxFields"

export default function Form1099intPage() {
  const router = useRouter(); const params = useParams()
  const id = params.id as string; const base = `/dashboard/returns/${id}`
  const [saving, setSaving] = useState(false); const [whose, setWhose] = useState("taxpayer")
  const [fields, setFields] = useState<Record<string,string>>({})
  function set(f:string,v:string){setFields(p=>({...p,[f]:v}))}
  async function handleSave(andAnother=false){
    setSaving(true)
    await fetch(`/api/returns/${id}/income/1099int`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({whose,payerName:fields.payerName,...fields})})
    setSaving(false)
    if(!andAnother)router.push(`${base}/federal/income`); else setFields({})
  }
  return (<div className="root"><ReturnNav returnId={id} taxYear={2025} />
    <main className="main">
      <h1 className="title">Form 1099-INT <span className="ref">Interest Income</span></h1>
      <div className="whose-row">
        <button className={`whose-btn ${whose==="taxpayer"?"active":""}`} onClick={()=>setWhose("taxpayer")}>Taxpayer</button>
        <button className={`whose-btn ${whose==="spouse"?"active":""}`} onClick={()=>setWhose("spouse")}>Spouse</button>
      </div>

      <div className="card"><h2>Payer Information</h2>
        <div className="row"><TF label="Payer name (bank/institution) *" fkey="payerName" fields={fields} set={set} full /></div>
        <div className="row"><EINField label="Payer EIN" value={fields.ein||""} onChange={(v:string)=>set("ein",v)} /><TF label="Account number" fkey="accountNumber" fields={fields} set={set} /></div>
      </div>
      <div className="card"><h2>Interest Income</h2>
        <div className="row">
          <MF label="Box 1 — Interest income *" fkey="box1" fields={fields} set={set} />
          <MF label="Box 2 — Early withdrawal penalty" fkey="box2" fields={fields} set={set} />
          <MF label="Box 3 — Interest on U.S. savings bonds/T-bills" fkey="box3" fields={fields} set={set} />
        </div>
        <div className="row">
          <MF label="Box 4 — Federal tax withheld" fkey="box4" fields={fields} set={set} />
          <MF label="Box 5 — Investment expenses" fkey="box5" fields={fields} set={set} />
          <MF label="Box 6 — Foreign tax paid" fkey="box6" fields={fields} set={set} />
        </div>
        <div className="row">
          <MF label="Box 8 — Tax-exempt interest" fkey="box8" fields={fields} set={set} />
          <MF label="Box 9 — Specified private activity bond interest" fkey="box9" fields={fields} set={set} />
          <MF label="Box 10 — Market discount" fkey="box10" fields={fields} set={set} />
        </div>
        <div className="row">
          <MF label="Box 11 — Bond premium" fkey="box11" fields={fields} set={set} />
          <TF label="Box 15 — State" fkey="state" fields={fields} set={set} />
          <MF label="Box 16 — State tax withheld" fkey="stateWithheld" fields={fields} set={set} />
        </div>
      </div>
      <div className="footer">
        <button className="cancel-btn" onClick={()=>router.push(`${base}/federal/income`)}>CANCEL</button>
        <div style={{display:"flex",gap:8}}>
          <button className="save-another-btn" onClick={()=>handleSave(true)} disabled={saving}>SAVE & ENTER ANOTHER</button>
          <button className="continue-btn" onClick={()=>handleSave(false)} disabled={saving}>{saving?"Saving...":"CONTINUE"}</button>
        </div>
      </div>
    </main>
    <style>{STYLE}</style>
  </div>)
}

function MF({label,fkey,fields,set,full=false}:any){return <div className="field" style={full?{flex:"1 1 100%"}:{}}><label>{label}</label><div className="money"><span>$</span><input type="number" step="0.01" min="0" value={fields[fkey]||""} onChange={(e:any)=>set(fkey,e.target.value)} /></div></div>}
function TF({label,fkey,fields,set,full=false}:any){return <div className="field" style={full?{flex:"1 1 100%"}:{}}><label>{label}</label><input value={fields[fkey]||""} onChange={(e:any)=>set(fkey,e.target.value)} /></div>}
function SF({label,fkey,fields,set,options}:any){return <div className="field"><label>{label}</label><select value={fields[fkey]||""} onChange={(e:any)=>set(fkey,e.target.value)}><option value="">Select...</option>{options.map((o:string)=><option key={o}>{o}</option>)}</select></div>}

const STYLE=`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');*{box-sizing:border-box;margin:0;padding:0}.root{display:flex;min-height:100vh;font-family:'DM Sans',sans-serif;background:#f8fafc}.main{flex:1;margin-left:220px;padding:24px 36px;display:flex;flex-direction:column;gap:16px}.title{font-size:22px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:10px}.ref{font-size:12px;font-weight:400;color:#94a3b8;background:#f1f5f9;padding:2px 8px;border-radius:10px}.whose-row{display:flex;gap:0;background:#fff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;width:fit-content}.whose-btn{background:none;border:none;padding:8px 20px;font-size:13px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;color:#64748b}.whose-btn.active{background:#1e3a5f;color:#fff}.card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;display:flex;flex-direction:column;gap:14px}.card h2{font-size:14px;font-weight:600;color:#0f172a}.row{display:flex;gap:12px;flex-wrap:wrap}.field{display:flex;flex-direction:column;gap:5px;flex:1;min-width:160px}.field label{font-size:12px;font-weight:500;color:#374151}.field input,.field select{padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:7px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none}.field input:focus{border-color:#3b82f6}.money{display:flex;align-items:center;border:1.5px solid #e2e8f0;border-radius:7px;overflow:hidden}.money span{padding:8px 10px;background:#f8fafc;font-size:13px;color:#64748b;border-right:1px solid #e2e8f0}.money input{border:none;padding:8px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;flex:1}.footer{display:flex;justify-content:space-between;align-items:center}.cancel-btn{background:none;border:1.5px solid #e2e8f0;color:#64748b;padding:9px 20px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}.save-another-btn{background:#f1f5f9;border:none;color:#1e3a5f;padding:9px 20px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}.continue-btn{background:#1e3a5f;color:#fff;border:none;padding:9px 24px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}.continue-btn:disabled{opacity:0.5;cursor:not-allowed}.note{font-size:12px;color:#64748b}`
