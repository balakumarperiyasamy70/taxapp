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
  const [loading, setLoading] = useState(false)

  const setC = (k: string, v: any) => setScheduleC(f => ({ ...f, [k]: v }))
  const setS = (k: string, v: any) => setForm1120s(f => ({ ...f, [k]: v }))
  const setP = (k: string, v: any) => setForm1065(f => ({ ...f, [k]: v }))

  const num = (v: string) => parseFloat(v) || 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
      <p className={styles.subtitle}>Select your business type to get started</p>
      {error && <div className={styles.error}>{error}</div>}

      {!formType ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
          {(Object.keys(FORM_LABELS) as FormType[]).map(type => (
            <button key={type} className={styles.btnSubmit} onClick={() => setFormType(type)}>
              {FORM_LABELS[type]}
            </button>
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <p className={styles.subtitle}><strong>{FORM_LABELS[formType]}</strong></p>

          {/* ── SCHEDULE C ── */}
          {formType === 'schedule_c' && <>
            <div className={styles.row}>
              <label>First Name
                <input value={scheduleC.first_name} onChange={e => setC('first_name', e.target.value)} required />
              </label>
              <label>Last Name
                <input value={scheduleC.last_name} onChange={e => setC('last_name', e.target.value)} required />
              </label>
            </div>
            <label>Social Security Number
              <input placeholder="XXX-XX-XXXX" value={scheduleC.ssn}
                onChange={e => setC('ssn', formatSSN(e.target.value))} inputMode="numeric" maxLength={11} required />
            </label>
            <label>Business Name
              <input value={scheduleC.business_name} onChange={e => setC('business_name', e.target.value)} required />
            </label>
            <label>EIN (optional)
              <input placeholder="XX-XXXXXXX" value={scheduleC.ein}
                onChange={e => setC('ein', formatEIN(e.target.value))} inputMode="numeric" maxLength={10} />
            </label>
            <label>Principal Business or Profession
              <input value={scheduleC.principal_business} onChange={e => setC('principal_business', e.target.value)}
                placeholder="e.g. Consulting, Retail, Construction" required />
            </label>
            <label>Business Address
              <AddressAutocomplete value={scheduleC.address} onChange={v => setC('address', v)}
                onSelect={r => setScheduleC(f => ({ ...f, address: r.address, city: r.city, state: r.state, zip_code: r.zip }))}
                placeholder="Start typing business address..." required />
            </label>
            <div className={styles.row}>
              <label>City <input value={scheduleC.city} onChange={e => setC('city', e.target.value)} required /></label>
              <label>State
                <select value={scheduleC.state} onChange={e => setC('state', e.target.value)} required>
                  <option value="">Select</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label>ZIP <input value={scheduleC.zip_code} onChange={e => setC('zip_code', e.target.value.replace(/\D/g,'').slice(0,5))} inputMode="numeric" maxLength={5} required /></label>
            </div>
            <h3 className={styles.sectionTitle}>Income</h3>
            <label>Gross Receipts ($) <input type="number" step="0.01" min="0" value={scheduleC.gross_receipts} onChange={e => setC('gross_receipts', e.target.value)} required /></label>
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
              <input value={form1120s.corporation_name} onChange={e => setS('corporation_name', e.target.value)} required />
            </label>
            <label>EIN
              <input placeholder="XX-XXXXXXX" value={form1120s.ein}
                onChange={e => setS('ein', formatEIN(e.target.value))} inputMode="numeric" maxLength={10} required />
            </label>
            <div className={styles.row}>
              <label>Date Incorporated
                <input type="text" placeholder="MM/DD/YYYY" value={form1120s.date_incorporated}
                  onChange={e => setS('date_incorporated', e.target.value)} maxLength={10} required />
              </label>
              <label>State Incorporated
                <select value={form1120s.state_incorporated} onChange={e => setS('state_incorporated', e.target.value)} required>
                  <option value="">Select</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <label>Business Address
              <AddressAutocomplete value={form1120s.address} onChange={v => setS('address', v)}
                onSelect={r => setForm1120s(f => ({ ...f, address: r.address, city: r.city, state: r.state, zip_code: r.zip }))}
                placeholder="Start typing business address..." required />
            </label>
            <div className={styles.row}>
              <label>City <input value={form1120s.city} onChange={e => setS('city', e.target.value)} required /></label>
              <label>State
                <select value={form1120s.state} onChange={e => setS('state', e.target.value)} required>
                  <option value="">Select</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label>ZIP <input value={form1120s.zip_code} onChange={e => setS('zip_code', e.target.value.replace(/\D/g,'').slice(0,5))} inputMode="numeric" maxLength={5} required /></label>
            </div>
            <label>Number of Shareholders
              <input type="number" min="1" value={form1120s.shareholder_count} onChange={e => setS('shareholder_count', e.target.value)} required />
            </label>
            <label>Total Assets ($) <input type="number" step="0.01" min="0" value={form1120s.total_assets} onChange={e => setS('total_assets', e.target.value)} /></label>
            <h3 className={styles.sectionTitle}>Income</h3>
            <label>Gross Receipts ($) <input type="number" step="0.01" min="0" value={form1120s.gross_receipts} onChange={e => setS('gross_receipts', e.target.value)} required /></label>
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
              <input value={form1065.partnership_name} onChange={e => setP('partnership_name', e.target.value)} required />
            </label>
            <label>EIN
              <input placeholder="XX-XXXXXXX" value={form1065.ein}
                onChange={e => setP('ein', formatEIN(e.target.value))} inputMode="numeric" maxLength={10} required />
            </label>
            <div className={styles.row}>
              <label>Date Formed
                <input type="text" placeholder="MM/DD/YYYY" value={form1065.date_formed}
                  onChange={e => setP('date_formed', e.target.value)} maxLength={10} required />
              </label>
              <label>State Formed
                <select value={form1065.state_formed} onChange={e => setP('state_formed', e.target.value)} required>
                  <option value="">Select</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <label>Business Address
              <AddressAutocomplete value={form1065.address} onChange={v => setP('address', v)}
                onSelect={r => setForm1065(f => ({ ...f, address: r.address, city: r.city, state: r.state, zip_code: r.zip }))}
                placeholder="Start typing business address..." required />
            </label>
            <div className={styles.row}>
              <label>City <input value={form1065.city} onChange={e => setP('city', e.target.value)} required /></label>
              <label>State
                <select value={form1065.state} onChange={e => setP('state', e.target.value)} required>
                  <option value="">Select</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label>ZIP <input value={form1065.zip_code} onChange={e => setP('zip_code', e.target.value.replace(/\D/g,'').slice(0,5))} inputMode="numeric" maxLength={5} required /></label>
            </div>
            <label>Number of Partners
              <input type="number" min="2" value={form1065.partner_count} onChange={e => setP('partner_count', e.target.value)} required />
            </label>
            <label>Total Assets ($) <input type="number" step="0.01" min="0" value={form1065.total_assets} onChange={e => setP('total_assets', e.target.value)} /></label>
            <h3 className={styles.sectionTitle}>Income</h3>
            <label>Gross Receipts ($) <input type="number" step="0.01" min="0" value={form1065.gross_receipts} onChange={e => setP('gross_receipts', e.target.value)} required /></label>
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

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" className={styles.btnSubmit}
              style={{ background: 'rgba(255,255,255,0.1)' }}
              onClick={() => setFormType('')}>
              ← Back
            </button>
            <button type="submit" className={styles.btnSubmit} disabled={loading}>
              {loading ? '...' : 'Save Return'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
