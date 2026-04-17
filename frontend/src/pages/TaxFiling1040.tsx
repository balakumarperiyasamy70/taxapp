import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import styles from './Form.module.css'
import AddressAutocomplete from '../components/AddressAutocomplete'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC'
]

function formatSSN(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 9)
  if (digits.length <= 3) return digits
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
}

function validate(form: Record<string, any>): Record<string, string> {
  const e: Record<string, string> = {}

  if (!form.first_name.trim()) e.first_name = 'First name is required'
  else if (!/^[A-Za-z\s'-]+$/.test(form.first_name)) e.first_name = 'Letters only'

  if (!form.last_name.trim()) e.last_name = 'Last name is required'
  else if (!/^[A-Za-z\s'-]+$/.test(form.last_name)) e.last_name = 'Letters only'

  if (!/^\d{3}-\d{2}-\d{4}$/.test(form.ssn)) e.ssn = 'Enter a valid SSN (XXX-XX-XXXX)'

  if (!form.address.trim()) e.address = 'Address is required'
  if (!form.city.trim()) e.city = 'City is required'
  if (!form.state) e.state = 'Select a state'
  if (!/^\d{5}$/.test(form.zip_code)) e.zip_code = 'Enter a valid 5-digit ZIP'

  const income = parseFloat(form.wages) + parseFloat(form.interest) +
    parseFloat(form.dividends) + parseFloat(form.other_income)
  if (isNaN(income) || income <= 0) e.wages = 'At least one income amount is required'

  ;['wages', 'interest', 'dividends', 'other_income', 'child_tax_credit', 'earned_income_credit'].forEach(k => {
    const v = parseFloat(form[k])
    if (!isNaN(v) && v < 0) e[k] = 'Cannot be negative'
  })

  if (!form.standard_deduction) {
    const itemized = parseFloat(form.itemized_deductions)
    if (isNaN(itemized) || itemized <= 0) e.itemized_deductions = 'Enter your itemized deductions amount'
  }

  return e
}

export default function TaxFiling1040() {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    tax_year: 2025, filing_status: 'single',
    first_name: '', last_name: '', ssn: '',
    address: '', city: '', state: '', zip_code: '',
    wages: '', interest: '', dividends: '', other_income: '',
    standard_deduction: true, itemized_deductions: '0',
    child_tax_credit: '0', earned_income_credit: '0',
  })
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: any) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/tax/1040', {
        ...form,
        wages: parseFloat(form.wages) || 0,
        interest: parseFloat(form.interest) || 0,
        dividends: parseFloat(form.dividends) || 0,
        other_income: parseFloat(form.other_income) || 0,
        itemized_deductions: parseFloat(form.itemized_deductions) || 0,
        child_tax_credit: parseFloat(form.child_tax_credit) || 0,
        earned_income_credit: parseFloat(form.earned_income_credit) || 0,
      })
      setResult(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  const fe = (k: string) => errors[k] ? <span className={styles.fieldError}>{errors[k]}</span> : null
  const ic = (k: string) => errors[k] ? styles.inputError : ''

  if (result) return (
    <div className={styles.card}>
      <div className={styles.success}>✅ Return submitted!</div>
      <p><strong>Submission ID:</strong> {result.submission_id || 'Pending e-file'}</p>
      <p><strong>{t('filing.refundAmount')}:</strong> ${(result.refund_amount_cents / 100).toFixed(2)}</p>
      <p><strong>{t('filing.taxOwed')}:</strong> ${(result.tax_owed_cents / 100).toFixed(2)}</p>
      <p style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '12px' }}>
        Your return has been saved. E-filing will be available once our IRS authorization is complete.
      </p>
    </div>
  )

  return (
    <div className={styles.card}>
      <h2>{t('filing.title')}</h2>
      {error && <div className={styles.error}>{error}</div>}
      <form onSubmit={handleSubmit} noValidate>

        <label>{t('filing.filingStatus')}
          <select value={form.filing_status} onChange={e => set('filing_status', e.target.value)}>
            <option value="single">{t('filing.single')}</option>
            <option value="married_joint">{t('filing.marriedJoint')}</option>
            <option value="married_separate">{t('filing.marriedSeparate')}</option>
            <option value="head_household">{t('filing.headHousehold')}</option>
          </select>
        </label>

        <div className={styles.row}>
          <label>{t('auth.firstName')}
            <input value={form.first_name} onChange={e => set('first_name', e.target.value)}
              className={ic('first_name')} autoComplete="given-name" />
            {fe('first_name')}
          </label>
          <label>{t('auth.lastName')}
            <input value={form.last_name} onChange={e => set('last_name', e.target.value)}
              className={ic('last_name')} autoComplete="family-name" />
            {fe('last_name')}
          </label>
        </div>

        <label>{t('identity.ssn')}
          <input placeholder="XXX-XX-XXXX" value={form.ssn}
            onChange={e => set('ssn', formatSSN(e.target.value))}
            className={ic('ssn')} inputMode="numeric" maxLength={11} />
          {fe('ssn')}
        </label>

        <label>Address
          <AddressAutocomplete value={form.address} onChange={v => set('address', v)}
            onSelect={r => { setForm(f => ({ ...f, address: r.address, city: r.city, state: r.state, zip_code: r.zip })); setErrors(e => { const n={...e}; delete n.address; delete n.city; delete n.state; delete n.zip_code; return n }) }}
            placeholder="Start typing your address..." />
          {fe('address')}
        </label>

        <div className={styles.row}>
          <label>City
            <input value={form.city} onChange={e => set('city', e.target.value)}
              className={ic('city')} placeholder="Auto-filled" />
            {fe('city')}
          </label>
          <label>State
            <select value={form.state} onChange={e => set('state', e.target.value)} className={ic('state')}>
              <option value="">Select state</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {fe('state')}
          </label>
          <label>ZIP
            <input value={form.zip_code}
              onChange={e => set('zip_code', e.target.value.replace(/\D/g, '').slice(0, 5))}
              className={ic('zip_code')} inputMode="numeric" maxLength={5} placeholder="ZIP" />
            {fe('zip_code')}
          </label>
        </div>

        <h3 className={styles.sectionTitle}>Income</h3>
        <label>{t('filing.wages')}
          <input type="number" step="0.01" min="0" value={form.wages}
            onChange={e => set('wages', e.target.value)} className={ic('wages')} />
          {fe('wages')}
        </label>
        <label>{t('filing.interest')}
          <input type="number" step="0.01" min="0" value={form.interest}
            onChange={e => set('interest', e.target.value)} className={ic('interest')} />
          {fe('interest')}
        </label>
        <label>{t('filing.dividends')}
          <input type="number" step="0.01" min="0" value={form.dividends}
            onChange={e => set('dividends', e.target.value)} />
        </label>
        <label>{t('filing.otherIncome')}
          <input type="number" step="0.01" min="0" value={form.other_income}
            onChange={e => set('other_income', e.target.value)} />
        </label>

        <label className={styles.checkbox}>
          <input type="checkbox" checked={form.standard_deduction}
            onChange={e => set('standard_deduction', e.target.checked)} />
          {t('filing.standardDeduction')}
        </label>

        {!form.standard_deduction && (
          <label>Itemized Deductions ($)
            <input type="number" step="0.01" min="0" value={form.itemized_deductions}
              onChange={e => set('itemized_deductions', e.target.value)}
              className={ic('itemized_deductions')} />
            {fe('itemized_deductions')}
          </label>
        )}

        <label>Child Tax Credit ($)
          <input type="number" step="0.01" min="0" value={form.child_tax_credit}
            onChange={e => set('child_tax_credit', e.target.value)} className={ic('child_tax_credit')} />
          {fe('child_tax_credit')}
        </label>
        <label>Earned Income Credit ($)
          <input type="number" step="0.01" min="0" value={form.earned_income_credit}
            onChange={e => set('earned_income_credit', e.target.value)} className={ic('earned_income_credit')} />
          {fe('earned_income_credit')}
        </label>

        <button type="submit" className={styles.btnSubmit} disabled={loading}>
          {loading ? 'Submitting...' : t('filing.submit')}
        </button>
      </form>
    </div>
  )
}
