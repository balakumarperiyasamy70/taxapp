import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import styles from './Form.module.css'
import AddressAutocomplete from '../components/AddressAutocomplete'

function formatSSN(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 9)
  if (digits.length <= 3) return digits
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC'
]

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

  const est = parseFloat(form.estimated_tax)
  if (isNaN(est) || est < 0) e.estimated_tax = 'Enter a valid amount (0 or more)'

  const paid = parseFloat(form.tax_payments)
  if (isNaN(paid) || paid < 0) e.tax_payments = 'Enter a valid amount (0 or more)'

  const due = parseFloat(form.balance_due)
  if (isNaN(due) || due < 0) e.balance_due = 'Enter a valid amount (0 or more)'

  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(form.dob)) {
    e.dob = 'Enter date as MM/DD/YYYY with 4-digit year'
  } else {
    const [m, d, y] = form.dob.split('/').map(Number)
    const dt = new Date(y, m - 1, d)
    const today = new Date()
    const age = today.getFullYear() - y
    if (dt.getMonth() !== m - 1 || dt.getDate() !== d) e.dob = 'Invalid date'
    else if (y < 1900 || age < 18) e.dob = 'Must be 18 or older'
    else if (age > 120) e.dob = 'Invalid birth year'
  }

  if (!/^\d{5}$/.test(form.pin)) e.pin = 'PIN must be exactly 5 digits'

  const agi = parseFloat(form.prev_year_agi)
  if (isNaN(agi) || agi < 0) e.prev_year_agi = 'Enter a valid amount (0 or more)'

  return e
}

export default function Extension4868() {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    tax_year: 2025, first_name: '', last_name: '', ssn: '',
    address: '', city: '', state: '', zip_code: '',
    estimated_tax: '', tax_payments: '', balance_due: '',
    pin: '', dob: '', prev_year_agi: ''
  })
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [zipLoading, setZipLoading] = useState(false)

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  const handleZIP = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const zip = e.target.value.replace(/\D/g, '').slice(0, 5)
    set('zip_code', zip)
    if (zip.length === 5) {
      setZipLoading(true)
      try {
        const res = await fetch(`https://api.zippopotam.us/us/${zip}`)
        if (res.ok) {
          const data = await res.json()
          const place = data.places?.[0]
          if (place) {
            setForm(f => ({ ...f, zip_code: zip, city: place['place name'] || f.city, state: place['state abbreviation'] || f.state }))
            setErrors(e => { const n = { ...e }; delete n.zip_code; delete n.city; delete n.state; return n })
          }
        }
      } catch { /* ignore */ } finally { setZipLoading(false) }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/tax/extension/4868', {
        ...form,
        estimated_tax: parseFloat(form.estimated_tax),
        tax_payments: parseFloat(form.tax_payments),
        balance_due: parseFloat(form.balance_due),
        prev_year_agi: parseFloat(form.prev_year_agi),
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
      <div className={styles.success}>✅ {t('extension.success')}</div>
      <p><strong>Submission ID:</strong> {result.submission_id}</p>
      <p><strong>Status:</strong> {result.status}</p>
    </div>
  )

  return (
    <div className={styles.card}>
      <h2>{t('extension.title')}</h2>
      <p className={styles.subtitle}>{t('extension.subtitle')}</p>
      {error && <div className={styles.error}>{error}</div>}
      <form onSubmit={handleSubmit} noValidate>

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
              className={ic('city')} placeholder="Auto-filled from address" />
            {fe('city')}
          </label>
          <label>State
            <select value={form.state} onChange={e => set('state', e.target.value)} className={ic('state')}>
              <option value="">Select state</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {fe('state')}
          </label>
          <label>ZIP Code
            <input value={form.zip_code} onChange={handleZIP}
              className={ic('zip_code')} inputMode="numeric" maxLength={5}
              placeholder={zipLoading ? 'Looking up...' : 'ZIP'} />
            {fe('zip_code')}
          </label>
        </div>

        <label>{t('extension.estimatedTax')}
          <input type="number" step="0.01" min="0" value={form.estimated_tax}
            onChange={e => set('estimated_tax', e.target.value)} className={ic('estimated_tax')} />
          {fe('estimated_tax')}
        </label>
        <label>{t('extension.taxPayments')}
          <input type="number" step="0.01" min="0" value={form.tax_payments}
            onChange={e => set('tax_payments', e.target.value)} className={ic('tax_payments')} />
          {fe('tax_payments')}
        </label>
        <label>{t('extension.balanceDue')}
          <input type="number" step="0.01" min="0" value={form.balance_due}
            onChange={e => set('balance_due', e.target.value)} className={ic('balance_due')} />
          {fe('balance_due')}
        </label>

        <hr style={{ margin: '16px 0', borderColor: '#eee' }} />
        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px' }}>
          IRS Identity Verification (required for e-filing)
        </p>

        <label>Date of Birth
          <input type="text" placeholder="MM/DD/YYYY" value={form.dob}
            className={ic('dob')}
            onChange={e => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
              let formatted = digits
              if (digits.length > 4) formatted = `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`
              else if (digits.length > 2) formatted = `${digits.slice(0,2)}/${digits.slice(2)}`
              set('dob', formatted)
            }}
            maxLength={10} />
          {fe('dob')}
        </label>

        <label>5-Digit IRS Self-Select PIN
          <input type="text" placeholder="5-digit PIN (you choose)" value={form.pin}
            onChange={e => set('pin', e.target.value.replace(/\D/g, '').slice(0, 5))}
            className={ic('pin')} inputMode="numeric" maxLength={5} />
          {fe('pin')}
        </label>

        <label>Prior Year Adjusted Gross Income ($)
          <input type="number" step="0.01" min="0" placeholder="From last year's tax return"
            value={form.prev_year_agi} onChange={e => set('prev_year_agi', e.target.value)}
            className={ic('prev_year_agi')} />
          {fe('prev_year_agi')}
        </label>

        <button type="submit" className={styles.btnSubmit} disabled={loading}>
          {loading ? 'Submitting...' : t('extension.submit')}
        </button>
      </form>
    </div>
  )
}
