import { useState } from 'react'
import api from '../services/api'
import styles from './Form.module.css'
import AddressAutocomplete from '../components/AddressAutocomplete'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC'
]

const STD_DEDUCTION: Record<string, number> = {
  single: 14600,
  married_joint: 29200,
  married_separate: 14600,
  head_household: 21900,
}

function formatSSN(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 9)
  if (d.length <= 3) return d
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`
}

const STEPS = ['Personal', 'Income', 'Adjustments', 'Credits', 'Review']

const INIT = {
  tax_year: 2025,
  filing_status: 'single',
  first_name: '', last_name: '', ssn: '', dob: '',
  spouse_first_name: '', spouse_last_name: '', spouse_ssn: '',
  address: '', city: '', state: '', zip_code: '',
  dependent_count: '0',
  wages: '', federal_withholding: '', state_withholding: '',
  interest: '', dividends: '',
  unemployment_compensation: '', social_security_benefits: '',
  ira_distributions: '', other_income: '', estimated_tax_payments: '',
  student_loan_interest: '', ira_deduction: '',
  standard_deduction: true, itemized_deductions: '',
  child_tax_credit: '', earned_income_credit: '', other_credits: '',
}
type F = typeof INIT

function num(v: string | number) { return parseFloat(String(v)) || 0 }

function validateStep(step: number, f: F): Record<string, string> {
  const e: Record<string, string> = {}
  if (step === 1) {
    if (!f.first_name.trim()) e.first_name = 'Required'
    else if (!/^[A-Za-z\s'-]+$/.test(f.first_name)) e.first_name = 'Letters only'
    if (!f.last_name.trim()) e.last_name = 'Required'
    else if (!/^[A-Za-z\s'-]+$/.test(f.last_name)) e.last_name = 'Letters only'
    if (!/^\d{3}-\d{2}-\d{4}$/.test(f.ssn)) e.ssn = 'Enter a valid SSN (XXX-XX-XXXX)'
    if (!f.dob) e.dob = 'Required'
    if (!f.address.trim()) e.address = 'Required'
    if (!f.city.trim()) e.city = 'Required'
    if (!f.state) e.state = 'Required'
    if (!/^\d{5}$/.test(f.zip_code)) e.zip_code = '5-digit ZIP required'
    if (f.filing_status.startsWith('married')) {
      if (!f.spouse_first_name.trim()) e.spouse_first_name = 'Required'
      if (!f.spouse_last_name.trim()) e.spouse_last_name = 'Required'
      if (!/^\d{3}-\d{2}-\d{4}$/.test(f.spouse_ssn)) e.spouse_ssn = 'Valid SSN required'
    }
    if (isNaN(parseInt(f.dependent_count)) || parseInt(f.dependent_count) < 0)
      e.dependent_count = 'Enter 0 or more'
  }
  if (step === 2) {
    const total = num(f.wages) + num(f.interest) + num(f.dividends) +
      num(f.unemployment_compensation) + num(f.social_security_benefits) +
      num(f.ira_distributions) + num(f.other_income)
    if (total === 0) e.wages = 'At least one income source is required'
    const numFields = ['wages','federal_withholding','state_withholding','interest',
      'dividends','unemployment_compensation','social_security_benefits',
      'ira_distributions','other_income','estimated_tax_payments']
    numFields.forEach(k => {
      const v = num((f as any)[k])
      if ((f as any)[k] !== '' && v < 0) e[k] = 'Cannot be negative'
    })
  }
  if (step === 3) {
    if (num(f.student_loan_interest) > 2500)
      e.student_loan_interest = 'Maximum deduction is $2,500'
    if (num(f.student_loan_interest) < 0)
      e.student_loan_interest = 'Cannot be negative'
    if (num(f.ira_deduction) > 7000)
      e.ira_deduction = 'Maximum is $7,000 for 2024'
    if (num(f.ira_deduction) < 0)
      e.ira_deduction = 'Cannot be negative'
    if (!f.standard_deduction && num(f.itemized_deductions) <= 0)
      e.itemized_deductions = 'Enter your total itemized deductions'
  }
  return e
}

export default function TaxFiling1040() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<F>(INIT)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const isMarried = form.filing_status.startsWith('married')
  const stdDed = STD_DEDUCTION[form.filing_status] || 14600
  const autoChildCredit = (parseInt(form.dependent_count) || 0) * 2000

  const set = (k: string, v: any) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  const goNext = () => {
    const errs = validateStep(step, form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    if (step === 3 && autoChildCredit > 0 && !form.child_tax_credit)
      setForm(f => ({ ...f, child_tax_credit: String(autoChildCredit) }))
    setStep(s => s + 1)
  }

  const goBack = () => setStep(s => s - 1)

  const handleSubmit = async () => {
    setLoading(true)
    setSubmitError('')
    try {
      const res = await api.post('/tax/1040', {
        tax_year: form.tax_year,
        filing_status: form.filing_status,
        first_name: form.first_name,
        last_name: form.last_name,
        ssn: form.ssn,
        dob: form.dob,
        spouse_first_name: form.spouse_first_name || undefined,
        spouse_last_name: form.spouse_last_name || undefined,
        spouse_ssn: form.spouse_ssn || undefined,
        address: form.address,
        city: form.city,
        state: form.state,
        zip_code: form.zip_code,
        dependent_count: parseInt(form.dependent_count) || 0,
        wages: num(form.wages),
        federal_withholding: num(form.federal_withholding),
        state_withholding: num(form.state_withholding),
        interest: num(form.interest),
        dividends: num(form.dividends),
        unemployment_compensation: num(form.unemployment_compensation),
        social_security_benefits: num(form.social_security_benefits),
        ira_distributions: num(form.ira_distributions),
        other_income: num(form.other_income),
        estimated_tax_payments: num(form.estimated_tax_payments),
        student_loan_interest: num(form.student_loan_interest),
        ira_deduction: num(form.ira_deduction),
        standard_deduction: form.standard_deduction,
        itemized_deductions: num(form.itemized_deductions),
        child_tax_credit: num(form.child_tax_credit),
        earned_income_credit: num(form.earned_income_credit),
        other_credits: num(form.other_credits),
      })
      setResult(res.data)
    } catch (err: any) {
      setSubmitError(err.response?.data?.detail || 'Submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fe = (k: string) => errors[k]
    ? <span className={styles.fieldError}>{errors[k]}</span> : null
  const ic = (k: string) => errors[k] ? styles.inputError : ''

  if (result) return (
    <div className={styles.card}>
      <div className={styles.success}>Draft saved successfully!</div>
      <div className={styles.resultCard}>
        <div className={styles.resultRow}><span>Return ID</span><strong>#{result.id}</strong></div>
        <div className={styles.resultRow}><span>Tax Year</span><strong>{result.tax_year}</strong></div>
        <div className={styles.resultRow}><span>Status</span><strong style={{ textTransform: 'capitalize' }}>{result.status}</strong></div>
        {result.refund_amount_cents > 0 && (
          <div className={`${styles.resultRow} ${styles.refundRow}`}>
            <span>Estimated Refund</span>
            <strong className={styles.refundAmount}>${(result.refund_amount_cents / 100).toFixed(2)}</strong>
          </div>
        )}
        {result.tax_owed_cents > 0 && (
          <div className={`${styles.resultRow} ${styles.owedRow}`}>
            <span>Balance Due</span>
            <strong className={styles.owedAmount}>${(result.tax_owed_cents / 100).toFixed(2)}</strong>
          </div>
        )}
        {result.refund_amount_cents === 0 && result.tax_owed_cents === 0 && (
          <div className={styles.resultRow}><span>Result</span><strong>No refund / No balance due</strong></div>
        )}
      </div>
      <p className={styles.disclaimer}>
        Your draft has been saved. Download or email your <strong>DRAFT PDF</strong> from the dashboard to review with your advisor.
        When ready, click <strong>"Submit for Filing"</strong> on the dashboard to file your return.
      </p>
    </div>
  )

  return (
    <div className={styles.card}>
      <h2>Form 1040 — Individual Tax Return</h2>

      <div className={styles.stepper}>
        {STEPS.map((label, i) => (
          <div key={label}
            className={[styles.stepItem, step === i+1 ? styles.stepActive : '', step > i+1 ? styles.stepDone : ''].join(' ')}>
            <div className={styles.stepCircle}>{step > i+1 ? '✓' : i+1}</div>
            <span className={styles.stepLabel}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── Step 1: Personal Information ── */}
      {step === 1 && (
        <div className={styles.stepContent}>
          <div className={styles.row}>
            <label>Tax Year
              <select value={form.tax_year} onChange={e => set('tax_year', parseInt(e.target.value))}>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
                <option value={2023}>2023</option>
                <option value={2022}>2022</option>
              </select>
            </label>
            <label>Filing Status
              <select value={form.filing_status} onChange={e => set('filing_status', e.target.value)}>
                <option value="single">Single</option>
                <option value="married_joint">Married Filing Jointly</option>
                <option value="married_separate">Married Filing Separately</option>
                <option value="head_household">Head of Household</option>
              </select>
            </label>
          </div>

          <h3 className={styles.sectionTitle}>Your Information</h3>
          <div className={styles.row}>
            <label>First Name
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)}
                className={ic('first_name')} autoComplete="given-name" />
              {fe('first_name')}
            </label>
            <label>Last Name
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)}
                className={ic('last_name')} autoComplete="family-name" />
              {fe('last_name')}
            </label>
          </div>
          <div className={styles.row}>
            <label>Social Security Number
              <input placeholder="XXX-XX-XXXX" value={form.ssn}
                onChange={e => set('ssn', formatSSN(e.target.value))}
                className={ic('ssn')} inputMode="numeric" maxLength={11} />
              {fe('ssn')}
            </label>
            <label>Date of Birth
              <input type="date" value={form.dob}
                onChange={e => set('dob', e.target.value)} className={ic('dob')} />
              {fe('dob')}
            </label>
          </div>

          {isMarried && (
            <>
              <h3 className={styles.sectionTitle}>Spouse Information</h3>
              <div className={styles.row}>
                <label>Spouse First Name
                  <input value={form.spouse_first_name}
                    onChange={e => set('spouse_first_name', e.target.value)}
                    className={ic('spouse_first_name')} />
                  {fe('spouse_first_name')}
                </label>
                <label>Spouse Last Name
                  <input value={form.spouse_last_name}
                    onChange={e => set('spouse_last_name', e.target.value)}
                    className={ic('spouse_last_name')} />
                  {fe('spouse_last_name')}
                </label>
              </div>
              <label>Spouse SSN
                <input placeholder="XXX-XX-XXXX" value={form.spouse_ssn}
                  onChange={e => set('spouse_ssn', formatSSN(e.target.value))}
                  className={ic('spouse_ssn')} inputMode="numeric" maxLength={11} />
                {fe('spouse_ssn')}
              </label>
            </>
          )}

          <h3 className={styles.sectionTitle}>Home Address</h3>
          <label>Street Address
            <AddressAutocomplete value={form.address} onChange={v => set('address', v)}
              onSelect={r => setForm(f => ({ ...f, address: r.address, city: r.city, state: r.state, zip_code: r.zip }))}
              placeholder="Start typing your address..." />
            {fe('address')}
          </label>
          <div className={styles.row3}>
            <label>City
              <input value={form.city} onChange={e => set('city', e.target.value)} className={ic('city')} />
              {fe('city')}
            </label>
            <label>State
              <select value={form.state} onChange={e => set('state', e.target.value)} className={ic('state')}>
                <option value="">State</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {fe('state')}
            </label>
            <label>ZIP Code
              <input value={form.zip_code}
                onChange={e => set('zip_code', e.target.value.replace(/\D/g, '').slice(0, 5))}
                className={ic('zip_code')} inputMode="numeric" maxLength={5} />
              {fe('zip_code')}
            </label>
          </div>

          <h3 className={styles.sectionTitle}>Dependents</h3>
          <label>Qualifying children under age 17
            <input type="number" min="0" max="20" value={form.dependent_count}
              onChange={e => set('dependent_count', e.target.value)}
              className={ic('dependent_count')} style={{ maxWidth: '120px' }} />
            {fe('dependent_count')}
          </label>
        </div>
      )}

      {/* ── Step 2: Income ── */}
      {step === 2 && (
        <div className={styles.stepContent}>
          <h3 className={styles.sectionTitle}>W-2 Employment Income</h3>
          <label>Wages, Salaries, Tips <span className={styles.hint}>(W-2 Box 1)</span>
            <input type="number" step="0.01" min="0" value={form.wages}
              onChange={e => set('wages', e.target.value)}
              className={ic('wages')} placeholder="0.00" />
            {fe('wages')}
          </label>
          <div className={styles.row}>
            <label>Federal Income Tax Withheld <span className={styles.hint}>(W-2 Box 2)</span>
              <input type="number" step="0.01" min="0" value={form.federal_withholding}
                onChange={e => set('federal_withholding', e.target.value)}
                className={ic('federal_withholding')} placeholder="0.00" />
              {fe('federal_withholding')}
            </label>
            <label>State Income Tax Withheld <span className={styles.hint}>(W-2 Box 17)</span>
              <input type="number" step="0.01" min="0" value={form.state_withholding}
                onChange={e => set('state_withholding', e.target.value)} placeholder="0.00" />
            </label>
          </div>

          <h3 className={styles.sectionTitle}>Other Income <span className={styles.hint}>— leave blank if none</span></h3>
          <div className={styles.row}>
            <label>Interest Income <span className={styles.hint}>(1099-INT)</span>
              <input type="number" step="0.01" min="0" value={form.interest}
                onChange={e => set('interest', e.target.value)} placeholder="0.00" />
            </label>
            <label>Dividends <span className={styles.hint}>(1099-DIV)</span>
              <input type="number" step="0.01" min="0" value={form.dividends}
                onChange={e => set('dividends', e.target.value)} placeholder="0.00" />
            </label>
          </div>
          <div className={styles.row}>
            <label>Unemployment Compensation <span className={styles.hint}>(1099-G)</span>
              <input type="number" step="0.01" min="0" value={form.unemployment_compensation}
                onChange={e => set('unemployment_compensation', e.target.value)} placeholder="0.00" />
            </label>
            <label>IRA / Pension Distributions <span className={styles.hint}>(1099-R)</span>
              <input type="number" step="0.01" min="0" value={form.ira_distributions}
                onChange={e => set('ira_distributions', e.target.value)} placeholder="0.00" />
            </label>
          </div>
          <div className={styles.row}>
            <label>Social Security Benefits <span className={styles.hint}>(SSA-1099, full amount)</span>
              <input type="number" step="0.01" min="0" value={form.social_security_benefits}
                onChange={e => set('social_security_benefits', e.target.value)} placeholder="0.00" />
            </label>
            <label>Other Income
              <input type="number" step="0.01" min="0" value={form.other_income}
                onChange={e => set('other_income', e.target.value)} placeholder="0.00" />
            </label>
          </div>

          <h3 className={styles.sectionTitle}>Prior Payments</h3>
          <label>Quarterly Estimated Tax Payments <span className={styles.hint}>(Form 1040-ES)</span>
            <input type="number" step="0.01" min="0" value={form.estimated_tax_payments}
              onChange={e => set('estimated_tax_payments', e.target.value)}
              placeholder="0.00" style={{ maxWidth: '200px' }} />
          </label>
        </div>
      )}

      {/* ── Step 3: Adjustments & Deductions ── */}
      {step === 3 && (
        <div className={styles.stepContent}>
          <h3 className={styles.sectionTitle}>Adjustments to Income <span className={styles.hint}>(above-the-line)</span></h3>
          <div className={styles.row}>
            <label>Student Loan Interest Paid <span className={styles.hint}>max $2,500</span>
              <input type="number" step="0.01" min="0" max="2500" value={form.student_loan_interest}
                onChange={e => set('student_loan_interest', e.target.value)}
                className={ic('student_loan_interest')} placeholder="0.00" />
              {fe('student_loan_interest')}
            </label>
            <label>IRA Contribution Deduction <span className={styles.hint}>max $7,000</span>
              <input type="number" step="0.01" min="0" max="7000" value={form.ira_deduction}
                onChange={e => set('ira_deduction', e.target.value)}
                className={ic('ira_deduction')} placeholder="0.00" />
              {fe('ira_deduction')}
            </label>
          </div>

          <h3 className={styles.sectionTitle}>Deductions</h3>
          <label className={styles.checkbox}>
            <input type="checkbox" checked={form.standard_deduction}
              onChange={e => set('standard_deduction', e.target.checked)} />
            Use Standard Deduction
            <span className={styles.hint}> — ${stdDed.toLocaleString()} for {form.filing_status.replace(/_/g, ' ')}</span>
          </label>
          {!form.standard_deduction && (
            <label>Total Itemized Deductions <span className={styles.hint}>(Schedule A total)</span>
              <input type="number" step="0.01" min="0" value={form.itemized_deductions}
                onChange={e => set('itemized_deductions', e.target.value)}
                className={ic('itemized_deductions')} placeholder="0.00" />
              {fe('itemized_deductions')}
            </label>
          )}
        </div>
      )}

      {/* ── Step 4: Credits ── */}
      {step === 4 && (
        <div className={styles.stepContent}>
          <h3 className={styles.sectionTitle}>Tax Credits</h3>
          {autoChildCredit > 0 && (
            <div className={styles.infoBox}>
              Based on {form.dependent_count} qualifying {parseInt(form.dependent_count) === 1 ? 'child' : 'children'},
              your Child Tax Credit is estimated at <strong>${autoChildCredit.toLocaleString()}</strong>. Adjust if needed.
            </div>
          )}
          <label>Child Tax Credit <span className={styles.hint}>($2,000 per qualifying child under 17)</span>
            <input type="number" step="0.01" min="0" value={form.child_tax_credit}
              onChange={e => set('child_tax_credit', e.target.value)}
              className={ic('child_tax_credit')} placeholder="0.00" />
            {fe('child_tax_credit')}
          </label>
          <label>Earned Income Credit (EIC)
            <input type="number" step="0.01" min="0" value={form.earned_income_credit}
              onChange={e => set('earned_income_credit', e.target.value)} placeholder="0.00" />
          </label>
          <label>Other Credits <span className={styles.hint}>(education, energy, foreign tax, etc.)</span>
            <input type="number" step="0.01" min="0" value={form.other_credits}
              onChange={e => set('other_credits', e.target.value)} placeholder="0.00" />
          </label>
        </div>
      )}

      {/* ── Step 5: Review & Submit ── */}
      {step === 5 && (
        <div className={styles.stepContent}>
          <h3 className={styles.sectionTitle}>Review Your Return</h3>
          {submitError && <div className={styles.error}>{submitError}</div>}

          <div className={styles.summaryGrid}>
            <div className={styles.summarySection}>
              <h4>Personal</h4>
              <div className={styles.summaryRow}><span>Tax Year</span><span>{form.tax_year}</span></div>
              <div className={styles.summaryRow}><span>Filing Status</span><span>{form.filing_status.replace(/_/g, ' ')}</span></div>
              <div className={styles.summaryRow}><span>Name</span><span>{form.first_name} {form.last_name}</span></div>
              <div className={styles.summaryRow}><span>Dependents (under 17)</span><span>{form.dependent_count}</span></div>
              <div className={styles.summaryRow}><span>Address</span><span>{form.city}, {form.state} {form.zip_code}</span></div>
            </div>

            <div className={styles.summarySection}>
              <h4>Income</h4>
              {num(form.wages) > 0 && <div className={styles.summaryRow}><span>Wages</span><span>${num(form.wages).toLocaleString()}</span></div>}
              {num(form.federal_withholding) > 0 && <div className={styles.summaryRow}><span>Federal Withheld</span><span>${num(form.federal_withholding).toLocaleString()}</span></div>}
              {num(form.state_withholding) > 0 && <div className={styles.summaryRow}><span>State Withheld</span><span>${num(form.state_withholding).toLocaleString()}</span></div>}
              {num(form.interest) > 0 && <div className={styles.summaryRow}><span>Interest</span><span>${num(form.interest).toLocaleString()}</span></div>}
              {num(form.dividends) > 0 && <div className={styles.summaryRow}><span>Dividends</span><span>${num(form.dividends).toLocaleString()}</span></div>}
              {num(form.unemployment_compensation) > 0 && <div className={styles.summaryRow}><span>Unemployment</span><span>${num(form.unemployment_compensation).toLocaleString()}</span></div>}
              {num(form.ira_distributions) > 0 && <div className={styles.summaryRow}><span>IRA Distributions</span><span>${num(form.ira_distributions).toLocaleString()}</span></div>}
              {num(form.social_security_benefits) > 0 && <div className={styles.summaryRow}><span>Social Security</span><span>${num(form.social_security_benefits).toLocaleString()}</span></div>}
              {num(form.other_income) > 0 && <div className={styles.summaryRow}><span>Other Income</span><span>${num(form.other_income).toLocaleString()}</span></div>}
              {num(form.estimated_tax_payments) > 0 && <div className={styles.summaryRow}><span>Est. Tax Payments</span><span>${num(form.estimated_tax_payments).toLocaleString()}</span></div>}
            </div>

            <div className={styles.summarySection}>
              <h4>Deductions &amp; Credits</h4>
              <div className={styles.summaryRow}>
                <span>Deduction</span>
                <span>{form.standard_deduction ? `Standard ($${stdDed.toLocaleString()})` : `Itemized ($${num(form.itemized_deductions).toLocaleString()})`}</span>
              </div>
              {num(form.student_loan_interest) > 0 && <div className={styles.summaryRow}><span>Student Loan Interest</span><span>${num(form.student_loan_interest).toLocaleString()}</span></div>}
              {num(form.ira_deduction) > 0 && <div className={styles.summaryRow}><span>IRA Deduction</span><span>${num(form.ira_deduction).toLocaleString()}</span></div>}
              {num(form.child_tax_credit) > 0 && <div className={styles.summaryRow}><span>Child Tax Credit</span><span>${num(form.child_tax_credit).toLocaleString()}</span></div>}
              {num(form.earned_income_credit) > 0 && <div className={styles.summaryRow}><span>Earned Income Credit</span><span>${num(form.earned_income_credit).toLocaleString()}</span></div>}
              {num(form.other_credits) > 0 && <div className={styles.summaryRow}><span>Other Credits</span><span>${num(form.other_credits).toLocaleString()}</span></div>}
            </div>
          </div>

          <button className={styles.btnSubmit} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Tax Return'}
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className={styles.stepNav}>
        {step > 1 && (
          <button className={styles.btnBack} onClick={goBack}>← Back</button>
        )}
        {step < 5 && (
          <button className={styles.btnSubmit} onClick={goNext} style={{ marginLeft: step === 1 ? 'auto' : undefined }}>
            Continue →
          </button>
        )}
      </div>
    </div>
  )
}
