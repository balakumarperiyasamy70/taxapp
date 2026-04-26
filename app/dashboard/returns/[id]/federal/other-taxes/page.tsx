"use client"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../../ReturnNav"

export default function OtherTaxesPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const base = `/dashboard/returns/${id}`
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    // Self-Employment Tax (Schedule SE)
    hasSelfEmployment: false,
    selfEmploymentIncome: "",
    // Alternative Minimum Tax (Form 6251)
    hasAMT: false,
    amtAmount: "",
    // Household Employment Taxes (Schedule H)
    hasHouseholdEmployee: false,
    householdWages: "",
    // Net Investment Income Tax (Form 8960)
    hasNIIT: false,
    netInvestmentIncome: "",
    // Additional Medicare Tax (Form 8959)
    hasAdditionalMedicare: false,
    additionalMedicareWages: "",
    // Recapture Taxes
    firstTimeHomebuyerRecapture: "",
    educationCreditRecapture: "",
    // Section 72(t) Early Distribution Penalty
    earlyDistributionPenalty: "",
    // Self-employed Health Insurance
    seHealthInsurance: "",
    // SE Retirement contributions
    seRetirement: "",
    // Other taxes
    interestOnTaxDeferral: "",
    lookbackInterest: "",
    goldenParachutePayments: "",
    uncollectedSSTax: "",
    taxOnAccumulationDistribution: "",
    otherTaxes: "",
  })

  function set(f: string, v: any) { setForm(p => ({ ...p, [f]: v })) }

  // Calculate SE tax (92.35% of net SE income × 15.3%, then ÷ 2 deductible)
  const seIncome = parseFloat(form.selfEmploymentIncome) || 0
  const seTaxableIncome = seIncome * 0.9235
  const seTax = seTaxableIncome <= 176100
    ? seTaxableIncome * 0.153
    : (176100 * 0.153) + ((seTaxableIncome - 176100) * 0.029)
  const seDeduction = seTax / 2

  const totalOtherTaxes =
    (form.hasSelfEmployment ? seTax : 0) +
    (form.hasAMT ? parseFloat(form.amtAmount) || 0 : 0) +
    (parseFloat(form.firstTimeHomebuyerRecapture) || 0) +
    (parseFloat(form.educationCreditRecapture) || 0) +
    (parseFloat(form.earlyDistributionPenalty) || 0) +
    (parseFloat(form.interestOnTaxDeferral) || 0) +
    (parseFloat(form.goldenParachutePayments) || 0) +
    (parseFloat(form.uncollectedSSTax) || 0) +
    (parseFloat(form.otherTaxes) || 0)

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/returns/${id}/other-taxes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, seTax, seDeduction, totalOtherTaxes }),
    })
    setSaving(false)
    router.push(`${base}/federal/payments`)
  }

  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={2025} />
      <main className="main">
        <div className="layout">
          <div className="content">
            <h1 className="title">Other Taxes</h1>

            {/* Self-Employment Tax */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h2>Self-Employment Tax <span className="line-ref">Schedule SE / Line 15</span></h2>
                  <p className="note">Net earnings from self-employment are subject to 15.3% SE tax (12.4% SS + 2.9% Medicare). You can deduct half on Schedule 1.</p>
                </div>
                <Toggle checked={form.hasSelfEmployment} onChange={v => set("hasSelfEmployment", v)} />
              </div>
              {form.hasSelfEmployment && (
                <div className="sub-form">
                  <MF label="Net self-employment income (from Schedule C, F, or K-1)" value={form.selfEmploymentIncome} onChange={v => set("selfEmploymentIncome", v)} />
                  {seIncome > 0 && (
                    <div className="calc-box">
                      <div className="calc-row"><span>Net SE income</span><span>${seIncome.toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
                      <div className="calc-row"><span>× 92.35%</span><span>${seTaxableIncome.toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
                      <div className="calc-row"><span>SE Tax (15.3% / 2.9%)</span><span>${seTax.toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
                      <div className="calc-row deduct"><span>Deductible portion (÷2)</span><span>-${seDeduction.toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
                    </div>
                  )}
                  <MF label="Self-employed health insurance deduction" value={form.seHealthInsurance} onChange={v => set("seHealthInsurance", v)} />
                  <MF label="Self-employed SEP/SIMPLE/qualified plan contributions" value={form.seRetirement} onChange={v => set("seRetirement", v)} />
                </div>
              )}
            </div>

            {/* Alternative Minimum Tax */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h2>Alternative Minimum Tax (AMT) <span className="line-ref">Form 6251 / Line 17</span></h2>
                  <p className="note">AMT exemption for 2025: $88,100 (single), $137,000 (MFJ). Phase-out begins at $626,350 / $1,252,700.</p>
                </div>
                <Toggle checked={form.hasAMT} onChange={v => set("hasAMT", v)} />
              </div>
              {form.hasAMT && (
                <div className="sub-form">
                  <MF label="AMT from Form 6251" value={form.amtAmount} onChange={v => set("amtAmount", v)} />
                </div>
              )}
            </div>

            {/* Household Employment */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h2>Household Employment Taxes <span className="line-ref">Schedule H / Line 16</span></h2>
                  <p className="note">If you paid a household employee $2,700 or more in 2025, you may owe employer taxes.</p>
                </div>
                <Toggle checked={form.hasHouseholdEmployee} onChange={v => set("hasHouseholdEmployee", v)} />
              </div>
              {form.hasHouseholdEmployee && (
                <div className="sub-form">
                  <MF label="Total cash wages paid to household employees" value={form.householdWages} onChange={v => set("householdWages", v)} />
                </div>
              )}
            </div>

            {/* Net Investment Income Tax */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h2>Net Investment Income Tax <span className="line-ref">Form 8960 / Line 17</span></h2>
                  <p className="note">3.8% tax on lesser of net investment income or MAGI exceeding $200,000 (single) / $250,000 (MFJ).</p>
                </div>
                <Toggle checked={form.hasNIIT} onChange={v => set("hasNIIT", v)} />
              </div>
              {form.hasNIIT && (
                <div className="sub-form">
                  <MF label="Net investment income from Form 8960" value={form.netInvestmentIncome} onChange={v => set("netInvestmentIncome", v)} />
                </div>
              )}
            </div>

            {/* Additional Medicare Tax */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h2>Additional Medicare Tax <span className="line-ref">Form 8959 / Line 17</span></h2>
                  <p className="note">0.9% additional Medicare tax on wages/SE income exceeding $200,000 (single) / $250,000 (MFJ).</p>
                </div>
                <Toggle checked={form.hasAdditionalMedicare} onChange={v => set("hasAdditionalMedicare", v)} />
              </div>
              {form.hasAdditionalMedicare && (
                <div className="sub-form">
                  <MF label="Wages subject to Additional Medicare Tax" value={form.additionalMedicareWages} onChange={v => set("additionalMedicareWages", v)} />
                </div>
              )}
            </div>

            {/* Recapture & Other */}
            <div className="card">
              <h2>Recapture and Other Taxes <span className="line-ref">Schedule 2 Lines 7-21</span></h2>
              <MF label="First-time homebuyer credit recapture (Form 5405)" value={form.firstTimeHomebuyerRecapture} onChange={v => set("firstTimeHomebuyerRecapture", v)} />
              <MF label="Education credit recapture" value={form.educationCreditRecapture} onChange={v => set("educationCreditRecapture", v)} />
              <MF label="Tax on early distributions / Section 72(t) penalty (Form 5329)" value={form.earlyDistributionPenalty} onChange={v => set("earlyDistributionPenalty", v)} />
              <MF label="Interest on tax attributable to installment sales" value={form.interestOnTaxDeferral} onChange={v => set("interestOnTaxDeferral", v)} />
              <MF label="Interest on lookback method (Form 8697 / 8866)" value={form.lookbackInterest} onChange={v => set("lookbackInterest", v)} />
              <MF label="Golden parachute payments tax (20%)" value={form.goldenParachutePayments} onChange={v => set("goldenParachutePayments", v)} />
              <MF label="Uncollected Social Security / Medicare tax on wages (Form 4137)" value={form.uncollectedSSTax} onChange={v => set("uncollectedSSTax", v)} />
              <MF label="Tax on accumulation distribution of trusts (Form 4970)" value={form.taxOnAccumulationDistribution} onChange={v => set("taxOnAccumulationDistribution", v)} />
              <MF label="Other additional taxes" value={form.otherTaxes} onChange={v => set("otherTaxes", v)} />
            </div>

            <div className="nav-footer">
              <button className="back-btn" onClick={() => router.push(`${base}/federal/deductions`)}>BACK</button>
              <button className="continue-btn" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "CONTINUE"}</button>
            </div>
          </div>

          {/* Summary sidebar */}
          <div className="sidebar">
            <div className="sidebar-title">OTHER TAXES</div>
            {form.hasSelfEmployment && (
              <div className="summary-row"><span>SE Tax</span><span>${seTax.toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
            )}
            {form.hasAMT && (
              <div className="summary-row"><span>AMT</span><span>${(parseFloat(form.amtAmount)||0).toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
            )}
            {parseFloat(form.earlyDistributionPenalty) > 0 && (
              <div className="summary-row"><span>72(t) Penalty</span><span>${(parseFloat(form.earlyDistributionPenalty)||0).toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
            )}
            {parseFloat(form.otherTaxes) > 0 && (
              <div className="summary-row"><span>Other</span><span>${(parseFloat(form.otherTaxes)||0).toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
            )}
            <div className="summary-divider" />
            <div className="summary-total">
              <span>Total</span>
              <span>${totalOtherTaxes.toLocaleString("en-US",{minimumFractionDigits:2})}</span>
            </div>
            {form.hasSelfEmployment && seDeduction > 0 && (
              <>
                <div className="sidebar-title" style={{marginTop:16}}>SE DEDUCTIONS</div>
                <div className="summary-row deduct"><span>½ SE Tax</span><span>-${seDeduction.toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
                {parseFloat(form.seHealthInsurance) > 0 && <div className="summary-row deduct"><span>Health Ins.</span><span>-${(parseFloat(form.seHealthInsurance)||0).toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>}
                {parseFloat(form.seRetirement) > 0 && <div className="summary-row deduct"><span>Retirement</span><span>-${(parseFloat(form.seRetirement)||0).toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>}
              </>
            )}
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
        .title{font-size:24px;font-weight:700;color:#0f172a}
        .card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:22px 24px;display:flex;flex-direction:column;gap:14px}
        .card h2{font-size:15px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .card-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
        .card-header > div{flex:1}
        .line-ref{font-size:11px;font-weight:400;color:#94a3b8;background:#f1f5f9;padding:2px 8px;border-radius:10px}
        .note{font-size:12px;color:#64748b;line-height:1.5;margin-top:4px}
        .sub-form{display:flex;flex-direction:column;gap:12px;padding-top:4px;border-top:1px solid #f1f5f9}
        .field{display:flex;flex-direction:column;gap:5px}
        .field label{font-size:12px;font-weight:500;color:#374151}
        .money-input{display:flex;align-items:center;border:1px solid #d1d5db;border-radius:6px;overflow:hidden}
        .money-input span{padding:8px 10px;background:#f8fafc;font-size:13px;color:#64748b;border-right:1px solid #d1d5db}
        .money-input input{border:none;padding:8px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;flex:1}
        .calc-box{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 14px;display:flex;flex-direction:column;gap:6px}
        .calc-row{display:flex;justify-content:space-between;font-size:13px;color:#374151}
        .calc-row.deduct{color:#16a34a;font-weight:500}
        .toggle{position:relative;width:44px;height:24px;flex-shrink:0}
        .toggle input{opacity:0;width:0;height:0}
        .toggle-slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#e2e8f0;border-radius:24px;transition:0.3s}
        .toggle-slider:before{position:absolute;content:"";height:18px;width:18px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:0.3s}
        .toggle input:checked + .toggle-slider{background:#1e40af}
        .toggle input:checked + .toggle-slider:before{transform:translateX(20px)}
        .nav-footer{display:flex;justify-content:space-between;padding-top:8px}
        .back-btn,.continue-btn{background:#1e3a5f;color:#fff;border:none;padding:10px 24px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
        .back-btn:hover,.continue-btn:hover{background:#1e40af}
        .continue-btn:disabled{opacity:0.5;cursor:not-allowed}
        .sidebar{width:200px;flex-shrink:0;position:sticky;top:24px;align-self:flex-start}
        .sidebar-title{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px}
        .summary-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151}
        .summary-row.deduct{color:#16a34a}
        .summary-divider{height:1px;background:#e2e8f0;margin:8px 0}
        .summary-total{display:flex;justify-content:space-between;font-size:15px;font-weight:700;color:#0f172a;padding:4px 0}
      `}</style>
    </div>
  )
}
function MF({ label, value, onChange }: any) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="money-input">
        <span>$</span>
        <input type="number" step="0.01" min="0" value={value} onChange={e => onChange(e.target.value)} />
      </div>
    </div>
  )
}
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-slider"></span>
    </label>
  )
}
