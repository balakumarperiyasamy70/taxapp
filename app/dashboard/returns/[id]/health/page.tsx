"use client"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../ReturnNav"

export default function HealthInsurancePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const base = `/dashboard/returns/${id}`
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    // Coverage questions
    hadCoverageAllYear: null as boolean | null,
    hadMarketplaceCoverage: false,
    // 1095-A entries (can have multiple)
    forms1095A: [{
      marketplace: "",
      policyNumber: "",
      issuerName: "",
      // Monthly detail
      months: Array.from({length:12}, (_, i) => ({
        month: i+1,
        enrollmentPremium: "",
        slcsp: "",
        advancedPTC: "",
      })),
      useAnnual: true,
      annualEnrollmentPremium: "",
      annualSLCSP: "",
      annualAdvancedPTC: "",
    }],
    // Exemptions
    hasExemption: false,
    exemptionType: "",
    exemptionCode: "",
    // Short coverage gap
    shortGap: false,
    gapMonths: [] as number[],
  })

  function set(f: string, v: any) { setForm(p => ({ ...p, [f]: v })) }

  function update1095A(i: number, field: string, val: any) {
    setForm(p => ({
      ...p,
      forms1095A: p.forms1095A.map((f, idx) => idx === i ? { ...f, [field]: val } : f)
    }))
  }

  function updateMonth(formIdx: number, monthIdx: number, field: string, val: string) {
    setForm(p => ({
      ...p,
      forms1095A: p.forms1095A.map((f, fi) => fi !== formIdx ? f : {
        ...f,
        months: f.months.map((m, mi) => mi !== monthIdx ? m : { ...m, [field]: val })
      })
    }))
  }

  function addForm1095A() {
    setForm(p => ({
      ...p,
      forms1095A: [...p.forms1095A, {
        marketplace: "", policyNumber: "", issuerName: "",
        months: Array.from({length:12}, (_, i) => ({ month: i+1, enrollmentPremium: "", slcsp: "", advancedPTC: "" })),
        useAnnual: true, annualEnrollmentPremium: "", annualSLCSP: "", annualAdvancedPTC: "",
      }]
    }))
  }

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  const EXEMPTION_TYPES = [
    "Religious conscience exemption",
    "Health care sharing ministry member",
    "Member of federally recognized tribe",
    "Incarcerated",
    "Not lawfully present",
    "Unaffordable coverage",
    "Income below filing threshold",
    "Hardship exemption",
    "Short coverage gap (less than 3 months)",
  ]

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/returns/${id}/health`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    router.push(`${base}/state`)
  }

  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={2025} />
      <main className="main">
        <h1 className="title">Health Insurance</h1>

        {/* Coverage question */}
        <div className="card">
          <h2>Health Coverage Status <span className="ref">Form 1040</span></h2>
          <p className="note">The ACA individual mandate penalty was eliminated after 2018 at the federal level. However you still need to report coverage for premium tax credit reconciliation.</p>

          <div className="field">
            <label>Did everyone in your household have health coverage for all 12 months of 2025?</label>
            <div className="radio-row">
              <Radio label="Yes — full year coverage" checked={form.hadCoverageAllYear === true} onChange={() => set("hadCoverageAllYear", true)} />
              <Radio label="No — had gaps or no coverage" checked={form.hadCoverageAllYear === false} onChange={() => set("hadCoverageAllYear", false)} />
            </div>
          </div>

          {form.hadCoverageAllYear === false && (
            <div className="field">
              <label>Did anyone obtain coverage through the Health Insurance Marketplace (Exchange)?</label>
              <div className="radio-row">
                <Radio label="Yes" checked={form.hadMarketplaceCoverage} onChange={() => set("hadMarketplaceCoverage", true)} />
                <Radio label="No" checked={!form.hadMarketplaceCoverage} onChange={() => set("hadMarketplaceCoverage", false)} />
              </div>
            </div>
          )}
        </div>

        {/* Form 1095-A */}
        {(form.hadMarketplaceCoverage || form.hadCoverageAllYear === true) && (
          <>
            <div className="card">
              <div className="section-header">
                <div>
                  <h2>Form 1095-A — Health Insurance Marketplace Statement <span className="ref">Form 8962</span></h2>
                  <p className="note">Enter information from each Form 1095-A you received. This is used to calculate your Premium Tax Credit (PTC) or reconcile Advanced PTC received.</p>
                </div>
              </div>

              {form.forms1095A.map((f1095, fi) => (
                <div key={fi} className="form-1095a">
                  {form.forms1095A.length > 1 && <div className="form-label">Form 1095-A #{fi + 1}</div>}

                  <div className="form-row">
                    <Field label="Marketplace (e.g. healthcare.gov)" value={f1095.marketplace} onChange={v => update1095A(fi, "marketplace", v)} />
                    <Field label="Policy Number" value={f1095.policyNumber} onChange={v => update1095A(fi, "policyNumber", v)} />
                    <Field label="Issuer Name" value={f1095.issuerName} onChange={v => update1095A(fi, "issuerName", v)} />
                  </div>

                  <div className="entry-toggle">
                    <button className={`toggle-btn ${f1095.useAnnual ? "active" : ""}`} onClick={() => update1095A(fi, "useAnnual", true)}>Annual totals</button>
                    <button className={`toggle-btn ${!f1095.useAnnual ? "active" : ""}`} onClick={() => update1095A(fi, "useAnnual", false)}>Monthly detail</button>
                  </div>

                  {f1095.useAnnual ? (
                    <div className="form-row">
                      <MF label="Annual enrollment premiums (Col A)" value={f1095.annualEnrollmentPremium} onChange={v => update1095A(fi, "annualEnrollmentPremium", v)} />
                      <MF label="Annual SLCSP premium (Col B)" value={f1095.annualSLCSP} onChange={v => update1095A(fi, "annualSLCSP", v)} />
                      <MF label="Annual advance PTC (Col C)" value={f1095.annualAdvancedPTC} onChange={v => update1095A(fi, "annualAdvancedPTC", v)} />
                    </div>
                  ) : (
                    <div className="monthly-grid">
                      <div className="month-header">
                        <span>Month</span>
                        <span>Col A — Enrollment Premium</span>
                        <span>Col B — SLCSP Premium</span>
                        <span>Col C — Advance PTC</span>
                      </div>
                      {f1095.months.map((m, mi) => (
                        <div key={mi} className="month-row">
                          <span className="month-name">{MONTHS[mi]}</span>
                          <MF label="" value={m.enrollmentPremium} onChange={v => updateMonth(fi, mi, "enrollmentPremium", v)} />
                          <MF label="" value={m.slcsp} onChange={v => updateMonth(fi, mi, "slcsp", v)} />
                          <MF label="" value={m.advancedPTC} onChange={v => updateMonth(fi, mi, "advancedPTC", v)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <button className="add-btn" onClick={addForm1095A}>+ Add another Form 1095-A</button>
            </div>
          </>
        )}

        {/* Exemptions */}
        {form.hadCoverageAllYear === false && (
          <div className="card">
            <h2>Coverage Exemptions</h2>
            <CB label="Claim a coverage exemption for months without coverage" checked={form.hasExemption} onChange={v => set("hasExemption", v)} />
            {form.hasExemption && (
              <>
                <div className="field">
                  <label>Exemption type</label>
                  <select value={form.exemptionType} onChange={e => set("exemptionType", e.target.value)}>
                    <option value="">Select...</option>
                    {EXEMPTION_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Exemption certificate number (if applicable)</label>
                  <input value={form.exemptionCode} onChange={e => set("exemptionCode", e.target.value)} placeholder="ECN from marketplace" style={{maxWidth:200}} />
                </div>
              </>
            )}
          </div>
        )}

        <div className="nav-footer">
          <button className="back-btn" onClick={() => router.push(`${base}/federal/payments`)}>BACK</button>
          <button className="continue-btn" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "CONTINUE"}</button>
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .root{display:flex;min-height:100vh;font-family:'DM Sans',sans-serif;background:#f8fafc}
        .main{flex:1;margin-left:220px;padding:24px 32px;display:flex;flex-direction:column;gap:16px}
        .title{font-size:24px;font-weight:700;color:#0f172a}
        .card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:22px 24px;display:flex;flex-direction:column;gap:16px}
        .card h2{font-size:15px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .section-header{display:flex;justify-content:space-between;align-items:flex-start}
        .ref{font-size:11px;font-weight:400;color:#94a3b8;background:#f1f5f9;padding:2px 8px;border-radius:10px}
        .note{font-size:12px;color:#64748b;line-height:1.5}
        .field{display:flex;flex-direction:column;gap:5px;flex:1}
        .field label{font-size:12px;font-weight:500;color:#374151}
        .field input,.field select{padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:7px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none}
        .field input:focus,.field select:focus{border-color:#3b82f6}
        .money-input{display:flex;align-items:center;border:1.5px solid #e2e8f0;border-radius:7px;overflow:hidden}
        .money-input span{padding:8px 10px;background:#f8fafc;font-size:13px;color:#64748b;border-right:1px solid #e2e8f0}
        .money-input input{border:none;padding:8px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;flex:1}
        .radio-row{display:flex;gap:24px;flex-wrap:wrap}
        .form-row{display:flex;gap:12px;align-items:flex-end}
        .form-1095a{border:1px solid #e2e8f0;border-radius:9px;padding:16px;display:flex;flex-direction:column;gap:14px}
        .form-label{font-size:13px;font-weight:600;color:#1e40af}
        .entry-toggle{display:flex;gap:0;border:1px solid #e2e8f0;border-radius:7px;overflow:hidden;width:fit-content}
        .toggle-btn{background:#fff;border:none;padding:7px 16px;font-size:12px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;color:#64748b}
        .toggle-btn.active{background:#1e40af;color:#fff}
        .monthly-grid{display:flex;flex-direction:column;gap:6px}
        .month-header{display:grid;grid-template-columns:60px 1fr 1fr 1fr;gap:8px;font-size:11px;font-weight:600;color:#94a3b8;padding:0 4px}
        .month-row{display:grid;grid-template-columns:60px 1fr 1fr 1fr;gap:8px;align-items:center}
        .month-name{font-size:13px;font-weight:500;color:#374151}
        .add-btn{align-self:flex-start;background:none;border:1.5px dashed #cbd5e1;padding:8px 16px;border-radius:7px;font-size:13px;color:#64748b;cursor:pointer;font-family:'DM Sans',sans-serif}
        .add-btn:hover{border-color:#3b82f6;color:#3b82f6;background:#eff6ff}
        .nav-footer{display:flex;justify-content:space-between}
        .back-btn,.continue-btn{background:#1e3a5f;color:#fff;border:none;padding:10px 24px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
        .back-btn:hover,.continue-btn:hover{background:#1e40af}
        .continue-btn:disabled{opacity:0.5;cursor:not-allowed}
      `}</style>
    </div>
  )
}
function Field({ label, value, onChange }: any) {
  return <div className="field"><label>{label}</label><input value={value} onChange={e => onChange(e.target.value)} /></div>
}
function MF({ label, value, onChange }: any) {
  return <div className="field">{label && <label>{label}</label>}<div className="money-input"><span>$</span><input type="number" step="0.01" min="0" value={value} onChange={e => onChange(e.target.value)} /></div></div>
}
function Radio({ label, checked, onChange }: any) {
  return <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:14,color:"#374151"}}><input type="radio" checked={checked} onChange={onChange} />{label}</label>
}
function CB({ label, checked, onChange }: any) {
  return <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:14,color:"#374151"}}><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />{label}</label>
}
