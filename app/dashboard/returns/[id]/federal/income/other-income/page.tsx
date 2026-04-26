"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../../../ReturnNav"

const OTHER_INCOME_TYPES = [
  "Alaska Permanent Fund Dividend",
  "Cancellation of Debt",
  "Gambling Winnings (W-2G)",
  "Hobby Income",
  "Income from Rental of Personal Property",
  "IRS Refund",
  "Jury Duty Pay",
  "K-1 Earnings",
  "NOL (Net Operating Loss)",
  "Other",
  "Prizes and Awards",
  "Recoveries",
  "Taxable Distributions from ABLE Account",
]

const OTHER_COMP_ITEMS = [
  { key: "scholarships", label: "Scholarships and Grants (Not Reported on W-2)" },
  { key: "fringe", label: "Fringe Benefits" },
  { key: "household", label: "Household Employee Income" },
  { key: "prisoner", label: "Prisoner Earned Income" },
  { key: "foreign", label: "Foreign Earned Compensation" },
  { key: "medicaid", label: "Medicaid Waiver Payments (Not Reported on W-2)" },
  { key: "gambling", label: "Other Gambling Income not reported on W-2G" },
  { key: "pr", label: "Section 933 Excluded Income from Puerto Rico" },
  { key: "strike", label: "Strike Benefits Received" },
]

