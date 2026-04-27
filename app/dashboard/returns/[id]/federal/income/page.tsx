"use client"

import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../../ReturnNav"

const INCOME_FORMS = [
  { key: "w2", label: "Form W-2", desc: "Wage and Tax Statement" },
  { key: "w2g", label: "Form W-2G", desc: "Certain Gambling Winnings" },
  { key: "1099int", label: "Form 1099-INT", desc: "Interest income from banks and investments" },
  { key: "1099div", label: "Form 1099-DIV", desc: "Dividends and distributions" },
  { key: "1099b", label: "Form 1099-B", desc: "Proceeds from broker and barter exchange transactions" },
  { key: "1099g-box2", label: "Form 1099-G Box 2", desc: "State or local income tax refunds, credits, or offsets" },
  { key: "schedule-b", label: "Schedule B - Forms 1099-INT, DIV, OID", desc: "Interest income, dividends, and distributions" },
  { key: "1099r", label: "Form 1099-R, RRB, SSA", desc: "Distributions from pensions, annuities, retirement, IRAs, social security, etc." },
  { key: "8915f", label: "Form 8915-F", desc: "Qualified Disaster Retirement Plan Distributions and Repayments" },
  { key: "1099g-box1", label: "Form 1099-G Box 1", desc: "Unemployment Compensation" },
  { key: "1099misc", label: "1099-MISC", desc: "Miscellaneous income" },
  { key: "1099nec", label: "1099-NEC", desc: "Nonemployee compensation" },
  { key: "schedule-c", label: "Schedule C", desc: "Profit or Loss from Business" },
  { key: "1099k", label: "Form 1099-K", desc: "Payment card and third party network transactions" },
  { key: "schedule-e", label: "Schedule E", desc: "Supplemental Income and Loss from Rents and Royalties" },
  { key: "schedule-d", label: "Schedule D/Form 8949", desc: "Capital gains and losses reported on Schedule D" },
  { key: "schedule-f", label: "Schedule F", desc: "Profit or Loss from Farming" },
  { key: "schedule-se", label: "Schedule SE", desc: "Self-Employment Tax calculation" },
  { key: "form-8962", label: "Form 8962", desc: "Premium Tax Credit (ACA Marketplace)" },
  { key: "form-8812", label: "Schedule 8812", desc: "Child Tax Credit and Additional CTC" },
  { key: "form-2441", label: "Form 2441", desc: "Child and Dependent Care Expenses" },
  { key: "alimony", label: "Alimony Received", desc: "Payments from a former spouse under a legal agreement" },
  { key: "other-income", label: "Other Income", desc: "K-1 earnings, gambling winnings, cancellation of debt, etc." },
]

export default function FederalIncomePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const base = `/dashboard/returns/${id}`

  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={2025} />
      <main className="main">
        <div className="layout">
          <div className="content">
            <h1 className="page-title">Income</h1>

            <div className="form-list">
              {INCOME_FORMS.map((f) => (
                <div key={f.key} className="form-row">
                  <div className="form-info">
                    <div className="form-label">{f.label}</div>
                    <div className="form-desc">{f.desc}</div>
                  </div>
                  <button
                    className="begin-btn"
                    onClick={() => router.push(`${base}/federal/income/${f.key}`)}
                  >
                    BEGIN
                  </button>
                </div>
              ))}
            </div>

            <div className="nav-footer">
              <button className="back-btn" onClick={() => router.push(`${base}/basic-info`)}>BACK</button>
              <button className="continue-btn" onClick={() => router.push(`${base}/federal/deductions`)}>CONTINUE</button>
            </div>
          </div>

          {/* Return Summary sidebar */}
          <div className="summary-panel">
            <div className="summary-title">RETURN SUMM...</div>
            <div className="summary-row">
              <span className="summary-label">AGI</span>
              <span className="summary-value">$0</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Federal</span>
              <span className="summary-value">$0</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">State - AR</span>
              <span className="summary-value">$0</span>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .root { display: flex; min-height: 100vh; font-family: 'DM Sans', sans-serif; background: #f8fafc; }
        .main { flex: 1; margin-left: 220px; padding: 28px 32px; }
        .layout { display: flex; gap: 24px; }
        .content { flex: 1; }
        .page-title { font-size: 26px; font-weight: 700; color: #0f172a; margin-bottom: 24px; }
        .form-list { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 28px; }
        .form-row { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-bottom: 1px solid #f1f5f9; }
        .form-row:last-child { border-bottom: none; }
        .form-label { font-size: 14px; font-weight: 600; color: #0f172a; }
        .form-desc { font-size: 12px; color: #64748b; margin-top: 2px; }
        .begin-btn { background: #1e3a5f; color: #fff; border: none; padding: 8px 20px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; white-space: nowrap; letter-spacing: 0.5px; }
        .begin-btn:hover { background: #1e40af; }
        .nav-footer { display: flex; justify-content: space-between; }
        .back-btn, .continue-btn { background: #1e3a5f; color: #fff; border: none; padding: 10px 24px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .back-btn:hover, .continue-btn:hover { background: #1e40af; }
        .summary-panel { width: 160px; flex-shrink: 0; }
        .summary-title { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
        .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
        .summary-label { font-size: 13px; color: #64748b; }
        .summary-value { font-size: 13px; font-weight: 600; color: #0f172a; }
      `}</style>
    </div>
  )
}
