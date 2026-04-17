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

  if (!form.first_name.trim()) e.first_name = 'Required'
  else if (!/^[A-Za-z\s'-]+$/.test(form.first_name)) e.first_name = 'Letters only'

  if (!form.last_name.trim()) e.last_name = 'Required'
  else if (!/^[A-Za-z\s'-]+$/.test(form.last_name)) e.last_name = 'Letters only'

  if (!/^\d{3}-\d{2}-\d{4}$/.test(form.ssn)) e.ssn = 'Enter a valid SSN (XXX-XX-XXXX)'

  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(form.dob)) {
    e.dob = 'Enter date as MM/DD/YYYY with 4-digit year'
  } else {
    const [m, d, y] = form.dob.split('/').map(Number)
    const dt = new Date(y, m - 1, d)
    const age = new Date().getFullYear() - y
    if (dt.getMonth() !== m - 1 || dt.getDate() !== d) e.dob = 'Invalid date'
    else if (age < 18) e.dob = 'Must be 18 or older'
    else if (y < 1900) e.dob = 'Invalid birth year'
  }

  if (!form.address.trim()) e.address = 'Address is required'
  if (!form.city.trim()) e.city = 'City is required'
  if (!form.state) e.state = 'Select a state'
  if (!/^\d{5}$/.test(form.zip_code)) e.zip_code = 'Enter a valid 5-digit ZIP'

  if (!form.tax_return_id) e.tax_return_id = 'Tax Return ID is required'

  const amount = parseFloat(form.requested_amount)
  if (isNaN(amount) || amount <= 0) e.requested_amount = 'Enter a valid amount'
  else if (amount > 4000) e.requested_amount = 'Maximum loan amount is $4,000'

  if (!form.bank_routing.trim()) e.bank_routing = 'Routing number is required'
  else if (!/^\d{9}$/.test(form.bank_routing.replace(/\s/g, ''))) e.bank_routing = 'Routing number must be 9 digits'

  if (!form.bank_account.trim()) e.bank_account = 'Account number is required'
  else if (!/^\d{4,17}$/.test(form.bank_account.replace(/\s/g, ''))) e.bank_account = 'Enter a valid account number (4–17 digits)'

  return e
}

export default function LoanApplication() {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    first_name: '', last_name: '', ssn: '', dob: '',
    address: '', city: '', state: '', zip_code: '',
    tax_return_id: '', requested_amount: '',
    bank_routing: '', bank_account: '',
  })
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: string) => {
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
      const res = await api.post('/loans/apply', {
        ...form,
        tax_return_id: parseInt(form.tax_return_id),
        requested_amount: parseFloat(form.requested_amount),
      })
      setResult(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Application failed')
    } finally {
      setLoading(false)
    }
  }

  const fe = (k: string) => errors[k] ? <span className={styles.fieldError}>{errors[k]}</span> : null
  const ic = (k: string) => errors[k] ? styles.inputError : ''

  if (result) return (
    <div className={styles.card}>
      <div className={styles.success}>✅ Loan application submitted!</div>
      <p><strong>Status:</strong> {result.status}</p>
      <p><strong>Amount Requested:</strong> ${(result.requested_amount_cents / 100).toFixed(2)}</p>
    </div>
  )

  return (
    <div className={styles.card}>
      <h2>{t('loan.title')}</h2>
      <p className={styles.subtitle}>{t('loan.subtitle')}</p>
      {error && <div className={styles.error}>{error}</div>}
      <form onSubmit={handleSubmit} noValidate>

        <h3 className={styles.sectionTitle}>Personal Information</h3>
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

        <label>Social Security Number
          <input placeholder="XXX-XX-XXXX" value={form.ssn}
            onChange={e => set('ssn', formatSSN(e.target.value))}
            className={ic('ssn')} inputMode="numeric" maxLength={11} />
          {fe('ssn')}
        </label>

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

        <h3 className={styles.sectionTitle}>Home Address</h3>
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

        <h3 className={styles.sectionTitle}>Loan Details</h3>
        <label>Tax Return ID
          <input type="number" value={form.tax_return_id}
            onChange={e => set('tax_return_id', e.target.value)} className={ic('tax_return_id')}
            placeholder="From your filed return" />
          {fe('tax_return_id')}
        </label>

        <label>{t('loan.amount')} <span className={styles.hint}>{t('loan.maxAmount')}</span>
          <input type="number" step="0.01" min="0" max="4000" value={form.requested_amount}
            onChange={e => set('requested_amount', e.target.value)} className={ic('requested_amount')} />
          {fe('requested_amount')}
        </label>

        <h3 className={styles.sectionTitle}>Bank Information</h3>
        <label>{t('loan.bankRouting')}
          <input type="text" value={form.bank_routing}
            onChange={e => set('bank_routing', e.target.value.replace(/\D/g, '').slice(0, 9))}
            className={ic('bank_routing')} inputMode="numeric" maxLength={9}
            placeholder="9-digit routing number" />
          {fe('bank_routing')}
        </label>
        <label>{t('loan.bankAccount')}
          <input type="text" value={form.bank_account}
            onChange={e => set('bank_account', e.target.value.replace(/\D/g, '').slice(0, 17))}
            className={ic('bank_account')} inputMode="numeric" maxLength={17}
            placeholder="Account number" />
          {fe('bank_account')}
        </label>

        <button type="submit" className={styles.btnSubmit} disabled={loading}>
          {loading ? 'Submitting...' : t('loan.apply')}
        </button>
      </form>
    </div>
  )
}
