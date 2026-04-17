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

function formatSSN(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 9)
  if (d.length <= 3) return d
  if (d.length <= 5) return `${d.slice(0,3)}-${d.slice(3)}`
  return `${d.slice(0,3)}-${d.slice(3,5)}-${d.slice(5)}`
}

function formatEIN(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 9)
  if (d.length <= 2) return d
  return `${d.slice(0,2)}-${d.slice(2)}`
}

type FormType = 'schedule_c' | '1120s' | '1065'

const isValidSSN = (v: string) => /^\d{3}-\d{2}-\d{4}$/.test(v)
const isValidEIN = (v: string) => /^\d{2}-\d{7}$/.test(v)
const isValidZIP = (v: string) => /^\d{5}$/.test(v)

function validateCommon(f: any): Record<string, string> {
  const e: Record<string, string> = {}
  if (!f.address?.trim()) e.address = 'Address is required'
  if (!f.city?.trim()) e.city = 'City is required'
  if (!f.state) e.state = 'Select a state'
  if (!isValidZIP(f.zip_code)) e.zip_code = 'Enter a valid 5-digit ZIP'
  const gr = parseFloat(f.gross_receipts)
  if (isNaN(gr) || gr < 0) e.gross_receipts = 'Enter a valid amount'
  return e
}

