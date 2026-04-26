"use client"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../../ReturnNav"

export default function PaymentsPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const base = `/dashboard/returns/${id}`
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    // Federal withholding (from W-2s, 1099s — auto-populated)
    federalWithheld: "",
    // Estimated tax payments (Form 1040-ES)
    est_q1: "", est_q1_date: "2025-04-15",
    est_q2: "", est_q2_date: "2025-06-16",
    est_q3: "", est_q3_date: "2025-09-15",
    est_q4: "", est_q4_date: "2026-01-15",
    // Extension payment (Form 4868)
    extensionPayment: "",
    extensionPaymentDate: "",
    // Excess Social Security tax withheld
    excessSSTax: "",
    // Credits from prior year
    priorYearOverpayment: "",
    // Earned Income Credit
    eic: "",
    // Additional Child Tax Credit (Schedule 8812)
    additionalChildTax: "",
    // American Opportunity Credit (Form 8863)
    americanOpportunityCredit: "",
    // Net Premium Tax Credit (Form 8962)
    netPremiumTaxCredit: "",
    // Credit from Form 2439
    form2439Credit: "",
    // Credit from Form 4136 (fuel tax credit)
    fuelTaxCredit: "",
    // Other refundable credits
    otherRefundableCredits: "",
    // Refund options
    refundOption: "direct_deposit",
    routingNumber: "",
    accountNumber: "",
    accountType: "checking",
    // Amount to apply to next year
    applyToNextYear: "",
  })

  function set(f: string, v: any) { setForm(p => ({ ...p, [f]: v })) }

  const totalEstimated =
    (parseFloat(form.est_q1) || 0) +
    (parseFloat(form.est_q2) || 0) +
    (parseFloat(form.est_q3) || 0) +
    (parseFloat(form.est_q4) || 0)

  const totalPayments =
    (parseFloat(form.federalWithheld) || 0) +
    totalEstimated +
    (parseFloat(form.extensionPayment) || 0) +
    (parseFloat(form.excessSSTax) || 0) +
    (parseFloat(form.priorYearOverpayment) || 0)

  const totalRefundableCredits =
    (parseFloat(form.eic) || 0) +
    (parseFloat(form.additionalChildTax) || 0) +
    (parseFloat(form.americanOpportunityCredit) || 0) +
    (parseFloat(form.netPremiumTaxCredit) || 0) +
    (parseFloat(form.form2439Credit) || 0) +
    (parseFloat(form.fuelTaxCredit) || 0) +
    (parseFloat(form.otherRefundableCredits) || 0)

  const grandTotal = totalPayments + totalRefundableCredits

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/returns/${id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, totalPayments, totalRefundableCredits, grandTotal }),
    })
    setSaving(false)
    router.push(`${base}/health`)
  }

  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={2025} />
      <main className="main">
        <div className="layout">
          <div className="content">
            <h1 className="title">Payments & Estimates</h1>

            {/* Federal Withholding */}
            <div className="card">
              <h2>Federal Income Tax Withheld <span className="ref">Line 25</span></h2>
              <p className="note">Auto-populated from W-2 Box 2 and 1099 withholding. Override if needed.</p>
              <MF label="Total federal income tax withheld (from all W-2s and 1099s)" value={form.federalWithheld} onChange={v => set("federalWithheld", v)} />
            </div>

            {/* Estimated Tax Payments */}
            <div className="card">
              <h2>2025 Estimated Tax Payments <span className="ref">Line 26</span></h2>
              <p className="note">Enter amounts paid with Form 1040-ES. Due dates: Apr 15, Jun 16, Sep 15, Jan 15.</p>
              <div className="est-grid">
                <div className="est-row">
                  <span className="est-label">Q1 — due Apr 15, 2025</span>
                  <MF label="" value={form.est_q1} onChange={v => set("est_q1", v)} />
                  <div className="field"><label>Date paid</label><input type="date" value={form.est_q1_date} onChange={e => set("est_q1_date", e.target.value)} /></div>
                </div>
                <div className="est-row">
                  <span className="est-label">Q2 — due Jun 16, 2025</span>
                  <MF label="" value={form.est_q2} onChange={v => set("est_q2", v)} />
                  <div className="field"><label>Date paid</label><input type="date" value={form.est_q2_date} onChange={e => set("est_q2_date", e.target.value)} /></div>
                </div>
                <div className="est-row">
                  <span className="est-label">Q3 — due Sep 15, 2025</span>
                  <MF label="" value={form.est_q3} onChange={v => set("est_q3", v)} />
                  <div className="field"><label>Date paid</label><input type="date" value={form.est_q3_date} onChange={e => set("est_q3_date", e.target.value)} /></div>
                </div>
                <div className="est-row">
                  <span className="est-label">Q4 — due Jan 15, 2026</span>
                  <MF label="" value={form.est_q4} onChange={v => set("est_q4", v)} />
                  <div className="field"><label>Date paid</label><input type="date" value={form.est_q4_date} onChange={e => set("est_q4_date", e.target.value)} /></div>
                </div>
              </div>
              {totalEstimated > 0 && (
                <div className="total-row">
                  <span>Total estimated payments</span>
                  <span>${totalEstimated.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>

            {/* Extension Payment */}
            <div className="card">
              <h2>Extension Payment <span className="ref">Line 26</span></h2>
              <p className="note">Amount paid with Form 4868 extension request.</p>
              <MF label="Amount paid with extension (Form 4868)" value={form.extensionPayment} onChange={v => set("extensionPayment", v)} />
              <div className="field">
                <label>Date paid</label>
                <input type="date" value={form.extensionPaymentDate} onChange={e => set("extensionPaymentDate", e.target.value)} />
              </div>
            </div>

            {/* Other Payments */}
            <div className="card">
              <h2>Other Payments <span className="ref">Lines 27-32</span></h2>
              <MF label="Excess Social Security tax withheld (Line 11)" value={form.excessSSTax} onChange={v => set("excessSSTax", v)} />
              <MF label="Amount from prior year return applied to 2025 (Line 26)" value={form.priorYearOverpayment} onChange={v => set("priorYearOverpayment", v)} />
            </div>

            {/* Refundable Credits */}
            <div className="card">
              <h2>Refundable Credits <span className="ref">Schedule 3 Part II</span></h2>
              <MF label="Earned Income Credit — EIC (Schedule EIC)" value={form.eic} onChange={v => set("eic", v)} />
              <MF label="Additional Child Tax Credit (Schedule 8812)" value={form.additionalChildTax} onChange={v => set("additionalChildTax", v)} />
              <MF label="American Opportunity Credit (Form 8863, line 8)" value={form.americanOpportunityCredit} onChange={v => set("americanOpportunityCredit", v)} />
              <MF label="Net Premium Tax Credit (Form 8962)" value={form.netPremiumTaxCredit} onChange={v => set("netPremiumTaxCredit", v)} />
              <MF label="Credit from Form 2439 — undistributed capital gains" value={form.form2439Credit} onChange={v => set("form2439Credit", v)} />
              <MF label="Credit for federal tax on fuels (Form 4136)" value={form.fuelTaxCredit} onChange={v => set("fuelTaxCredit", v)} />
              <MF label="Other refundable credits" value={form.otherRefundableCredits} onChange={v => set("otherRefundableCredits", v)} />
            </div>

            {/* Refund Options */}
            <div className="card">
              <h2>Refund Options <span className="ref">Lines 35-36</span></h2>
              <div className="radio-group">
                <Radio label="Direct deposit to bank account" checked={form.refundOption === "direct_deposit"} onChange={() => set("refundOption", "direct_deposit")} />
                <Radio label="Paper check by mail" checked={form.refundOption === "check"} onChange={() => set("refundOption", "check")} />
                <Radio label="Apply to 2026 estimated tax" checked={form.refundOption === "apply_next_year"} onChange={() => set("refundOption", "apply_next_year")} />
                <Radio label="Purchase US Savings Bonds" checked={form.refundOption === "savings_bonds"} onChange={() => set("refundOption", "savings_bonds")} />
              </div>

              {form.refundOption === "direct_deposit" && (
                <div className="bank-fields">
                  <div className="field">
                    <label>Account type</label>
                    <div className="radio-group horizontal">
                      <Radio label="Checking" checked={form.accountType === "checking"} onChange={() => set("accountType", "checking")} />
                      <Radio label="Savings" checked={form.accountType === "savings"} onChange={() => set("accountType", "savings")} />
                    </div>
                  </div>
                  <div className="field">
                    <label>Routing number (9 digits) *</label>
                    <input
                      value={form.routingNumber}
                      onChange={e => set("routingNumber", e.target.value.replace(/\D/g, "").slice(0, 9))}
                      placeholder="XXXXXXXXX"
                      style={{ maxWidth: 200, letterSpacing: 3 }}
                    />
                    {form.routingNumber.length > 0 && form.routingNumber.length < 9 && (
                      <span className="hint">{9 - form.routingNumber.length} more digits needed</span>
                    )}
                  </div>
                  <div className="field">
                    <label>Account number *</label>
                    <input
                      value={form.accountNumber}
                      onChange={e => set("accountNumber", e.target.value.replace(/\D/g, "").slice(0, 17))}
                      placeholder="Up to 17 digits"
                      style={{ maxWidth: 240, letterSpacing: 3 }}
                    />
                  </div>
                  <div className="bank-note">
                    ⚠ Double-check routing and account numbers. Errors cannot be corrected after e-filing.
                  </div>
                </div>
              )}

              {form.refundOption === "apply_next_year" && (
                <MF label="Amount to apply to 2026 estimated tax" value={form.applyToNextYear} onChange={v => set("applyToNextYear", v)} />
              )}
            </div>

            <div className="nav-footer">
              <button className="back-btn" onClick={() => router.push(`${base}/federal/other-taxes`)}>BACK</button>
              <button className="continue-btn" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "CONTINUE"}</button>
            </div>
          </div>

          {/* Summary sidebar */}
          <div className="sidebar">
            <div className="sidebar-title">PAYMENTS</div>
            <div className="summary-row"><span>Fed. Withheld</span><span>${(parseFloat(form.federalWithheld)||0).toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
            <div className="summary-row"><span>Estimated</span><span>${totalEstimated.toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
            <div className="summary-row"><span>Extension Pmt</span><span>${(parseFloat(form.extensionPayment)||0).toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
            <div className="summary-row"><span>Excess SS</span><span>${(parseFloat(form.excessSSTax)||0).toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
            <div className="summary-row"><span>Prior Year</span><span>${(parseFloat(form.priorYearOverpayment)||0).toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
            <div className="summary-divider"/>
            <div className="summary-row bold"><span>Total Payments</span><span>${totalPayments.toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
            <div className="sidebar-title" style={{marginTop:16}}>REFUNDABLE CREDITS</div>
            <div className="summary-row"><span>EIC</span><span>${(parseFloat(form.eic)||0).toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
            <div className="summary-row"><span>Child Tax</span><span>${(parseFloat(form.additionalChildTax)||0).toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
            <div className="summary-row"><span>AOC</span><span>${(parseFloat(form.americanOpportunityCredit)||0).toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
            <div className="summary-row"><span>PTC</span><span>${(parseFloat(form.netPremiumTaxCredit)||0).toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
            <div className="summary-divider"/>
            <div className="summary-row bold"><span>Total Credits</span><span>${totalRefundableCredits.toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
            <div className="summary-divider"/>
            <div className="summary-total"><span>Grand Total</span><span>${grandTotal.toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
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
        .ref{font-size:11px;font-weight:400;color:#94a3b8;background:#f1f5f9;padding:2px 8px;border-radius:10px}
        .note{font-size:12px;color:#64748b;line-height:1.5}
        .field{display:flex;flex-direction:column;gap:5px}
        .field label{font-size:12px;font-weight:500;color:#374151}
        .field input{padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:7px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none}
        .field input:focus{border-color:#3b82f6}
        .money-input{display:flex;align-items:center;border:1.5px solid #e2e8f0;border-radius:7px;overflow:hidden}
        .money-input span{padding:8px 10px;background:#f8fafc;font-size:13px;color:#64748b;border-right:1px solid #e2e8f0}
        .money-input input{border:none;padding:8px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;flex:1}
        .est-grid{display:flex;flex-direction:column;gap:12px}
        .est-row{display:grid;grid-template-columns:200px 1fr 160px;gap:12px;align-items:end}
        .est-label{font-size:13px;font-weight:500;color:#374151;padding-bottom:9px}
        .total-row{display:flex;justify-content:space-between;padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:7px;font-size:13px;font-weight:600;color:#16a34a}
        .radio-group{display:flex;flex-direction:column;gap:10px}
        .radio-group.horizontal{flex-direction:row;gap:20px}
        .bank-fields{display:flex;flex-direction:column;gap:14px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px}
        .bank-note{font-size:12px;color:#d97706;background:#fffbeb;border:1px solid #fde68a;padding:10px 12px;border-radius:7px}
        .hint{font-size:11px;color:#f59e0b;margin-top:2px}
        .nav-footer{display:flex;justify-content:space-between;padding-top:8px}
        .back-btn,.continue-btn{background:#1e3a5f;color:#fff;border:none;padding:10px 24px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
        .back-btn:hover,.continue-btn:hover{background:#1e40af}
        .continue-btn:disabled{opacity:0.5;cursor:not-allowed}
        .sidebar{width:200px;flex-shrink:0;position:sticky;top:24px;align-self:flex-start;display:flex;flex-direction:column;gap:0}
        .sidebar-title{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;margin-top:4px}
        .summary-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:12px;color:#374151}
        .summary-row.bold{font-weight:700;font-size:13px}
        .summary-divider{height:1px;background:#e2e8f0;margin:6px 0}
        .summary-total{display:flex;justify-content:space-between;font-size:15px;font-weight:700;color:#1e40af;padding:6px 0}
      `}</style>
    </div>
  )
}
function MF({ label, value, onChange }: any) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      <div className="money-input">
        <span>$</span>
        <input type="number" step="0.01" min="0" value={value} onChange={e => onChange(e.target.value)} />
      </div>
    </div>
  )
}
function Radio({ label, checked, onChange }: any) {
  return (
    <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:14,color:"#374151"}}>
      <input type="radio" checked={checked} onChange={onChange} />
      {label}
    </label>
  )
}
