import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import styles from './Form.module.css'

export default function LoanApplication() {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    tax_return_id: '', requested_amount: '', bank_routing: '', bank_account: ''
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
      const res = await api.post('/loans/apply', {
        tax_return_id: parseInt(form.tax_return_id),
        requested_amount: parseFloat(form.requested_amount),
        bank_routing: form.bank_routing,
        bank_account: form.bank_account,
      })
      setResult(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Application failed')
    } finally {
      setLoading(false)
    }
  }

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
      <form onSubmit={handleSubmit}>
        <label>Tax Return ID
          <input type="number" value={form.tax_return_id} onChange={e => set('tax_return_id', e.target.value)} required />
        </label>
        <label>{t('loan.amount')} <span className={styles.hint}>{t('loan.maxAmount')}</span>
          <input type="number" step="0.01" max="4000" value={form.requested_amount} onChange={e => set('requested_amount', e.target.value)} required />
        </label>
        <label>{t('loan.bankRouting')}
          <input type="text" value={form.bank_routing} onChange={e => set('bank_routing', e.target.value)} required />
        </label>
        <label>{t('loan.bankAccount')}
          <input type="text" value={form.bank_account} onChange={e => set('bank_account', e.target.value)} required />
        </label>
        <button type="submit" className={styles.btnSubmit} disabled={loading}>
          {loading ? '...' : t('loan.apply')}
        </button>
      </form>
    </div>
  )
}