function validateScheduleC(f: any): Record<string, string> {
  const e = validateCommon(f)
  if (!f.first_name?.trim()) e.first_name = 'Required'
  else if (!/^[A-Za-z\s'-]+$/.test(f.first_name)) e.first_name = 'Letters only'
  if (!f.last_name?.trim()) e.last_name = 'Required'
  else if (!/^[A-Za-z\s'-]+$/.test(f.last_name)) e.last_name = 'Letters only'
  if (!isValidSSN(f.ssn)) e.ssn = 'Enter a valid SSN (XXX-XX-XXXX)'
  if (!f.business_name?.trim()) e.business_name = 'Business name is required'
  if (!f.principal_business?.trim()) e.principal_business = 'Principal business is required'
  if (f.ein && !isValidEIN(f.ein)) e.ein = 'Enter a valid EIN (XX-XXXXXXX)'
  return e
}

function validate1120S(f: any): Record<string, string> {
  const e = validateCommon(f)
  if (!f.corporation_name?.trim()) e.corporation_name = 'Corporation name is required'
  if (!isValidEIN(f.ein)) e.ein = 'Enter a valid EIN (XX-XXXXXXX)'
  if (!f.date_incorporated) e.date_incorporated = 'Date incorporated is required'
  if (!f.state_incorporated) e.state_incorporated = 'Select state of incorporation'
  const sc = parseInt(f.shareholder_count)
  if (isNaN(sc) || sc < 1) e.shareholder_count = 'Must have at least 1 shareholder'
  return e
}

function validate1065(f: any): Record<string, string> {
  const e = validateCommon(f)
  if (!f.partnership_name?.trim()) e.partnership_name = 'Partnership name is required'
  if (!isValidEIN(f.ein)) e.ein = 'Enter a valid EIN (XX-XXXXXXX)'
  if (!f.date_formed) e.date_formed = 'Date formed is required'
  if (!f.state_formed) e.state_formed = 'Select state of formation'
  const pc = parseInt(f.partner_count)
  if (isNaN(pc) || pc < 2) e.partner_count = 'Must have at least 2 partners'
  return e
}

const FORM_LABELS: Record<FormType, string> = {
  schedule_c: 'Schedule C — Sole Proprietor / Self-Employed',
  '1120s': 'Form 1120-S — S-Corporation',
  '1065': 'Form 1065 — Partnership / LLC',
}

const INITIAL_SCHEDULE_C = {
  tax_year: 2025, first_name: '', last_name: '', ssn: '',
  business_name: '', ein: '', address: '', city: '', state: '', zip_code: '',
  principal_business: '',
  gross_receipts: '', returns_allowances: '', cost_of_goods: '',
  advertising: '', car_expenses: '', depreciation: '', insurance: '',
  legal_professional: '', office_expense: '', rent_lease: '', supplies: '',
  taxes_licenses: '', travel: '', utilities: '', wages: '',
  other_expenses: '', home_office_deduction: '',
}

const INITIAL_1120S = {
  tax_year: 2025, corporation_name: '', ein: '',
  address: '', city: '', state: '', zip_code: '',
  date_incorporated: '', state_incorporated: '',
  total_assets: '', gross_receipts: '', cost_of_goods: '',
  compensation_officers: '', salaries_wages: '', repairs: '',
  bad_debts: '', rents: '', taxes_licenses: '', interest: '',
  depreciation: '', advertising: '', other_deductions: '',
  shareholder_count: '1',
}

const INITIAL_1065 = {
  tax_year: 2025, partnership_name: '', ein: '',
  address: '', city: '', state: '', zip_code: '',
  date_formed: '', state_formed: '',
  total_assets: '', gross_receipts: '', cost_of_goods: '',
  ordinary_income: '', salaries_wages: '', guaranteed_payments: '',
  repairs: '', bad_debts: '', rents: '', taxes_licenses: '',
  interest: '', depreciation: '', other_deductions: '',
  partner_count: '2',
}

export default function BusinessTax() {
  const [formType, setFormType] = useState<FormType | ''>('')
  const [scheduleC, setScheduleC] = useState({ ...INITIAL_SCHEDULE_C })
  const [form1120s, setForm1120s] = useState({ ...INITIAL_1120S })
  const [form1065, setForm1065] = useState({ ...INITIAL_1065 })
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const clearErr = (k: string) => setErrors(e => { const n = { ...e }; delete n[k]; return n })
  const setC = (k: string, v: any) => { setScheduleC(f => ({ ...f, [k]: v })); clearErr(k) }
  const setS = (k: string, v: any) => { setForm1120s(f => ({ ...f, [k]: v })); clearErr(k) }
  const setP = (k: string, v: any) => { setForm1065(f => ({ ...f, [k]: v })); clearErr(k) }

  const fe = (k: string) => errors[k] ? <span className={styles.fieldError}>{errors[k]}</span> : null
  const ic = (k: string) => errors[k] ? styles.inputError : ''

  const num = (v: string) => parseFloat(v) || 0
  // Convert YYYY-MM-DD (HTML date input) → MM/DD/YYYY (IRS format)
  const toIRSDate = (v: string) => {
    if (!v) return ''
    const [y, m, d] = v.split('-')
    return `${m}/${d}/${y}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = formType === 'schedule_c' ? validateScheduleC(scheduleC)
      : formType === '1120s' ? validate1120S(form1120s)
      : validate1065(form1065)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)
    setError('')
    try {
      let res
      if (formType === 'schedule_c') {
        res = await api.post('/tax/business/schedule-c', {
          ...scheduleC,
          gross_receipts: num(scheduleC.gross_receipts),
          returns_allowances: num(scheduleC.returns_allowances),
          cost_of_goods: num(scheduleC.cost_of_goods),
          advertising: num(scheduleC.advertising),
          car_expenses: num(scheduleC.car_expenses),
          depreciation: num(scheduleC.depreciation),
          insurance: num(scheduleC.insurance),
          legal_professional: num(scheduleC.legal_professional),
          office_expense: num(scheduleC.office_expense),
          rent_lease: num(scheduleC.rent_lease),
          supplies: num(scheduleC.supplies),
          taxes_licenses: num(scheduleC.taxes_licenses),
          travel: num(scheduleC.travel),
          utilities: num(scheduleC.utilities),
          wages: num(scheduleC.wages),
          other_expenses: num(scheduleC.other_expenses),
          home_office_deduction: num(scheduleC.home_office_deduction),
        })
      } else if (formType === '1120s') {
        res = await api.post('/tax/business/1120s', {
          ...form1120s,
          date_incorporated: toIRSDate(form1120s.date_incorporated),
          total_assets: num(form1120s.total_assets),
          gross_receipts: num(form1120s.gross_receipts),
          cost_of_goods: num(form1120s.cost_of_goods),
          compensation_officers: num(form1120s.compensation_officers),
          salaries_wages: num(form1120s.salaries_wages),
          repairs: num(form1120s.repairs),
          bad_debts: num(form1120s.bad_debts),
          rents: num(form1120s.rents),
          taxes_licenses: num(form1120s.taxes_licenses),
          interest: num(form1120s.interest),
          depreciation: num(form1120s.depreciation),
          advertising: num(form1120s.advertising),
          other_deductions: num(form1120s.other_deductions),
          shareholder_count: parseInt(form1120s.shareholder_count) || 1,
        })
      } else {
        res = await api.post('/tax/business/1065', {
          ...form1065,
          date_formed: toIRSDate(form1065.date_formed),
          total_assets: num(form1065.total_assets),
          gross_receipts: num(form1065.gross_receipts),
          cost_of_goods: num(form1065.cost_of_goods),
          ordinary_income: num(form1065.ordinary_income),
          salaries_wages: num(form1065.salaries_wages),
          guaranteed_payments: num(form1065.guaranteed_payments),
          repairs: num(form1065.repairs),
          bad_debts: num(form1065.bad_debts),
          rents: num(form1065.rents),
          taxes_licenses: num(form1065.taxes_licenses),
          interest: num(form1065.interest),
          depreciation: num(form1065.depreciation),
          other_deductions: num(form1065.other_deductions),
          partner_count: parseInt(form1065.partner_count) || 2,
        })
      }
      setResult(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  if (result) return (
    <div className={styles.card}>
      <div className={styles.success}>✅ Business return saved!</div>
      <p><strong>Return ID:</strong> {result.id}</p>
      <p><strong>Type:</strong> {result.return_type}</p>
      <p><strong>Tax Year:</strong> {result.tax_year}</p>
      <p><strong>Status:</strong> {result.status}</p>
      <p style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '12px' }}>
        Your return has been saved. E-filing will be available once our IRS authorization is complete.
      </p>
      <button className={styles.btnSubmit} onClick={() => { setResult(null); setFormType('') }}>
        File Another Return
      </button>
    </div>
  )

  return (
    <div className={styles.card}>
      <h2>Business Tax Filing</h2>
      {error && <div className={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit} noValidate>
          <label>Business Type
            <select value={formType} onChange={e => { setFormType(e.target.value as FormType); setError('') }} required>
              <option value="">— Select Business Type —</option>
              {(Object.keys(FORM_LABELS) as FormType[]).map(type => (
                <option key={type} value={type}>{FORM_LABELS[type]}</option>
              ))}
            </select>
          </label>

        {formType && <>
          <p className={styles.subtitle}><strong>{FORM_LABELS[formType]}</strong></p>

          {/* ── SCHEDULE C ── */}
          {formType === 'schedule_c' && <>
            <div className={styles.row}>
              <label>First Name
                <input value={scheduleC.first_name} onChange={e => setC('first_name', e.target.value)} className={ic('first_name')} />
                {fe('first_name')}
              </label>
              <label>Last Name
                <input value={scheduleC.last_name} onChange={e => setC('last_name', e.target.value)} className={ic('last_name')} />
                {fe('last_name')}
              </label>
            </div>
            <label>Social Security Number
              <input placeholder="XXX-XX-XXXX" value={scheduleC.ssn}
                onChange={e => setC('ssn', formatSSN(e.target.value))} className={ic('ssn')} inputMode="numeric" maxLength={11} />
              {fe('ssn')}
            </label>
            <label>Business Name
              <input value={scheduleC.business_name} onChange={e => setC('business_name', e.target.value)} className={ic('business_name')} />
              {fe('business_name')}
            </label>
            <label>EIN (optional)
              <input placeholder="XX-XXXXXXX" value={scheduleC.ein}
                onChange={e => setC('ein', formatEIN(e.target.value))} className={ic('ein')} inputMode="numeric" maxLength={10} />
              {fe('ein')}
            </label>
            <label>Principal Business or Profession
              <input value={scheduleC.principal_business} onChange={e => setC('principal_business', e.target.value)}
                className={ic('principal_business')} placeholder="e.g. Consulting, Retail, Construction" />
              {fe('principal_business')}
            </label>
            <label>Business Address
              <AddressAutocomplete value={scheduleC.address} onChange={v => setC('address', v)}
                onSelect={r => { setScheduleC(f => ({ ...f, address: r.address, city: r.city, state: r.state, zip_code: r.zip })); setErrors(e => { const n={...e}; delete n.address; delete n.city; delete n.state; delete n.zip_code; return n }) }}
                placeholder="Start typing business address..." />
              {fe('address')}
            </label>
            <div className={styles.row}>
              <label>City
                <input value={scheduleC.city} onChange={e => setC('city', e.target.value)} className={ic('city')} />
                {fe('city')}
              </label>
              <label>State
                <select value={scheduleC.state} onChange={e => setC('state', e.target.value)} className={ic('state')}>
                  <option value="">Select</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {fe('state')}
              </label>
              <label>ZIP
                <input value={scheduleC.zip_code} onChange={e => setC('zip_code', e.target.value.replace(/\D/g,'').slice(0,5))} className={ic('zip_code')} inputMode="numeric" maxLength={5} />
                {fe('zip_code')}
              </label>
            </div>
            <h3 className={styles.sectionTitle}>Income</h3>
            <label>Gross Receipts ($)
              <input type="number" step="0.01" min="0" value={scheduleC.gross_receipts} onChange={e => setC('gross_receipts', e.target.value)} className={ic('gross_receipts')} />
              {fe('gross_receipts')}
            </label>
            <label>Returns & Allowances ($) <input type="number" step="0.01" min="0" value={scheduleC.returns_allowances} onChange={e => setC('returns_allowances', e.target.value)} /></label>
            <label>Cost of Goods Sold ($) <input type="number" step="0.01" min="0" value={scheduleC.cost_of_goods} onChange={e => setC('cost_of_goods', e.target.value)} /></label>
            <h3 className={styles.sectionTitle}>Expenses</h3>
            {[
              ['Advertising', 'advertising'], ['Car & Truck Expenses', 'car_expenses'],
              ['Depreciation', 'depreciation'], ['Insurance', 'insurance'],
              ['Legal & Professional', 'legal_professional'], ['Office Expense', 'office_expense'],
              ['Rent or Lease', 'rent_lease'], ['Supplies', 'supplies'],
              ['Taxes & Licenses', 'taxes_licenses'], ['Travel', 'travel'],
              ['Utilities', 'utilities'], ['Wages', 'wages'],
              ['Other Expenses', 'other_expenses'], ['Home Office Deduction', 'home_office_deduction'],
            ].map(([label, key]) => (
              <label key={key}>{label} ($)
                <input type="number" step="0.01" min="0" value={(scheduleC as any)[key]}
                  onChange={e => setC(key, e.target.value)} />
              </label>
            ))}
          </>}

          {/* ── FORM 1120-S ── */}
          {formType === '1120s' && <>
            <label>Corporation Name
              <input value={form1120s.corporation_name} onChange={e => setS('corporation_name', e.target.value)} className={ic('corporation_name')} />
              {fe('corporation_name')}
            </label>
            <label>EIN
              <input placeholder="XX-XXXXXXX" value={form1120s.ein}
                onChange={e => setS('ein', formatEIN(e.target.value))} className={ic('ein')} inputMode="numeric" maxLength={10} />
              {fe('ein')}
            </label>
            <div className={styles.row}>
              <label>Date Incorporated
                <input type="date" value={form1120s.date_incorporated}
                  onChange={e => setS('date_incorporated', e.target.value)} className={ic('date_incorporated')} />
                {fe('date_incorporated')}
              </label>
              <label>State Incorporated
                <select value={form1120s.state_incorporated} onChange={e => setS('state_incorporated', e.target.value)} className={ic('state_incorporated')}>
                  <option value="">Select</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {fe('state_incorporated')}
              </label>
            </div>
            <label>Business Address
              <AddressAutocomplete value={form1120s.address} onChange={v => setS('address', v)}
                onSelect={r => { setForm1120s(f => ({ ...f, address: r.address, city: r.city, state: r.state, zip_code: r.zip })); setErrors(e => { const n={...e}; delete n.address; delete n.city; delete n.state; delete n.zip_code; return n }) }}
                placeholder="Start typing business address..." />
              {fe('address')}
            </label>
            <div className={styles.row}>
              <label>City
                <input value={form1120s.city} onChange={e => setS('city', e.target.value)} className={ic('city')} />
                {fe('city')}
              </label>
              <label>State
                <select value={form1120s.state} onChange={e => setS('state', e.target.value)} className={ic('state')}>
                  <option value="">Select</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {fe('state')}
              </label>
              <label>ZIP
                <input value={form1120s.zip_code} onChange={e => setS('zip_code', e.target.value.replace(/\D/g,'').slice(0,5))} className={ic('zip_code')} inputMode="numeric" maxLength={5} />
                {fe('zip_code')}
              </label>
            </div>
            <label>Number of Shareholders
              <input type="number" min="1" value={form1120s.shareholder_count} onChange={e => setS('shareholder_count', e.target.value)} className={ic('shareholder_count')} />
              {fe('shareholder_count')}
            </label>
            <label>Total Assets ($) <input type="number" step="0.01" min="0" value={form1120s.total_assets} onChange={e => setS('total_assets', e.target.value)} /></label>
            <h3 className={styles.sectionTitle}>Income</h3>
            <label>Gross Receipts ($)
              <input type="number" step="0.01" min="0" value={form1120s.gross_receipts} onChange={e => setS('gross_receipts', e.target.value)} className={ic('gross_receipts')} />
              {fe('gross_receipts')}
            </label>
            <label>Cost of Goods Sold ($) <input type="number" step="0.01" min="0" value={form1120s.cost_of_goods} onChange={e => setS('cost_of_goods', e.target.value)} /></label>
            <h3 className={styles.sectionTitle}>Deductions</h3>
            {[
              ['Compensation of Officers', 'compensation_officers'], ['Salaries & Wages', 'salaries_wages'],
              ['Repairs & Maintenance', 'repairs'], ['Bad Debts', 'bad_debts'],
              ['Rents', 'rents'], ['Taxes & Licenses', 'taxes_licenses'],
              ['Interest', 'interest'], ['Depreciation', 'depreciation'],
              ['Advertising', 'advertising'], ['Other Deductions', 'other_deductions'],
            ].map(([label, key]) => (
              <label key={key}>{label} ($)
                <input type="number" step="0.01" min="0" value={(form1120s as any)[key]}
                  onChange={e => setS(key, e.target.value)} />
              </label>
            ))}
          </>}

          {/* ── FORM 1065 ── */}
          {formType === '1065' && <>
            <label>Partnership / LLC Name
              <input value={form1065.partnership_name} onChange={e => setP('partnership_name', e.target.value)} className={ic('partnership_name')} />
              {fe('partnership_name')}
            </label>
            <label>EIN
              <input placeholder="XX-XXXXXXX" value={form1065.ein}
                onChange={e => setP('ein', formatEIN(e.target.value))} className={ic('ein')} inputMode="numeric" maxLength={10} />
              {fe('ein')}
            </label>
            <div className={styles.row}>
              <label>Date Formed
                <input type="date" value={form1065.date_formed}
                  onChange={e => setP('date_formed', e.target.value)} className={ic('date_formed')} />
                {fe('date_formed')}
              </label>
              <label>State Formed
                <select value={form1065.state_formed} onChange={e => setP('state_formed', e.target.value)} className={ic('state_formed')}>
                  <option value="">Select</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {fe('state_formed')}
              </label>
            </div>
            <label>Business Address
              <AddressAutocomplete value={form1065.address} onChange={v => setP('address', v)}
                onSelect={r => { setForm1065(f => ({ ...f, address: r.address, city: r.city, state: r.state, zip_code: r.zip })); setErrors(e => { const n={...e}; delete n.address; delete n.city; delete n.state; delete n.zip_code; return n }) }}
                placeholder="Start typing business address..." />
              {fe('address')}
            </label>
            <div className={styles.row}>
              <label>City
                <input value={form1065.city} onChange={e => setP('city', e.target.value)} className={ic('city')} />
                {fe('city')}
              </label>
              <label>State
                <select value={form1065.state} onChange={e => setP('state', e.target.value)} className={ic('state')}>
                  <option value="">Select</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {fe('state')}
              </label>
              <label>ZIP
                <input value={form1065.zip_code} onChange={e => setP('zip_code', e.target.value.replace(/\D/g,'').slice(0,5))} className={ic('zip_code')} inputMode="numeric" maxLength={5} />
                {fe('zip_code')}
              </label>
            </div>
            <label>Number of Partners
              <input type="number" min="2" value={form1065.partner_count} onChange={e => setP('partner_count', e.target.value)} className={ic('partner_count')} />
              {fe('partner_count')}
            </label>
            <label>Total Assets ($) <input type="number" step="0.01" min="0" value={form1065.total_assets} onChange={e => setP('total_assets', e.target.value)} /></label>
            <h3 className={styles.sectionTitle}>Income</h3>
            <label>Gross Receipts ($)
              <input type="number" step="0.01" min="0" value={form1065.gross_receipts} onChange={e => setP('gross_receipts', e.target.value)} className={ic('gross_receipts')} />
              {fe('gross_receipts')}
            </label>
            <label>Cost of Goods Sold ($) <input type="number" step="0.01" min="0" value={form1065.cost_of_goods} onChange={e => setP('cost_of_goods', e.target.value)} /></label>
            <h3 className={styles.sectionTitle}>Deductions</h3>
            {[
              ['Salaries & Wages', 'salaries_wages'], ['Guaranteed Payments', 'guaranteed_payments'],
              ['Repairs & Maintenance', 'repairs'], ['Bad Debts', 'bad_debts'],
              ['Rents', 'rents'], ['Taxes & Licenses', 'taxes_licenses'],
              ['Interest', 'interest'], ['Depreciation', 'depreciation'],
              ['Other Deductions', 'other_deductions'],
            ].map(([label, key]) => (
              <label key={key}>{label} ($)
                <input type="number" step="0.01" min="0" value={(form1065 as any)[key]}
                  onChange={e => setP(key, e.target.value)} />
              </label>
            ))}
          </>}

          <button type="submit" className={styles.btnSubmit} disabled={loading}>
            {loading ? '...' : 'Save Return'}
          </button>
        </>}

        {!formType && (
          <p className={styles.subtitle} style={{ marginTop: '1rem' }}>
            Select a business type above to view the filing form.
          </p>
        )}
      </form>
    </div>
  )
}
