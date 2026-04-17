import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import styles from './Form.module.css'
import AddressAutocomplete from '../components/AddressAutocomplete'

// Format SSN input as XXX-XX-XXXX, max 9 digits
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
  const [loading, setLoading] = useState(false)
  const [zipLoading, setZipLoading] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSSN = (e: React.ChangeEvent<HTMLInputElement>) => {
    set('ssn', formatSSN(e.target.value))
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
            setForm(f => ({
              ...f,
              zip_code: zip,
              city: place['place name'] || f.city,
              state: place['state abbreviation'] || f.state,
            }))
          }
        }
      } catch {
        // silently ignore — user can fill manually
      } finally {
        setZipLoading(false)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
      <form onSubmit={handleSubmit}>

        <div className={styles.row}>
          <label>{t('auth.firstName')}
            <input
              value={form.first_name}
              onChange={e => set('first_name', e.target.value)}
              autoComplete="given-name"
              required
            />
          </label>
          <label>{t('auth.lastName')}
            <input
              value={form.last_name}
              onChange={e => set('last_name', e.target.value)}
              autoComplete="family-name"
              required
            />
          </label>
        </div>

        <label>{t('identity.ssn')}
          <input
            placeholder="XXX-XX-XXXX"
            value={form.ssn}
            onChange={handleSSN}
            inputMode="numeric"
            maxLength={11}
            required
          />
        </label>

        <label>Address
          <AddressAutocomplete
            value={form.address}
            onChange={v => set('address', v)}
            onSelect={r => setForm(f => ({ ...f, address: r.address, city: r.city, state: r.state, zip_code: r.zip }))}
            placeholder="Start typing your address..."
            required
          />
        </label>

        <div className={styles.row}>
          <label>City
            <input
              value={form.city}
              onChange={e => set('city', e.target.value)}
              placeholder="Auto-filled from address"
              required
            />
          </label>
          <label>State
            <select
              value={form.state}
              onChange={e => set('state', e.target.value)}
              required
            >
              <option value="">Select state</option>
              {US_STATES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>ZIP Code
            <input
              value={form.zip_code}
              onChange={handleZIP}
              inputMode="numeric"
              maxLength={5}
              placeholder="ZIP"
              required
            />
          </label>
        </div>

        <label>{t('extension.estimatedTax')}
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.estimated_tax}
            onChange={e => set('estimated_tax', e.target.value)}
            required
          />
        </label>
        <label>{t('extension.taxPayments')}
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.tax_payments}
            onChange={e => set('tax_payments', e.target.value)}
            required
          />
        </label>
        <label>{t('extension.balanceDue')}
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.balance_due}
            onChange={e => set('balance_due', e.target.value)}
            required
          />
        </label>

        <hr style={{ margin: '16px 0', borderColor: 'rgba(255,255,255,0.1)' }} />
        <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '8px' }}>
          IRS Identity Verification (required for e-filing)
        </p>

        <label>Date of Birth
          <input
            type="text"
            placeholder="MM/DD/YYYY"
            value={form.dob}
            onChange={e => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
              let formatted = digits
              if (digits.length > 4) formatted = `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`
              else if (digits.length > 2) formatted = `${digits.slice(0,2)}/${digits.slice(2)}`
              set('dob', formatted)
            }}
            maxLength={10}
            required
          />
        </label>

        <label>5-Digit IRS Self-Select PIN
          <input
            type="text"
            placeholder="5-digit PIN (you choose)"
            value={form.pin}
            onChange={e => set('pin', e.target.value.replace(/\D/g, '').slice(0, 5))}
            inputMode="numeric"
            maxLength={5}
            required
          />
        </label>

        <label>Prior Year Adjusted Gross Income ($)
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="From last year's tax return"
            value={form.prev_year_agi}
            onChange={e => set('prev_year_agi', e.target.value)}
            required
          />
        </label>

        <button type="submit" className={styles.btnSubmit} disabled={loading}>
          {loading ? '...' : t('extension.submit')}
        </button>
      </form>
    </div>
  )
}
