"use client"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../../../ReturnNav"
import { EINField } from "../../../../../../components/TaxFields"

export default function Form8863Page() {
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
        <h1 className="title">Form 8863 <span className="ref">Education Credits (AOC & LLC)</span></h1>

        <div className="card">
          <h2>Student Information</h2>
          <p className="note">American Opportunity Credit (AOC): Up to $2,500 per eligible student, first 4 years only. 40% refundable. Lifetime Learning Credit (LLC): Up to $2,000 per return, no year limit.</p>
          <div className="row">
            <TF label="Student name" fkey="studentName" fields={fields} set={set} />
            <TF label="Student SSN" fkey="studentSSN" fields={fields} set={set} />
          </div>
          <div className="row">
            <SF label="Credit type" fkey="creditType" fields={fields} set={set} options={["American Opportunity Credit (AOC)","Lifetime Learning Credit (LLC)"]} />
            <SF label="Academic period" fkey="academicPeriod" fields={fields} set={set} options={["Full year","Spring only","Fall only"]} />
          </div>
          <div className="row">
            <CB label="Student was at least half-time for at least one academic period" fkey="halfTime" fields={fields} set={set} />
            <CB label="Student has not completed first 4 years of higher education (AOC only)" fkey="firstFourYears" fields={fields} set={set} />
          </div>
        </div>
        <div className="card">
          <h2>Education Expenses</h2>
          <div className="row">
            <MF label="Tuition and fees paid" fkey="tuition" fields={fields} set={set} />
            <MF label="Books and supplies (AOC only)" fkey="booksSupplies" fields={fields} set={set} />
          </div>
          <div className="row">
            <MF label="Scholarships/grants received (reduces eligible expenses)" fkey="scholarships" fields={fields} set={set} />
            <MF label="AGI (Form 1040 line 11)" fkey="agi" fields={fields} set={set} />
            <SF label="Filing status" fkey="filingStatus" fields={fields} set={set} options={["SINGLE","MARRIED_FILING_JOINTLY","HEAD_OF_HOUSEHOLD"]} />
          </div>
        </div>
        <div className="card">
          <h2>Credit Calculation</h2>
          {(() => {
            const tuition = parseFloat(fields.tuition||"0")
            const books = parseFloat(fields.booksSupplies||"0")
            const scholarships = parseFloat(fields.scholarships||"0")
            const agi = parseFloat(fields.agi||"0")
            const fs = fields.filingStatus||"SINGLE"
            const creditType = fields.creditType||""
            const eligible = Math.max(0, tuition + (creditType.includes("AOC") ? books : 0) - scholarships)
            let credit = 0
            let refundable = 0
            if (creditType.includes("AOC")) {
              const base = Math.min(eligible, 4000)
              credit = base <= 2000 ? base : 2000 + (base - 2000) * 0.25
              credit = Math.min(credit, 2500)
              // Phase-out
              const phaseoutStart = fs === "MARRIED_FILING_JOINTLY" ? 160000 : 80000
              const phaseoutEnd = fs === "MARRIED_FILING_JOINTLY" ? 180000 : 90000
              if (agi > phaseoutEnd) credit = 0
              else if (agi > phaseoutStart) credit = credit * (1 - (agi - phaseoutStart)/(phaseoutEnd - phaseoutStart))
              refundable = credit * 0.40
            } else if (creditType.includes("LLC")) {
              const base = Math.min(eligible, 10000)
              credit = base * 0.20
              const phaseoutStart = fs === "MARRIED_FILING_JOINTLY" ? 160000 : 80000
              const phaseoutEnd = fs === "MARRIED_FILING_JOINTLY" ? 180000 : 90000
              if (agi > phaseoutEnd) credit = 0
              else if (agi > phaseoutStart) credit = credit * (1 - (agi - phaseoutStart)/(phaseoutEnd - phaseoutStart))
            }
            return credit > 0 ? (
              <div className="calc-box">
                <div className="calc-row"><span>Eligible expenses</span><span>${eligible.toFixed(2)}</span></div>
                <div className="calc-row total" style={{color:"#16a34a"}}><span>Education Credit</span><span>${credit.toFixed(2)}</span></div>
                {refundable > 0 && <div className="calc-row" style={{color:"#2563eb"}}><span>Refundable portion (40%)</span><span>${refundable.toFixed(2)}</span></div>}
              </div>
            ) : <div className="calc-box"><div className="calc-row"><span>Enter expenses and AGI to calculate credit</span><span></span></div></div>
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