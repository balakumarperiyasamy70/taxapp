"use client"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../../ReturnNav"
import AddressField from "../../../../../components/AddressField"
import { SSNField } from "../../../../../components/TaxFields"


const RELATIONSHIPS = ["Son","Daughter","Stepson","Stepdaughter","Foster Child","Brother","Sister","Half Brother","Half Sister","Stepbrother","Stepsister","Father","Mother","Grandchild","Grandparent","Uncle","Aunt","Nephew","Niece","Other"]
const MONTHS = Array.from({length:12},(_,i)=>i+1)

interface Dependent {
  firstName:string;mi:string;lastName:string;dob:string;ssn:string;noSSN:boolean
  usCitizen:boolean;relationship:string;monthsLived:number
  isStudent:boolean;isDisabled:boolean;notYourDependent:boolean
  notEIC:boolean;marriedFilingJoint:boolean;incomeOver5200:boolean
  multipleSupport:boolean;ssnNotValidEmployment:boolean
}

const NEW_DEP: Dependent = {
  firstName:"",mi:"",lastName:"",dob:"",ssn:"",noSSN:false,
  usCitizen:true,relationship:"",monthsLived:12,
  isStudent:false,isDisabled:false,notYourDependent:false,
  notEIC:false,marriedFilingJoint:false,incomeOver5200:false,
  multipleSupport:false,ssnNotValidEmployment:false,
}

