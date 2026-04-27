"use client"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../ReturnNav"

export default function StateSectionPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const base = `/dashboard/returns/${id}`
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    // AR1000F Basic
    stateCode: "AR",
    filingStatus: "",
    // AR Income (pulls from federal but can be overridden)
    federalAGI: "",
    // AR Additions to Income
    interestFromOtherStates: "",
    lumpSumDistribution: "",
    otherAdditions: "",
    // AR Subtractions from Income
    socialSecurityBenefits: "",
    militaryPay: "",
    teacherRetirement: "",
    otherRetirement: "", // Up to $6,000/$12,000 exemption
    capitalGainsExclusion: "",
    disabilityIncome: "", // Up to $6,000
    scholarshipIncome: "",
    msnIncome: "", // Military spouse
    otherSubtractions: "",
    // AR Standard Deduction
    useARStandard: true,
    arStandardDeduction: "", // Auto-calculated
    // AR Itemized (if different from federal)
    arItemized: "",
    // AR Personal Credits
    personalCreditTaxpayer: "29", // $29 per exemption
    personalCreditSpouse: "29",
    dependentCredits: "", // $29 per dependent
    // AR Tax Credits
    lowIncomeCredit: false,
    childCareCredit: "",
    educationalCredit: "",
    adoptionCredit: "",
    phenylketonuriaCredit: "",
    wetlandsCredit: "",
    otherCredits: "",
    // AR Withholding
    arWithheld: "",
    arEstimatedPayments: "",
    arExtensionPayment: "",
    // AR refund/balance due
    arRefundOption: "direct_deposit",
    arRoutingNumber: "",
    arAccountNumber: "",
    arAccountType: "checking",
    // Political Checkoff
    wildlifeCheckoff: false,
    childrenServicesCheckoff: false,
    veteransCheckoff: false,
    artsCheckoff: false,
    warMemorialCheckoff: false,
  })

  function set(f: string, v: any) { setForm(p => ({ ...p, [f]: v })) }

  // AR Tax Calculation (2025 rates)
  function calcARTax(taxableIncome: number): number {
    if (taxableIncome <= 0) return 0
    if (taxableIncome <= 4999) return taxableIncome * 0.02
    if (taxableIncome <= 9999) return 100 + (taxableIncome - 5000) * 0.04
    if (taxableIncome <= 14299) return 300 + (taxableIncome - 10000) * 0.044
    if (taxableIncome <= 23599) return 489 + (taxableIncome - 14300) * 0.045
    if (taxableIncome <= 39699) return 907 + (taxableIncome - 23600) * 0.049
    return 1696 + (taxableIncome - 39700) * 0.049 // Top rate
  }

  const federalAGI = parseFloat(form.federalAGI) || 0
  const additions = (parseFloat(form.interestFromOtherStates)||0) + (parseFloat(form.lumpSumDistribution)||0) + (parseFloat(form.otherAdditions)||0)
  const subtractions = (parseFloat(form.socialSecurityBenefits)||0) + (parseFloat(form.militaryPay)||0) + (parseFloat(form.teacherRetirement)||0) + Math.min(parseFloat(form.otherRetirement)||0, 6000) + (parseFloat(form.capitalGainsExclusion)||0) + Math.min(parseFloat(form.disabilityIncome)||0, 6000) + (parseFloat(form.scholarshipIncome)||0) + (parseFloat(form.otherSubtractions)||0)
  const arAGI = federalAGI + additions - subtractions
  const arStdDed = form.filingStatus === "MARRIED_FILING_JOINTLY" ? 4400 : 2200
  const arDeduction = form.useARStandard ? arStdDed : (parseFloat(form.arItemized)||0)
  const personalCredits = (parseFloat(form.personalCreditTaxpayer)||29) + (parseFloat(form.personalCreditSpouse)||0) + (parseFloat(form.dependentCredits)||0)
  const arTaxableIncome = Math.max(0, arAGI - arDeduction - personalCredits)
  const arGrossTax = calcARTax(arTaxableIncome)
  const otherCredits = (parseFloat(form.childCareCredit)||0) + (parseFloat(form.educationalCredit)||0) + (parseFloat(form.adoptionCredit)||0) + (parseFloat(form.otherCredits)||0)
  const arNetTax = Math.max(0, arGrossTax - otherCredits)
  const arPayments = (parseFloat(form.arWithheld)||0) + (parseFloat(form.arEstimatedPayments)||0) + (parseFloat(form.arExtensionPayment)||0)
  const arRefundOrOwed = arPayments - arNetTax

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/returns/${id}/state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, arAGI, arTaxableIncome, arGrossTax, arNetTax, arPayments, arRefundOrOwed }),
    })
    setSaving(false)
    router.push(`${base}/summary`)
  }

  const FILING_STATUSES = [
    { value: "SINGLE", label: "Single" },
    { value: "MARRIED_FILING_JOINTLY", label: "Married Filing Jointly" },
    { value: "MARRIED_FILING_SEPARATELY", label: "Married Filing Separately" },
    { value: "HEAD_OF_HOUSEHOLD", label: "Head of Household" },
  ]

  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={2025} />
      <main className="main">
        <div className="layout">
          <div className="content">
            <div className="title-row">
              <h1 className="title">Arkansas State Return</h1>
              <span className="form-badge">AR1000F / AR1000NR</span>
            </div>

            {/* Filing Status */}
            <div className="card">
              <h2>Filing Status</h2>
              <p className="note">Arkansas filing status typically matches your federal filing status.</p>
              <div className="field">
                <label>Arkansas filing status *</label>
                <select value={form.filingStatus} onChange={(e: any) => set("filingStatus", e.target.value)}>
                  <option value="">Select...</option>
                  {FILING_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            {/* Income */}
            <div className="card">
              <h2>Arkansas Income <span className="ref">Lines 1-12</span></h2>
              <MF label="Federal Adjusted Gross Income (from Form 1040 Line 11)" value={form.federalAGI} onChange={(v: any) => set("federalAGI", v)} />

              <h3 className="sub-head">Additions to Income</h3>
              <MF label="Interest from obligations of other states" value={form.interestFromOtherStates} onChange={(v: any) => set("interestFromOtherStates", v)} />
              <MF label="Lump-sum distribution (federal tax)" value={form.lumpSumDistribution} onChange={(v: any) => set("lumpSumDistribution", v)} />
              <MF label="Other additions" value={form.otherAdditions} onChange={(v: any) => set("otherAdditions", v)} />

              <h3 className="sub-head">Subtractions from Income</h3>
              <MF label="Social Security benefits (taxable amount)" value={form.socialSecurityBenefits} onChange={(v: any) => set("socialSecurityBenefits", v)} />
              <MF label="Military pay" value={form.militaryPay} onChange={(v: any) => set("militaryPay", v)} />
              <MF label="Teacher retirement (AR Teacher Retirement System)" value={form.teacherRetirement} onChange={(v: any) => set("teacherRetirement", v)} />
              <MF label="Other retirement income (up to $6,000 single / $12,000 joint)" value={form.otherRetirement} onChange={(v: any) => set("otherRetirement", v)} />
              <MF label="Capital gains (AR exemption — 50% of net capital gains)" value={form.capitalGainsExclusion} onChange={(v: any) => set("capitalGainsExclusion", v)} />
              <MF label="Disability income (up to $6,000)" value={form.disabilityIncome} onChange={(v: any) => set("disabilityIncome", v)} />
              <MF label="Scholarship income" value={form.scholarshipIncome} onChange={(v: any) => set("scholarshipIncome", v)} />
              <MF label="Military spouse income (MSRRA)" value={form.msnIncome} onChange={(v: any) => set("msnIncome", v)} />
              <MF label="Other subtractions" value={form.otherSubtractions} onChange={(v: any) => set("otherSubtractions", v)} />

              <div className="calc-box">
                <div className="calc-row"><span>Federal AGI</span><span>${federalAGI.toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
                <div className="calc-row plus"><span>+ Additions</span><span>${additions.toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
                <div className="calc-row minus"><span>− Subtractions</span><span>${subtractions.toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
                <div className="calc-row total"><span>Arkansas AGI</span><span>${arAGI.toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
              </div>
            </div>

            {/* Deductions */}
            <div className="card">
              <h2>Arkansas Deductions <span className="ref">Lines 13-15</span></h2>
              <div className="deduction-toggle">
                <div className={`ded-box ${form.useARStandard ? "selected" : ""}`} onClick={() => set("useARStandard", true)}>
                  <div className="ded-label">Standard Deduction</div>
                  <div className="ded-amount">${arStdDed.toLocaleString()}</div>
                  <div className="ded-note">{form.filingStatus === "MARRIED_FILING_JOINTLY" ? "$4,400 MFJ" : "$2,200 Single/HOH"}</div>
                </div>
                <div className={`ded-box ${!form.useARStandard ? "selected" : ""}`} onClick={() => set("useARStandard", false)}>
                  <div className="ded-label">Itemized Deductions</div>
                  <div className="ded-amount">${(parseFloat(form.arItemized)||0).toLocaleString("en-US",{minimumFractionDigits:2})}</div>
                </div>
              </div>
              {!form.useARStandard && (
                <MF label="AR itemized deductions (from AR Schedule A)" value={form.arItemized} onChange={(v: any) => set("arItemized", v)} />
              )}
            </div>

            {/* Personal Credits */}
            <div className="card">
              <h2>Personal Tax Credits <span className="ref">Lines 16-18</span></h2>
              <p className="note">Arkansas allows a $29 personal tax credit per exemption (not a deduction).</p>
              <div className="form-row">
                <MF label="Taxpayer personal credit ($29)" value={form.personalCreditTaxpayer} onChange={(v: any) => set("personalCreditTaxpayer", v)} />
                <MF label="Spouse personal credit ($29)" value={form.personalCreditSpouse} onChange={(v: any) => set("personalCreditSpouse", v)} />
                <MF label="Dependent credits ($29 each)" value={form.dependentCredits} onChange={(v: any) => set("dependentCredits", v)} />
              </div>
            </div>

            {/* Tax Credits */}
            <div className="card">
              <h2>Arkansas Tax Credits <span className="ref">Lines 21-28</span></h2>
              <CB label="Low income tax credit (income under $21,646 single / $30,000 joint)" checked={form.lowIncomeCredit} onChange={(v: any) => set("lowIncomeCredit", v)} />
              <MF label="Child care credit (20% of federal credit)" value={form.childCareCredit} onChange={(v: any) => set("childCareCredit", v)} />
              <MF label="Educational opportunity credit" value={form.educationalCredit} onChange={(v: any) => set("educationalCredit", v)} />
              <MF label="Adoption credit" value={form.adoptionCredit} onChange={(v: any) => set("adoptionCredit", v)} />
              <MF label="Phenylketonuria disorder credit" value={form.phenylketonuriaCredit} onChange={(v: any) => set("phenylketonuriaCredit", v)} />
              <MF label="Wetlands and riparian zone credit" value={form.wetlandsCredit} onChange={(v: any) => set("wetlandsCredit", v)} />
              <MF label="Other AR credits" value={form.otherCredits} onChange={(v: any) => set("otherCredits", v)} />
            </div>

            {/* Payments */}
            <div className="card">
              <h2>Arkansas Payments <span className="ref">Lines 29-32</span></h2>
              <MF label="Arkansas income tax withheld (from W-2 Box 17)" value={form.arWithheld} onChange={(v: any) => set("arWithheld", v)} />
              <MF label="Arkansas estimated tax payments" value={form.arEstimatedPayments} onChange={(v: any) => set("arEstimatedPayments", v)} />
              <MF label="Extension payment (AR1055)" value={form.arExtensionPayment} onChange={(v: any) => set("arExtensionPayment", v)} />
            </div>

            {/* Political Checkoffs */}
            <div className="card">
              <h2>Arkansas Political Checkoffs <span className="ref">Lines 40-44</span></h2>
              <p className="note">Check any fund you wish to contribute $1 to (reduces your refund or increases tax due).</p>
              <CB label="Arkansas Game & Fish Wildlife Management Fund ($1)" checked={form.wildlifeCheckoff} onChange={(v: any) => set("wildlifeCheckoff", v)} />
              <CB label="Arkansas Children's Services Fund ($1)" checked={form.childrenServicesCheckoff} onChange={(v: any) => set("childrenServicesCheckoff", v)} />
              <CB label="Arkansas Veterans Fund ($1)" checked={form.veteransCheckoff} onChange={(v: any) => set("veteransCheckoff", v)} />
              <CB label="Arkansas Arts Council Fund ($1)" checked={form.artsCheckoff} onChange={(v: any) => set("artsCheckoff", v)} />
              <CB label="Arkansas War Memorial Stadium Fund ($1)" checked={form.warMemorialCheckoff} onChange={(v: any) => set("warMemorialCheckoff", v)} />
            </div>

            {/* Refund Options */}
            <div className="card">
              <h2>Arkansas Refund / Balance Due</h2>
              <div className={`result-box ${arRefundOrOwed >= 0 ? "refund" : "owed"}`}>
                <span>{arRefundOrOwed >= 0 ? "Arkansas Refund" : "Arkansas Balance Due"}</span>
                <span>${Math.abs(arRefundOrOwed).toLocaleString("en-US",{minimumFractionDigits:2})}</span>
              </div>
              {arRefundOrOwed > 0 && (
                <>
                  <div className="field">
                    <label>Refund option</label>
                    <div className="radio-col">
                      <Radio label="Direct deposit" checked={form.arRefundOption === "direct_deposit"} onChange={() => set("arRefundOption", "direct_deposit")} />
                      <Radio label="Paper check" checked={form.arRefundOption === "check"} onChange={() => set("arRefundOption", "check")} />
                    </div>
                  </div>
                  {form.arRefundOption === "direct_deposit" && (
                    <div className="bank-fields">
                      <div className="field">
                        <label>Account type</label>
                        <div className="radio-row">
                          <Radio label="Checking" checked={form.arAccountType === "checking"} onChange={() => set("arAccountType", "checking")} />
                          <Radio label="Savings" checked={form.arAccountType === "savings"} onChange={() => set("arAccountType", "savings")} />
                        </div>
                      </div>
                      <Field label="Routing number (9 digits)" value={form.arRoutingNumber} onChange={(v: any) => set("arRoutingNumber", v.replace(/\D/g,"").slice(0,9))} />
                      <Field label="Account number" value={form.arAccountNumber} onChange={(v: any) => set("arAccountNumber", v.replace(/\D/g,"").slice(0,17))} />
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="nav-footer">
              <button className="back-btn" onClick={() => router.push(`${base}/health`)}>BACK</button>
              <button className="continue-btn" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "CONTINUE TO SUMMARY"}</button>
            </div>
          </div>

          {/* Summary sidebar */}
          <div className="sidebar">
            <div className="sidebar-title">AR TAX SUMMARY</div>
            <div className="summary-row"><span>AR AGI</span><span>${arAGI.toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
            <div className="summary-row"><span>Deduction</span><span>-${arDeduction.toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
            <div className="summary-row"><span>Credits</span><span>-${personalCredits.toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
            <div className="summary-divider"/>
            <div className="summary-row bold"><span>Taxable Inc.</span><span>${arTaxableIncome.toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
            <div className="summary-row"><span>Gross Tax</span><span>${arGrossTax.toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
            <div className="summary-row"><span>Other Credits</span><span>-${otherCredits.toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
            <div className="summary-divider"/>
            <div className="summary-row bold"><span>Net Tax</span><span>${arNetTax.toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
            <div className="summary-row"><span>Payments</span><span>-${arPayments.toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
            <div className="summary-divider"/>
            <div className={`summary-total ${arRefundOrOwed >= 0 ? "refund" : "owed"}`}>
              <span>{arRefundOrOwed >= 0 ? "Refund" : "Owed"}</span>
              <span>${Math.abs(arRefundOrOwed).toLocaleString("en-US",{minimumFractionDigits:2})}</span>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .root{display:flex;min-height:100vh;font-family:'DM Sans',sans-serif;background:#f8fafc}
        .main{flex:1;margin-left:220px;padding:24px 32px}
        .layout{display:flex;gap:24px}
        .content{flex:1;display:flex;flex-direction:column;gap:16px}
        .title-row{display:flex;align-items:center;gap:14px}
        .title{font-size:24px;font-weight:700;color:#0f172a}
        .form-badge{background:#1e3a5f;color:#fff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}
        .card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:22px 24px;display:flex;flex-direction:column;gap:14px}
        .card h2{font-size:15px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .sub-head{font-size:13px;font-weight:600;color:#374151;border-bottom:1px solid #f1f5f9;padding-bottom:6px}
        .ref{font-size:11px;font-weight:400;color:#94a3b8;background:#f1f5f9;padding:2px 8px;border-radius:10px}
        .note{font-size:12px;color:#64748b;line-height:1.5}
        .field{display:flex;flex-direction:column;gap:5px;flex:1}
        .field label{font-size:12px;font-weight:500;color:#374151}
        .field input,.field select{padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:7px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none}
        .field input:focus,.field select:focus{border-color:#3b82f6}
        .money-input{display:flex;align-items:center;border:1.5px solid #e2e8f0;border-radius:7px;overflow:hidden}
        .money-input span{padding:8px 10px;background:#f8fafc;font-size:13px;color:#64748b;border-right:1px solid #e2e8f0}
        .money-input input{border:none;padding:8px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;flex:1}
        .form-row{display:flex;gap:12px;align-items:flex-end}
        .radio-row{display:flex;gap:20px}
        .radio-col{display:flex;flex-direction:column;gap:10px}
        .calc-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:8px}
        .calc-row{display:flex;justify-content:space-between;font-size:13px;color:#374151}
        .calc-row.plus{color:#2563eb}
        .calc-row.minus{color:#16a34a}
        .calc-row.total{font-weight:700;border-top:1px solid #e2e8f0;padding-top:8px;margin-top:2px}
        .deduction-toggle{display:flex;gap:14px}
        .ded-box{flex:1;border:2px solid #e2e8f0;border-radius:9px;padding:14px;cursor:pointer;transition:all 0.15s;text-align:center}
        .ded-box:hover{border-color:#93c5fd}
        .ded-box.selected{border-color:#3b82f6;background:#eff6ff}
        .ded-label{font-size:13px;font-weight:500;color:#374151}
        .ded-amount{font-size:20px;font-weight:700;color:#0f172a;margin:6px 0}
        .ded-note{font-size:11px;color:#94a3b8}
        .result-box{display:flex;justify-content:space-between;padding:14px 18px;border-radius:9px;font-size:16px;font-weight:700}
        .result-box.refund{background:#f0fdf4;border:1px solid #bbf7d0;color:#16a34a}
        .result-box.owed{background:#fef2f2;border:1px solid #fecaca;color:#dc2626}
        .bank-fields{display:flex;flex-direction:column;gap:12px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px}
        .nav-footer{display:flex;justify-content:space-between;padding-top:8px}
        .back-btn,.continue-btn{background:#1e3a5f;color:#fff;border:none;padding:10px 24px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
        .back-btn:hover,.continue-btn:hover{background:#1e40af}
        .continue-btn:disabled{opacity:0.5;cursor:not-allowed}
        .sidebar{width:200px;flex-shrink:0;position:sticky;top:24px;align-self:flex-start}
        .sidebar-title{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px}
        .summary-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:12px;color:#374151}
        .summary-row.bold{font-weight:700;font-size:13px}
        .summary-divider{height:1px;background:#e2e8f0;margin:6px 0}
        .summary-total{display:flex;justify-content:space-between;font-size:15px;font-weight:700;padding:6px 0}
        .summary-total.refund{color:#16a34a}
        .summary-total.owed{color:#dc2626}
      `}</style>
    </div>
  )
}
function Field({ label, value, onChange }: any) {
  return <div className="field"><label>{label}</label><input value={value} onChange={(e: any) => onChange(e.target.value)} /></div>
}
function MF({ label, value, onChange }: any) {
  return <div className="field">{label && <label>{label}</label>}<div className="money-input"><span>$</span><input type="number" step="0.01" min="0" value={value} onChange={(e: any) => onChange(e.target.value)} /></div></div>
}
function Radio({ label, checked, onChange }: any) {
  return <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:14,color:"#374151"}}><input type="radio" checked={checked} onChange={onChange} />{label}</label>
}
function CB({ label, checked, onChange }: any) {
  return <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:14,color:"#374151"}}><input type="checkbox" checked={checked} onChange={(e: any) => onChange(e.target.checked)} />{label}</label>
}
