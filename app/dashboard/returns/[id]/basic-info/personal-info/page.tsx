"use client"
import React, { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../../ReturnNav"
import AddressField from "../../../../../components/AddressField"

const SUFFIXES = ["--","Jr","Sr","II","III","IV"]
const LANGUAGES = ["Spanish","Chinese","Vietnamese","Korean","Russian","Arabic","Tagalog","French","Polish","Portuguese"]
const MEDIA = ["Braille","Large Print","Audio"]
const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"]

function SSNField({ label, value, onChange }: { label:string; value:string; onChange:(v:string)=>void }) {
  const [show, setShow] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 9)
    onChange(digits)
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <label style={{fontSize:13,fontWeight:500,color:"#374151"}}>{label}</label>
      <div style={{display:"flex",alignItems:"center",border:"1.5px solid #e2e8f0",borderRadius:7,overflow:"hidden",background:"#fff"}}>
        <input
          ref={inputRef}
          style={{flex:1,border:"none",padding:"9px 12px",fontSize:14,fontFamily:"DM Sans,sans-serif",outline:"none",letterSpacing:3,background:"transparent",minWidth:0}}
          type={show ? "text" : "password"}
          value={value}
          onChange={handleChange}
          placeholder="123456789"
          inputMode="numeric"
          autoComplete="off"
        />
        <button type="button" style={{background:"none",border:"none",padding:"0 12px",cursor:"pointer",fontSize:18,color:"#94a3b8",display:"flex",alignItems:"center",flexShrink:0}} onClick={() => setShow(s=>!s)}>
          {show ? "🙈" : "👁"}
        </button>
        {value.length===9 && <span style={{color:"#16a34a",fontWeight:700,paddingRight:10,fontSize:14}}>✓</span>}
      </div>
      {value.length>0 && value.length<9 && <span style={{fontSize:11,color:"#f59e0b"}}>{9-value.length} more digit{9-value.length!==1?"s":""} needed</span>}
    </div>
  )
}

function EINField({ label, value, onChange }: { label:string; value:string; onChange:(v:string)=>void }) {
  const [show, setShow] = React.useState(false)
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 9)
    onChange(digits)
  }
  function format(d: string) {
    if (d.length <= 2) return d
    return d.slice(0,2) + '-' + d.slice(2)
  }
  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <label style={{fontSize:13,fontWeight:500,color:"#374151"}}>{label}</label>
      <div style={{display:"flex",alignItems:"center",border:"1.5px solid #e2e8f0",borderRadius:7,overflow:"hidden",background:"#fff"}}>
        <input
          style={{flex:1,border:"none",padding:"9px 12px",fontSize:14,fontFamily:"DM Sans,sans-serif",outline:"none",letterSpacing:2,background:"transparent",minWidth:0}}
          type={show ? "text" : "password"}
          value={show ? format(value) : value}
          onChange={handleChange}
          placeholder="XX-XXXXXXX"
          inputMode="numeric"
          autoComplete="off"
        />
        <button type="button" style={{background:"none",border:"none",padding:"0 12px",cursor:"pointer",fontSize:18,color:"#94a3b8",display:"flex",alignItems:"center",flexShrink:0}} onClick={() => setShow(s=>!s)}>
          {show ? "🙈" : "👁"}
        </button>
        {value.length===9 && <span style={{color:"#16a34a",fontWeight:700,paddingRight:10,fontSize:14}}>✓</span>}
      </div>
      {value.length>0 && value.length<9 && <span style={{fontSize:11,color:"#f59e0b"}}>{9-value.length} more digit{9-value.length!==1?"s":""} needed</span>}
    </div>
  )
}

