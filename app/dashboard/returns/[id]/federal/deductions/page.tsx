"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../../ReturnNav"

export default function DeductionsPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const base = `/dashboard/returns/${id}`
  const [saving, setSaving] = useState(false)
  const [useItemized, setUseItemized] = useState(false)
  const [form, setForm] = useState({
    // Medical & Dental (Line 1-4)
    medicalExpenses: "",
    // State & Local Taxes (Lines 5-6) — SALT cap $10,000
    stateLocalIncomeTax: "",
    stateLocalSalesTax: "",
    useSalesTax: false,
    realEstateTax: "",
    personalPropertyTax: "",
    otherTaxes: "",
    // Interest (Lines 8-9)
    homeMortgageInterest1098: "",
    homeMortgageInterestNo1098: "",
    mortgageInsurancePremiums: "",
    investmentInterest: "",
    // Gifts to Charity (Lines 11-14)
    cashCheckGifts: "",
    nonCashGifts: "",
    carryoverPriorYear: "",
    // Casualty & Theft (Line 15)
    casualtyTheftLoss: "",
    // Other Itemized Deductions (Line 16)
    otherDeductions: "",
    // Standard deduction info
    filingStatus: "MARRIED_FILING_JOINTLY",
    over65Taxpayer: false,
    over65Spouse: false,
    blindTaxpayer: false,
    blindSpouse: false,
  })

  function set(f: string, v: any) { setForm(p => ({ ...p, [f]: v })) }

  // Standard deduction calculator
  const STD_DEDUCTIONS: Record<string, number> = {
    SINGLE: 15000,
    MARRIED_FILING_JOINTLY: 30000,
    MARRIED_FILING_SEPARATELY: 15000,
    HEAD_OF_HOUSEHOLD: 22500,
    QUALIFYING_SURVIVING_SPOUSE: 30000,
  }

  function calcStandardDeduction() {
    let base = STD_DEDUCTIONS[form.filingStatus] ?? 15000
    // Additional for 65+ or blind: $1,600 single/HOH, $1,350 MFJ
    const extra = ["SINGLE","HEAD_OF_HOUSEHOLD"].includes(form.filingStatus) ? 1600 : 1350
    if (form.over65Taxpayer) base += extra
    if (form.over65Spouse && form.filingStatus === "MARRIED_FILING_JOINTLY") base += extra
    if (form.blindTaxpayer) base += extra
    if (form.blindSpouse && form.filingStatus === "MARRIED_FILING_JOINTLY") base += extra
    return base
  }

  function calcItemized() {
    const med = Math.max(0, (parseFloat(form.medicalExpenses)||0) * 0.925) // AGI threshold simplified
    const salt = Math.min(10000,
      (parseFloat(form.useSalesTax ? form.stateLocalSalesTax : form.stateLocalIncomeTax)||0) +
      (parseFloat(form.realEstateTax)||0) +
      (parseFloat(form.personalPropertyTax)||0)
    )
    const interest = (parseFloat(form.homeMortgageInterest1098)||0) +
      (parseFloat(form.homeMortgageInterestNo1098)||0) +
      (parseFloat(form.mortgageInsurancePremiums)||0) +
      (parseFloat(form.investmentInterest)||0)
    const charity = (parseFloat(form.cashCheckGifts)||0) +
      (parseFloat(form.nonCashGifts)||0) +
      (parseFloat(form.carryoverPriorYear)||0)
    const casualty = parseFloat(form.casualtyTheftLoss)||0
    const other = parseFloat(form.otherDeductions)||0
    return med + salt + interest + charity + casualty + other
  }

  const standardDeduction = calcStandardDeduction()
  const itemizedTotal = calcItemized()
  const recommendItemized = itemizedTotal > standardDeduction

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/returns/${id}/deductions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, useItemized, standardDeduction, itemizedTotal }),
    })
    setSaving(false)
    router.push(`${base}/federal/other-taxes`)
  }

  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={2025} />
      <main className="main">
        <div className="layout">
          <div className="content">
            <h1 className="title">Deductions</h1>

            {/* Standard vs Itemized toggle */}
            <div className="card toggle-card">
              <h2>Standard or Itemized Deduction?</h2>
              <div className="deduction-choice">
                <div
                  className={`choice-box ${!useItemized ? "selected" : ""}`}
                  onClick={() => setUseItemized(false)}
                >
                  <div className="choice-label">Standard Deduction</div>
                  <div className="choice-amount">${standardDeduction.toLocaleString()}</div>
                  {!recommendItemized && <div className="choice-rec">✓ Recommended</div>}
                </div>
                <div
                  className={`choice-box ${useItemized ? "selected" : ""}`}
                  onClick={() => setUseItemized(true)}
                >
                  <div className="choice-label">Itemized (Schedule A)</div>
                  <div className="choice-amount">${itemizedTotal.toLocaleString("en-US", {minimumFractionDigits:2})}</div>
                  {recommendItemized && <div className="choice-rec">✓ Recommended</div>}
                </div>
              </div>
              <div className="std-options">
                <p className="std-note">Standard deduction adjustments:</p>
                <div className="cb-grid">
                  <CB label="Taxpayer is age 65 or older" checked={form.over65Taxpayer} onChange={v => set("over65Taxpayer",v)} />
                  <CB label="Taxpayer is blind" checked={form.blindTaxpayer} onChange={v => set("blindTaxpayer",v)} />
                  <CB label="Spouse is age 65 or older" checked={form.over65Spouse} onChange={v => set("over65Spouse",v)} />
                  <CB label="Spouse is blind" checked={form.blindSpouse} onChange={v => set("blindSpouse",v)} />
                </div>
              </div>
            </div>

            {/* Schedule A fields — always shown so preparer can compare */}
            <div className="card">
              <h2>Medical and Dental Expenses <span className="line-ref">Line 1</span></h2>
              <p className="note">Only the amount exceeding 7.5% of AGI is deductible (Line 4)</p>
              <MF label="Total medical and dental expenses paid" value={form.medicalExpenses} onChange={v => set("medicalExpenses",v)} />
            </div>

            <div className="card">
              <h2>Taxes You Paid <span className="line-ref">Lines 5-6</span></h2>
              <p className="note">State and local tax deduction is capped at $10,000 ($5,000 if MFS)</p>
              <div className="radio-row">
                <Radio label="State & local income taxes" checked={!form.useSalesTax} onChange={() => set("useSalesTax", false)} />
                <Radio label="State & local general sales taxes" checked={form.useSalesTax} onChange={() => set("useSalesTax", true)} />
              </div>
              {!form.useSalesTax
                ? <MF label="State and local income taxes (Line 5a)" value={form.stateLocalIncomeTax} onChange={v => set("stateLocalIncomeTax",v)} />
                : <MF label="State and local general sales taxes (Line 5a)" value={form.stateLocalSalesTax} onChange={v => set("stateLocalSalesTax",v)} />
              }
              <MF label="Real estate taxes (Line 5b)" value={form.realEstateTax} onChange={v => set("realEstateTax",v)} />
              <MF label="Personal property taxes (Line 5c)" value={form.personalPropertyTax} onChange={v => set("personalPropertyTax",v)} />
              <MF label="Other taxes (Line 6)" value={form.otherTaxes} onChange={v => set("otherTaxes",v)} />
              <div className="salt-total">
                <span>SALT Total (capped at $10,000):</span>
                <span className="salt-val">${Math.min(10000, (parseFloat(form.useSalesTax ? form.stateLocalSalesTax : form.stateLocalIncomeTax)||0) + (parseFloat(form.realEstateTax)||0) + (parseFloat(form.personalPropertyTax)||0)).toLocaleString()}</span>
              </div>
            </div>

            <div className="card">
              <h2>Interest You Paid <span className="line-ref">Lines 8-9</span></h2>
              <MF label="Home mortgage interest reported on Form 1098 (Line 8a)" value={form.homeMortgageInterest1098} onChange={v => set("homeMortgageInterest1098",v)} />
              <MF label="Home mortgage interest not reported on Form 1098 (Line 8b)" value={form.homeMortgageInterestNo1098} onChange={v => set("homeMortgageInterestNo1098",v)} />
              <MF label="Mortgage insurance premiums (Line 8d)" value={form.mortgageInsurancePremiums} onChange={v => set("mortgageInsurancePremiums",v)} />
              <MF label="Investment interest (Line 9)" value={form.investmentInterest} onChange={v => set("investmentInterest",v)} />
            </div>

            <div className="card">
              <h2>Gifts to Charity <span className="line-ref">Lines 11-14</span></h2>
              <MF label="Cash or check contributions (Line 11)" value={form.cashCheckGifts} onChange={v => set("cashCheckGifts",v)} />
              <MF label="Non-cash contributions (Line 12)" value={form.nonCashGifts} onChange={v => set("nonCashGifts",v)} />
              <MF label="Carryover from prior year (Line 13)" value={form.carryoverPriorYear} onChange={v => set("carryoverPriorYear",v)} />
            </div>

            <div className="card">
              <h2>Casualty and Theft Losses <span className="line-ref">Line 15</span></h2>
              <p className="note">Only federally declared disaster losses qualify after 2017 TCJA</p>
              <MF label="Casualty and theft loss from Form 4684 (Line 15)" value={form.casualtyTheftLoss} onChange={v => set("casualtyTheftLoss",v)} />
            </div>

            <div className="card">
              <h2>Other Itemized Deductions <span className="line-ref">Line 16</span></h2>
              <MF label="Other itemized deductions (gambling losses, etc.)" value={form.otherDeductions} onChange={v => set("otherDeductions",v)} />
            </div>

            <div className="nav-footer">
              <button className="back-btn" onClick={() => router.push(`${base}/federal/income`)}>BACK</button>
              <button className="continue-btn" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "CONTINUE"}</button>
            </div>
          </div>

          {/* Live summary sidebar */}
          <div className="sidebar">
            <div className="sidebar-title">DEDUCTION SUMMARY</div>
            <div className="summary-row">
              <span>Standard</span>
              <span>${standardDeduction.toLocaleString()}</span>
            </div>
            <div className="summary-row">
              <span>Itemized</span>
              <span>${itemizedTotal.toLocaleString("en-US",{minimumFractionDigits:2})}</span>
            </div>
            <div className={`summary-row total ${recommendItemized ? "itemized-wins" : "standard-wins"}`}>
              <span>Using</span>
              <span>{useItemized ? "Itemized" : "Standard"}</span>
            </div>
            <div className="sidebar-divider" />
            <div className="sidebar-title">BREAKDOWN</div>
            <div className="summary-row"><span>Medical</span><span>${(parseFloat(form.medicalExpenses)||0).toLocaleString()}</span></div>
            <div className="summary-row"><span>SALT (capped)</span><span>${Math.min(10000,(parseFloat(form.useSalesTax?form.stateLocalSalesTax:form.stateLocalIncomeTax)||0)+(parseFloat(form.realEstateTax)||0)+(parseFloat(form.personalPropertyTax)||0)).toLocaleString()}</span></div>
            <div className="summary-row"><span>Interest</span><span>${((parseFloat(form.homeMortgageInterest1098)||0)+(parseFloat(form.homeMortgageInterestNo1098)||0)+(parseFloat(form.mortgageInsurancePremiums)||0)+(parseFloat(form.investmentInterest)||0)).toLocaleString()}</span></div>
            <div className="summary-row"><span>Charity</span><span>${((parseFloat(form.cashCheckGifts)||0)+(parseFloat(form.nonCashGifts)||0)+(parseFloat(form.carryoverPriorYear)||0)).toLocaleString()}</span></div>
            <div className="summary-row"><span>Casualty</span><span>${(parseFloat(form.casualtyTheftLoss)||0).toLocaleString()}</span></div>
            <div className="summary-row"><span>Other</span><span>${(parseFloat(form.otherDeductions)||0).toLocaleString()}</span></div>
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
        .card h2{font-size:15px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:10px}
        .line-ref{font-size:11px;font-weight:400;color:#94a3b8;background:#f1f5f9;padding:2px 8px;border-radius:10px}
        .note{font-size:12px;color:#64748b;line-height:1.5}
        .toggle-card{}
        .deduction-choice{display:flex;gap:16px}
        .choice-box{flex:1;border:2px solid #e2e8f0;border-radius:10px;padding:18px;cursor:pointer;transition:all 0.15s;text-align:center}
        .choice-box:hover{border-color:#93c5fd;background:#f0f9ff}
        .choice-box.selected{border-color:#3b82f6;background:#eff6ff}
        .choice-label{font-size:13px;font-weight:500;color:#374151}
        .choice-amount{font-size:24px;font-weight:700;color:#0f172a;margin:8px 0}
        .choice-rec{font-size:12px;color:#16a34a;font-weight:600}
        .std-options{background:#f8fafc;border-radius:8px;padding:14px}
        .std-note{font-size:12px;color:#64748b;margin-bottom:10px}
        .cb-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .radio-row{display:flex;gap:24px}
        .field{display:flex;flex-direction:column;gap:5px}
        .field label{font-size:12px;font-weight:500;color:#374151}
        .field input{padding:9px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none}
        .field input:focus{border-color:#3b82f6}
        .money-input{display:flex;align-items:center;border:1px solid #d1d5db;border-radius:6px;overflow:hidden}
        .money-input span{padding:8px 10px;background:#f8fafc;font-size:13px;color:#64748b;border-right:1px solid #d1d5db}
        .money-input input{border:none;padding:8px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;flex:1}
        .salt-total{display:flex;justify-content:space-between;padding:10px 14px;background:#fef9c3;border:1px solid #fde047;border-radius:7px;font-size:13px;font-weight:500;color:#713f12}
        .salt-val{font-weight:700}
        .nav-footer{display:flex;justify-content:space-between;padding-top:8px}
        .back-btn,.continue-btn{background:#1e3a5f;color:#fff;border:none;padding:10px 24px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
        .back-btn:hover,.continue-btn:hover{background:#1e40af}
        .continue-btn:disabled{opacity:0.5;cursor:not-allowed}
        .sidebar{width:200px;flex-shrink:0;position:sticky;top:24px;align-self:flex-start;display:flex;flex-direction:column;gap:0}
        .sidebar-title{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;margin-top:16px}
        .sidebar-title:first-child{margin-top:0}
        .summary-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151}
        .summary-row.total{font-weight:700;font-size:14px}
        .summary-row.standard-wins{color:#16a34a}
        .summary-row.itemized-wins{color:#2563eb}
        .sidebar-divider{height:1px;background:#e2e8f0;margin:8px 0}
      `}</style>
    </div>
  )
}
function MF({ label, value, onChange }: any) {
  return <div className="field"><label>{label}</label><div className="money-input"><span>$</span><input type="number" step="0.01" min="0" value={value} onChange={e => onChange(e.target.value)} /></div></div>
}
function Radio({ label, checked, onChange }: any) {
  return <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:14,color:"#374151"}}><input type="radio" checked={checked} onChange={onChange} />{label}</label>
}
function CB({ label, checked, onChange }: any) {
  return <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:"#374151"}}><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />{label}</label>
}