export default function OtherIncomePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const base = `/dashboard/returns/${id}`

  const [activeTab, setActiveTab] = useState<"other" | "compensation">("other")
  const [saving, setSaving] = useState(false)

  // Other Income
  const [whose, setWhose] = useState("taxpayer")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [earnedIncome, setEarnedIncome] = useState(false)

  // Compensation sub-forms
  const [scholarshipTaxpayer, setScholarshipTaxpayer] = useState("")
  const [scholarshipSpouse, setScholarshipSpouse] = useState("")
  const [fringeTaxpayer, setFringeTaxpayer] = useState<boolean | null>(null)
  const [fringeSpouse, setFringeSpouse] = useState<boolean | null>(null)
  const [householdWhose, setHouseholdWhose] = useState("taxpayer")
  const [householdAmount, setHouseholdAmount] = useState("")
  const [prisonerTaxpayer, setPrisonerTaxpayer] = useState("")
  const [prisonerSpouse, setPrisonerSpouse] = useState("")
  const [medicaidTaxpayer, setMedicaidTaxpayer] = useState("")
  const [medicaidSpouse, setMedicaidSpouse] = useState("")
  const [gamblingWinT, setGamblingWinT] = useState("")
  const [gamblingLossT, setGamblingLossT] = useState("")
  const [gamblingWinS, setGamblingWinS] = useState("")
  const [gamblingLossS, setGamblingLossS] = useState("")
  const [isPRResident, setIsPRResident] = useState<boolean | null>(null)
  const [strikeTaxpayer, setStrikeTaxpayer] = useState("")
  const [strikeSpouse, setStrikeSpouse] = useState("")
  const [activeComp, setActiveComp] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/returns/${id}/income/other`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ whose, description, amount, earnedIncome }),
    })
    setSaving(false)
    router.push(`${base}/federal/income`)
  }

  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={2025} />
      <main className="main">
        <div className="breadcrumb">Income &rsaquo; Other Income</div>
        <h1 className="page-title">Other Income</h1>

        <button className="cancel-btn" onClick={() => router.push(`${base}/federal/income`)}>CANCEL</button>

        <div className="info-box">
          <span className="info-icon">ℹ</span>
          <p>Income reported here will carry to Line 8 of Schedule 1. Examples can include income reported on Form 1099-MISC, Boxes 3 and 8 as well as qualifying hobby related income to name a few.</p>
        </div>

        {/* Other Income entry */}
        <div className="card">
          <h2 className="card-title">Other Income Entry</h2>
          <div className="radio-row">
            <Radio label="Taxpayer" checked={whose === "taxpayer"} onChange={() => setWhose("taxpayer")} />
            <Radio label="Spouse" checked={whose === "spouse"} onChange={() => setWhose("spouse")} />
          </div>
          <div className="field">
            <label>Other Income Description *</label>
            <select value={description} onChange={e => setDescription(e.target.value)}>
              <option value="">Select...</option>
              {OTHER_INCOME_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Amount of other income *</label>
            <div className="money-input"><span>$</span><input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></div>
          </div>
          <label className="checkbox-row">
            <input type="checkbox" checked={earnedIncome} onChange={e => setEarnedIncome(e.target.checked)} />
            Earned Income
          </label>
        </div>

        {/* Other Compensation section */}
        <div className="card">
          <h2 className="card-title">Other Compensation</h2>
          <div className="comp-list">
            {OTHER_COMP_ITEMS.map(item => (
              <div key={item.key}>
                <div
                  className={`comp-row ${activeComp === item.key ? "active" : ""}`}
                  onClick={() => setActiveComp(activeComp === item.key ? null : item.key)}
                >
                  {item.label}
                  <span className="comp-chevron">{activeComp === item.key ? "▲" : "▼"}</span>
                </div>

                {activeComp === item.key && (
                  <div className="comp-form">
                    {item.key === "scholarships" && (
                      <>
                        <MoneyField label="Taxpayer's scholarships and grants" value={scholarshipTaxpayer} onChange={setScholarshipTaxpayer} />
                        <MoneyField label="Spouse's scholarships and grants" value={scholarshipSpouse} onChange={setScholarshipSpouse} />
                      </>
                    )}
                    {item.key === "fringe" && (
                      <>
                        <p className="comp-note">Fringe benefits are taxable non-wage payments typically reported in box 1, 3, and 5 on your W-2.</p>
                        <div>
                          <p className="field-label">Were Fringe Benefits included on the Taxpayer's Form W-2, Box 1?</p>
                          <div className="radio-row">
                            <Radio label="Yes" checked={fringeTaxpayer === true} onChange={() => setFringeTaxpayer(true)} />
                            <Radio label="No" checked={fringeTaxpayer === false} onChange={() => setFringeTaxpayer(false)} />
                          </div>
                        </div>
                        <div>
                          <p className="field-label">Were Fringe Benefits included on the Spouse's Form W-2, Box 1?</p>
                          <div className="radio-row">
                            <Radio label="Yes" checked={fringeSpouse === true} onChange={() => setFringeSpouse(true)} />
                            <Radio label="No" checked={fringeSpouse === false} onChange={() => setFringeSpouse(false)} />
                          </div>
                        </div>
                      </>
                    )}
                    {item.key === "household" && (
                      <>
                        <div>
                          <p className="field-label">Whose form is this?</p>
                          <div className="radio-row">
                            <Radio label="Taxpayer" checked={householdWhose === "taxpayer"} onChange={() => setHouseholdWhose("taxpayer")} />
                            <Radio label="Spouse" checked={householdWhose === "spouse"} onChange={() => setHouseholdWhose("spouse")} />
                          </div>
                        </div>
                        <MoneyField label="Amount paid" value={householdAmount} onChange={setHouseholdAmount} />
                      </>
                    )}
                    {item.key === "prisoner" && (
                      <>
                        <div className="warning-box">
                          <span>⚠</span>
                          <p>Income entered below is used for prisoner earned income already reported on Form W-2 so that it can be subtracted from earned income for EITC purposes. If the prisoner earned income was not reported to you on Form W-2, do not enter that income below.</p>
                        </div>
                        <MoneyField label="Taxpayer's prisoner earned income" value={prisonerTaxpayer} onChange={setPrisonerTaxpayer} />
                        <MoneyField label="Spouse's prisoner earned income" value={prisonerSpouse} onChange={setPrisonerSpouse} />
                      </>
                    )}
                    {item.key === "medicaid" && (
                      <>
                        <MoneyField label="Taxpayer's Medicaid waiver payments" value={medicaidTaxpayer} onChange={setMedicaidTaxpayer} />
                        <MoneyField label="Spouse's Medicaid waiver payments" value={medicaidSpouse} onChange={setMedicaidSpouse} />
                      </>
                    )}
                    {item.key === "gambling" && (
                      <>
                        <MoneyField label="Taxpayer's gambling winnings" value={gamblingWinT} onChange={setGamblingWinT} />
                        <MoneyField label="Taxpayer's gambling losses" value={gamblingLossT} onChange={setGamblingLossT} />
                        <MoneyField label="Spouse's gambling winnings" value={gamblingWinS} onChange={setGamblingWinS} />
                        <MoneyField label="Spouse's gambling losses" value={gamblingLossS} onChange={setGamblingLossS} />
                      </>
                    )}
                    {item.key === "pr" && (
                      <>
                        <p className="field-label">Are you a bona fide resident of Puerto Rico? *</p>
                        <div className="radio-row">
                          <Radio label="Yes" checked={isPRResident === true} onChange={() => setIsPRResident(true)} />
                          <Radio label="No" checked={isPRResident === false} onChange={() => setIsPRResident(false)} />
                        </div>
                      </>
                    )}
                    {item.key === "strike" && (
                      <>
                        <MoneyField label="Taxpayer's strike benefits received" value={strikeTaxpayer} onChange={setStrikeTaxpayer} />
                        <MoneyField label="Spouse's strike benefits received" value={strikeSpouse} onChange={setStrikeSpouse} />
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <button className="cancel-btn" onClick={() => router.push(`${base}/federal/income`)}>CANCEL</button>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .root { display: flex; min-height: 100vh; font-family: 'DM Sans', sans-serif; background: #f8fafc; }
        .main { flex: 1; margin-left: 220px; padding: 24px 36px; display: flex; flex-direction: column; gap: 16px; }
        .breadcrumb { font-size: 12px; color: #94a3b8; }
        .page-title { font-size: 22px; font-weight: 700; color: #0f172a; }
        .cancel-btn { align-self: flex-start; background: #1e3a5f; color: #fff; border: none; padding: 9px 20px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .cancel-btn:hover { background: #1e40af; }
        .info-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px 16px; display: flex; gap: 10px; align-items: flex-start; }
        .info-icon { font-size: 16px; color: #3b82f6; flex-shrink: 0; }
        .info-box p { font-size: 13px; color: #1e40af; line-height: 1.5; }
        .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }
        .card-title { font-size: 15px; font-weight: 700; color: #0f172a; }
        .field { display: flex; flex-direction: column; gap: 5px; }
        .field label, .field-label { font-size: 13px; font-weight: 500; color: #374151; }
        .field select, .field input { padding: 9px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none; }
        .field select:focus, .field input:focus { border-color: #3b82f6; }
        .money-input { display: flex; align-items: center; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; }
        .money-input span { padding: 8px 10px; background: #f8fafc; font-size: 13px; color: #64748b; border-right: 1px solid #d1d5db; }
        .money-input input { border: none; padding: 8px; font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none; flex: 1; }
        .radio-row { display: flex; gap: 20px; }
        .checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #374151; cursor: pointer; }
        .comp-list { display: flex; flex-direction: column; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
        .comp-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; font-size: 14px; color: #0f172a; cursor: pointer; border-bottom: 1px solid #f1f5f9; transition: background 0.1s; }
        .comp-row:last-child { border-bottom: none; }
        .comp-row:hover { background: #f8fafc; }
        .comp-row.active { background: #eff6ff; color: #1e40af; }
        .comp-chevron { font-size: 10px; color: #94a3b8; }
        .comp-form { padding: 16px 18px; background: #fafafa; border-bottom: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 14px; }
        .comp-note { font-size: 12px; color: #64748b; line-height: 1.5; }
        .warning-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 7px; padding: 12px 14px; display: flex; gap: 10px; font-size: 12px; color: #92400e; line-height: 1.5; }
      `}</style>
    </div>
  )
}

function MoneyField({ label, value, onChange }: any) {
  return <div className="field"><label>{label}</label><div className="money-input"><span>$</span><input type="number" step="0.01" value={value} onChange={e => onChange(e.target.value)} /></div></div>
}
function Radio({ label, checked, onChange }: any) {
  return <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:14,color:"#374151"}}><input type="radio" checked={checked} onChange={onChange} />{label}</label>
}