export default function PersonalInfoPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const base = `/dashboard/returns/${id}`
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    firstName:"",mi:"",lastName:"",suffix:"--",ssn:"",dob:"",occupation:"",
    isDependent:false,isStudent:false,isBlind:false,isDeceased:false,dateOfDeath:"",
    presidentialFund:false,combatZone:false,naturalDisaster:false,disasterDesignation:"",
    digitalAssets:false,nonEnglish:false,language:"",accessibleFormat:false,media:"",
    nonresidentAlien:false,ssnNotValidEIC:false,
    spouseFirstName:"",spouseMI:"",spouseLastName:"",spouseSuffix:"--",
    spouseSSN:"",spouseDOB:"",spouseOccupation:"",
    spouseIsBlind:false,spouseIsDeceased:false,spouseDateOfDeath:"",
    militaryAddress:false,foreignAddress:false,
    address:"",city:"",state:"",zip:"",
    foreignProvince:"",foreignCountry:"",foreignPostalCode:"",foreignPhone:"",
    daytimePhone:"",secondaryPhone:"",email:"",invitePortal:false,
  })
  function set(f: string, v: any) { setForm(p=>({...p,[f]:v})) }

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/returns/${id}/personal-info`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)})
    setSaving(false)
    router.push(`${base}/basic-info`)
  }

  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={2025} />
      <main className="main">
        <div className="page-header">
          <h1>Personal Information</h1>
          <button className="fs-btn" onClick={()=>router.push(`${base}/basic-info/filing-status`)}>FILING STATUS</button>
        </div>
        <div className="actions">
          <button className="cancel-btn" onClick={()=>router.push(`${base}/basic-info`)}>CANCEL</button>
          <div className="r"><button className="save-btn" onClick={handleSave} disabled={saving}>SAVE & ENTER ANOTHER</button><button className="continue-btn" onClick={handleSave} disabled={saving}>{saving?"Saving...":"CONTINUE"}</button></div>
        </div>

        <section className="card">
          <h2 className="stitle">Taxpayer Information</h2>
          <div className="row">
            <F label="Primary taxpayer first name *" value={form.firstName} onChange={v=>set("firstName",v)} f={2} />
            <F label="MI" value={form.mi} onChange={v=>set("mi",v)} mw={60} ml={1} />
          </div>
          <div className="row">
            <F label="Last name *" value={form.lastName} onChange={v=>set("lastName",v)} f={2} />
            <div className="field" style={{maxWidth:120}}><label>Suffix</label><select value={form.suffix} onChange={e=>set("suffix",e.target.value)}>{SUFFIXES.map(s=><option key={s}>{s}</option>)}</select></div>
          </div>
          <SSNField label="SSN *" value={form.ssn} onChange={v=>set("ssn",v)} />
          <div className="row">
            <F label="Date of Birth *" value={form.dob} onChange={v=>set("dob",v)} type="date" />
            <F label="Occupation" value={form.occupation} onChange={v=>set("occupation",v)} />
          </div>
          <div className="cbs">
            <CB label="Taxpayer can be claimed as a dependent on someone else's return." c={form.isDependent} o={v=>set("isDependent",v)} />
            <CB label="Taxpayer was over age 18 and a full-time student at an eligible educational institution." c={form.isStudent} o={v=>set("isStudent",v)} />
            <CB label="Taxpayer is blind." c={form.isBlind} o={v=>set("isBlind",v)} />
            <CB label="Taxpayer is deceased." c={form.isDeceased} o={v=>set("isDeceased",v)} />
            {form.isDeceased && <F label="Date of Death *" value={form.dateOfDeath} onChange={v=>set("dateOfDeath",v)} type="date" indent />}
            <CB label="Taxpayer wishes to contribute $3 to the Presidential Election Campaign Fund." c={form.presidentialFund} o={v=>set("presidentialFund",v)} />
            <CB label="Taxpayer or spouse served in a combat zone during the current tax year." c={form.combatZone} o={v=>set("combatZone",v)} />
            <CB label="Taxpayer or spouse was affected by a natural disaster during the current tax year." c={form.naturalDisaster} o={v=>set("naturalDisaster",v)} />
            {form.naturalDisaster && <F label="Disaster Designation *" value={form.disasterDesignation} onChange={v=>set("disasterDesignation",v)} indent />}
            <CB label="Taxpayer received, sold, or disposed of a digital asset in the current tax year." c={form.digitalAssets} o={v=>set("digitalAssets",v)} />
            <CB label="Taxpayer prefers to receive written communications from the IRS in a language other than English." c={form.nonEnglish} o={v=>set("nonEnglish",v)} />
            {form.nonEnglish && <div className="field indent"><label>Language *</label><select value={form.language} onChange={e=>set("language",e.target.value)}><option value="">Select...</option>{LANGUAGES.map(l=><option key={l}>{l}</option>)}</select></div>}
            <CB label="Taxpayer prefers to receive written communications from the IRS in an accessible format." c={form.accessibleFormat} o={v=>set("accessibleFormat",v)} />
            {form.accessibleFormat && <div className="field indent"><label>Media *</label><select value={form.media} onChange={e=>set("media",e.target.value)}><option value="">Select...</option>{MEDIA.map(m=><option key={m}>{m}</option>)}</select></div>}
            <CB label="Taxpayer is treating a nonresident alien or dual-status alien spouse as a U.S. resident for the entire tax year." c={form.nonresidentAlien} o={v=>set("nonresidentAlien",v)} />
            <CB label="SSN not Valid for EIC / Employment" c={form.ssnNotValidEIC} o={v=>set("ssnNotValidEIC",v)} />
          </div>
        </section>

        <section className="card">
          <h2 className="stitle">Address and Phone Number</h2>
          <div className="cbs">
            <CB label="I have stateside military address" c={form.militaryAddress} o={v=>set("militaryAddress",v)} />
            <CB label="Check here if foreign address" c={form.foreignAddress} o={v=>set("foreignAddress",v)} />
          </div>
          {!form.foreignAddress ? (<>
            <AddressField label="Address *" required value={form.address} onChange={p=>{set("address",p.street);set("city",p.city);set("state",p.state);set("zip",p.zip)}} />
            <div className="row">
              <F label="City" value={form.city} onChange={v=>set("city",v)} f={2} />
              <div className="field" style={{maxWidth:80}}><label>State</label><select value={form.state} onChange={e=>set("state",e.target.value)}><option value=""></option>{STATES.map(s=><option key={s}>{s}</option>)}</select></div>
              <F label="ZIP" value={form.zip} onChange={v=>set("zip",v)} mw={120} ml={10} />
            </div>
          </>) : (<>
            <div className="row"><F label="Foreign Province" value={form.foreignProvince} onChange={v=>set("foreignProvince",v)} /><F label="Foreign Country *" value={form.foreignCountry} onChange={v=>set("foreignCountry",v)} /></div>
            <div className="row"><F label="Postal Code" value={form.foreignPostalCode} onChange={v=>set("foreignPostalCode",v)} /><F label="Foreign Phone" value={form.foreignPhone} onChange={v=>set("foreignPhone",v)} /></div>
          </>)}
          <div className="row">
            <F label="Daytime Phone *" value={form.daytimePhone} onChange={v=>set("daytimePhone",v)} />
            <F label="Secondary Phone" value={form.secondaryPhone} onChange={v=>set("secondaryPhone",v)} />
          </div>
          <F label="Primary Client Email" value={form.email} onChange={v=>set("email",v)} type="email" />
          <CB label="Invite to Customer Portal" c={form.invitePortal} o={v=>set("invitePortal",v)} />
        </section>

        <section className="card">
          <h2 className="stitle">Spouse Information</h2>
          <div className="row">
            <F label="Spouse first name *" value={form.spouseFirstName} onChange={v=>set("spouseFirstName",v)} f={2} />
            <F label="MI" value={form.spouseMI} onChange={v=>set("spouseMI",v)} mw={60} ml={1} />
          </div>
          <div className="row">
            <F label="Last name *" value={form.spouseLastName} onChange={v=>set("spouseLastName",v)} f={2} />
            <div className="field" style={{maxWidth:120}}><label>Suffix</label><select value={form.spouseSuffix} onChange={e=>set("spouseSuffix",e.target.value)}>{SUFFIXES.map(s=><option key={s}>{s}</option>)}</select></div>
          </div>
          <SSNField label="Spouse SSN *" value={form.spouseSSN} onChange={v=>set("spouseSSN",v)} />
          <div className="row">
            <F label="Date of Birth *" value={form.spouseDOB} onChange={v=>set("spouseDOB",v)} type="date" />
            <F label="Occupation" value={form.spouseOccupation} onChange={v=>set("spouseOccupation",v)} />
          </div>
          <CB label="Spouse is blind." c={form.spouseIsBlind} o={v=>set("spouseIsBlind",v)} />
          <CB label="Spouse is deceased." c={form.spouseIsDeceased} o={v=>set("spouseIsDeceased",v)} />
          {form.spouseIsDeceased && <F label="Date of Death *" value={form.spouseDateOfDeath} onChange={v=>set("spouseDateOfDeath",v)} type="date" indent />}
        </section>

        <div className="actions">
          <button className="cancel-btn" onClick={()=>router.push(`${base}/basic-info`)}>CANCEL</button>
          <div className="r"><button className="save-btn" onClick={handleSave} disabled={saving}>SAVE & ENTER ANOTHER</button><button className="continue-btn" onClick={handleSave} disabled={saving}>{saving?"Saving...":"CONTINUE"}</button></div>
        </div>
      </main>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .root{display:flex;min-height:100vh;font-family:'DM Sans',sans-serif;background:#f8fafc}
        .main{flex:1;margin-left:220px;padding:28px 40px;display:flex;flex-direction:column;gap:20px}
        .page-header{display:flex;align-items:center;gap:16px}
        .page-header h1{font-size:22px;font-weight:600;color:#0f172a}
        .fs-btn{background:#1e3a5f;color:#fff;border:none;padding:8px 18px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer}
        .actions{display:flex;justify-content:space-between;align-items:center}
        .r{display:flex;gap:10px}
        .cancel-btn{background:#1e3a5f;color:#fff;border:none;padding:9px 20px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer}
        .save-btn{background:#fff;border:1.5px solid #1e3a5f;color:#1e3a5f;padding:9px 20px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer}
        .continue-btn{background:#1e3a5f;color:#fff;border:none;padding:9px 20px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer}
        .cancel-btn:hover,.continue-btn:hover{background:#1e40af}
        .card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:24px;display:flex;flex-direction:column;gap:16px}
        .stitle{font-size:15px;font-weight:600;color:#0f172a;padding-bottom:12px;border-bottom:1px solid #f1f5f9}
        .row{display:flex;gap:14px;align-items:flex-end}
        .field{display:flex;flex-direction:column;gap:6px;flex:1}
        .field.indent{margin-left:28px}
        .field label{font-size:13px;font-weight:500;color:#374151}
        .field input,.field select{padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:7px;font-size:14px;font-family:'DM Sans',sans-serif;outline:none}
        .field input:focus,.field select:focus{border-color:#3b82f6}
        .cbs{display:flex;flex-direction:column;gap:10px}
      `}</style>
    </div>
  )
}
function F({ label, value, onChange, type, f, mw, ml, indent }: any) {
  return (
    <div className={`field${indent?" indent":""}`} style={{...(f?{flex:f}:{}), ...(mw?{maxWidth:mw}:{})}}>
      <label>{label}</label>
      <input type={type||"text"} value={value} onChange={e=>onChange(e.target.value)} maxLength={ml ?? 524288} />
    </div>
  )
}
function CB({ label, c, o }: any) {
  return <label style={{display:"flex",alignItems:"flex-start",gap:8,cursor:"pointer",fontSize:14,color:"#374151",lineHeight:1.5}}><input type="checkbox" checked={c} onChange={e=>o(e.target.checked)} style={{marginTop:2,flexShrink:0}} />{label}</label>
}
