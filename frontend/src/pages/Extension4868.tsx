import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import styles from './Form.module.css'

export default function Extension4868() {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    tax_year: 2024, first_name: '', last_name: '', ssn: '',
    address: '', city: '', state: '', zip_code: '',
    estimated_tax: '', tax_payments: '', balance_due: ''
  })
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({...f, [k]: v}))

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
            <input value={form.first_name} onChange={e => set('first_name', e.target.value)} required />
          </label>
          <label>{t('auth.lastName')}
            <input value={form.last_name} onChange={e => set('last_name', e.target.value)} required />
          </label>
        </div>
        <label>{t('identity.ssn')}
          <input placeholder="XXX-XX-XXXX" value={form.ssn} onChange={e => set('ssn', e.target.value)} required />
        </label>
        <label>Address
          <input value={form.address} onChange={e => set('address', e.target.value)} required />
        </label>
        <div className={styles.row3}>
          <label>City <input value={form.city} onChange={e => set('city', e.target.value)} required /></label>
          <label>State <input value={form.state} maxLength={2} onChange={e => set('state', e.target.value)} required /></label>
          <label>ZIP <input value={form.zip_code} onChange={e => set('zip_code', e.target.value)} required /></label>
        </div>
        <label>{t('extension.estimatedTax')}
          <input type="number" step="0.01" value={form.estimated_tax} onChange={e => set('estimated_tax', e.target.value)} required />
        </label>
        <label>{t('extension.taxPayments')}
          <input type="number" step="0.01" value={form.tax_payments} onChange={e => set('tax_payments', e.target.value)} required />
        </label>
        <label>{t('extension.balanceDue')}
          <input type="number" step="0.01" value={form.balance_due} onChange={e => set('balance_due', e.target.value)} required />
        </label>
        <button type="submit" className={styles.btnSubmit} disabled={loading}>
          {loading ? '...' : t('extension.submit')}
        </button>
      </form>
    </div>
  )
}