export default function DependentsPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const base = `/dashboard/returns/${id}`
  const [dependents, setDependents] = useState<Dependent[]>([])
  const [editing, setEditing] = useState<Dependent | null>(null)
  const [saving, setSaving] = useState(false)

  function set(field: string, val: any) { setEditing(e => e ? { ...e, [field]: val } : null) }

  async function handleSave(andAnother = false) {
    if (!editing) return
    setSaving(true)
    await fetch(`/api/returns/${id}/dependents`, {
      method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(editing),
    })
    setDependents(d => [...d, editing])
    setSaving(false)
    if (andAnother) setEditing({ ...NEW_DEP })
    else setEditing(null)
  }

  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={2025} />
      <main className="main">
        <h1 className="title">Dependents / Qualifying Person</h1>

        {dependents.length > 0 && (
          <div className="dep-list">
            {dependents.map((d,i) => (
              <div key={i} className="dep-row">
                <div className="dep-avatar">{d.firstName[0]}{d.lastName[0]}</div>
                <div className="dep-info">
                  <div className="dep-name">{d.firstName} {d.lastName}</div>
                  <div className="dep-meta">{d.relationship} · DOB: {d.dob}</div>
                </div>
                <button className="edit-btn" onClick={() => setEditing(d)}>Edit</button>
              </div>
            ))}
          </div>
        )}

        {!editing && (
          <button className="add-btn" onClick={() => setEditing({ ...NEW_DEP })}>+ Add Dependent / Qualifying Person</button>
        )}

        {editing && (
          <div className="card">
            <div className="top-bar">
              <button className="cancel-btn" onClick={() => setEditing(null)}>CANCEL</button>
              <div className="right">
                <button className="save-another-btn" onClick={() => handleSave(true)} disabled={saving}>SAVE & ENTER ANOTHER</button>
                <button className="continue-btn" onClick={() => handleSave(false)} disabled={saving}>{saving?"Saving...":"CONTINUE"}</button>
              </div>
            </div>

            <div className="form-row">
              <Field label="First name *" value={editing.firstName} onChange={v => set("firstName",v)} />
              <Field label="MI" value={editing.mi} onChange={v => set("mi",v)} style={{maxWidth:60}} maxLength={1} />
              <Field label="Last name *" value={editing.lastName} onChange={v => set("lastName",v)} />
            </div>
            <Field label="Date of birth *" value={editing.dob} onChange={v => set("dob",v)} type="date" />

            {!editing.noSSN && (
              <SSNInput
                label="Social Security number (ITIN & ATIN also accepted)"
                required
                value={editing.ssn}
                onChange={v => set("ssn",v)}
              />
            )}
            <CB label="Check box if the dependent does not have an SSN/ITIN/ATIN" checked={editing.noSSN} onChange={v => set("noSSN",v)} />

            <div className="field">
              <label>Was this individual a U.S. citizen, U.S. national, or U.S. resident alien? *</label>
              <div className="radio-row">
                <Radio label="Yes" checked={editing.usCitizen} onChange={() => set("usCitizen",true)} />
                <Radio label="No" checked={!editing.usCitizen} onChange={() => set("usCitizen",false)} />
              </div>
            </div>

            <div className="form-row">
              <div className="field">
                <label>Relationship *</label>
                <select value={editing.relationship} onChange={e => set("relationship",e.target.value)}>
                  <option value="">Select...</option>
                  {RELATIONSHIPS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Months lived in your home during 2025</label>
                <select value={editing.monthsLived} onChange={e => set("monthsLived",Number(e.target.value))}>
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <span className="note">If born in 2025, select 12</span>
              </div>
            </div>

            <div className="section-label">Check All That Apply:</div>
            <div className="checkboxes">
              <CB label="This person was over age 18 and a full-time student at an eligible educational institution." checked={editing.isStudent} onChange={v => set("isStudent",v)} />
              <CB label="Check if this person was DISABLED." checked={editing.isDisabled} onChange={v => set("isDisabled",v)} />
              <CB label="Check if this qualifying child is NOT YOUR DEPENDENT." checked={editing.notYourDependent} onChange={v => set("notYourDependent",v)} />
              <CB label="Check if you wish to NOT claim this dependent for Earned Income Credit purposes." checked={editing.notEIC} onChange={v => set("notEIC",v)} />
              <CB label="Check if this dependent is married and filing a joint return." checked={editing.marriedFilingJoint} onChange={v => set("marriedFilingJoint",v)} />
              <CB label="This individual made over $5,200 of income" checked={editing.incomeOver5200} onChange={v => set("incomeOver5200",v)} />
              <CB label="This dependent qualifies for a Multiple Support Declaration." checked={editing.multipleSupport} onChange={v => set("multipleSupport",v)} />
              <CB label="Check if this qualifying person has a SSN that is not valid for employment" checked={editing.ssnNotValidEmployment} onChange={v => set("ssnNotValidEmployment",v)} />
            </div>

            <div className="top-bar">
              <button className="cancel-btn" onClick={() => setEditing(null)}>CANCEL</button>
              <div className="right">
                <button className="save-another-btn" onClick={() => handleSave(true)} disabled={saving}>SAVE & ENTER ANOTHER</button>
                <button className="continue-btn" onClick={() => handleSave(false)} disabled={saving}>{saving?"Saving...":"CONTINUE"}</button>
              </div>
            </div>
          </div>
        )}

        <div className="footer">
          <button className="back-btn" onClick={() => router.push(`${base}/basic-info`)}>BACK</button>
          <button className="continue-btn" onClick={() => router.push(`${base}/basic-info`)}>CONTINUE</button>
        </div>
      </main>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .root{display:flex;min-height:100vh;font-family:'DM Sans',sans-serif;background:#f8fafc}
        .main{flex:1;margin-left:220px;padding:28px 40px;display:flex;flex-direction:column;gap:18px}
        .title{font-size:22px;font-weight:600;color:#0f172a}
        .dep-list{background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}
        .dep-row{display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid #f1f5f9}
        .dep-row:last-child{border-bottom:none}
        .dep-avatar{width:36px;height:36px;border-radius:50%;background:#1e40af;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;flex-shrink:0}
        .dep-info{flex:1}
        .dep-name{font-weight:500;color:#0f172a;font-size:14px}
        .dep-meta{font-size:12px;color:#94a3b8;margin-top:1px}
        .edit-btn{background:none;border:1px solid #e2e8f0;padding:5px 12px;border-radius:6px;font-size:12px;cursor:pointer;color:#64748b;font-family:'DM Sans',sans-serif}
        .add-btn{align-self:flex-start;background:#1e3a5f;color:#fff;border:none;padding:10px 20px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
        .card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:24px;display:flex;flex-direction:column;gap:16px}
        .top-bar{display:flex;justify-content:space-between;align-items:center}
        .right{display:flex;gap:10px}
        .cancel-btn,.back-btn{background:#1e3a5f;color:#fff;border:none;padding:9px 18px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
        .save-another-btn{background:#fff;border:1.5px solid #1e3a5f;color:#1e3a5f;padding:9px 14px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
        .continue-btn{background:#1e3a5f;color:#fff;border:none;padding:9px 18px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
        .cancel-btn:hover,.continue-btn:hover,.back-btn:hover{background:#1e40af}
        .form-row{display:flex;gap:12px;align-items:flex-end}
        .field{display:flex;flex-direction:column;gap:5px;flex:1}
        .field label{font-size:13px;font-weight:500;color:#374151}
        .field input,.field select{padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:7px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none}
        .field input:focus,.field select:focus{border-color:#3b82f6}
        .note{font-size:11px;color:#94a3b8}
        .radio-row{display:flex;gap:20px}
        .section-label{font-size:13px;font-weight:600;color:#374151}
        .checkboxes{display:flex;flex-direction:column;gap:10px}
        .footer{display:flex;justify-content:space-between}
      `}</style>
    </div>
  )
}
function Field({ label, value, onChange, type, style, maxLength }: any) {
  return <div className="field" style={style}><label>{label}</label><input type={type||"text"} value={value} onChange={e => onChange(e.target.value)} maxLength={maxLength} /></div>
}
function Radio({ label, checked, onChange }: any) {
  return <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:14,color:"#374151"}}><input type="radio" checked={checked} onChange={onChange} />{label}</label>
}
function CB({ label, checked, onChange }: any) {
  return <label style={{display:"flex",alignItems:"flex-start",gap:8,cursor:"pointer",fontSize:13,color:"#374151",lineHeight:1.5}}><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{marginTop:2,flexShrink:0}} />{label}</label>
}
