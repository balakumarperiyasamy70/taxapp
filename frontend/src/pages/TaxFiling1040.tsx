import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import styles from './Form.module.css'

export default function TaxFiling1040() {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    tax_year: 2024, filing_status: 'single',
    first_name: '', last_name: '', ssn: '',
    address: '', city: '', state: '', zip_code: '',
    wages: '', interest: '', dividends: '', other_income: '',
    standard_deduction: true, itemized_deductions: '0',
    child_tax_credit: '0', earned_income_credit: '0',
  })
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: any) => setForm(f => ({...f, [k]: v}))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

  if (result) return (
    <div className={styles.card}>
      <div className={styles.success}>✅ Return submitted!</div>
      <p><strong>Submission ID:</strong> {result.submission_id}</p>
      <p><strong>{t('filing.refundAmount')}:</strong> ${(result.refund_amount_cents / 100).toFixed(2)}</p>
      <p><strong>{t('filing.taxOwed')}:</strong> ${(result.tax_owed_cents / 100).toFixed(2)}</p>
    </div>
  )

  return (
    <div className={styles.card}>
      <h2>{t('filing.title')}</h2>
      {error && <div className={styles.error}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <label>{t('filing.filingStatus')}
          <select value={form.filing_status} onChange={e => set('filing_status', e.target.value)}>
            <option value="single">{t('filing.single')}</option>
            <option value="married_joint">{t('filing.marriedJoint')}</option>
            <option value="married_separate">{t('filing.marriedSeparate')}</option>
            <option value="head_household">{t('filing.headHousehold')}</option>
          </select>
        </label>
        <div className={styles.row}>
          <label>{t('auth.firstName')} <input value={form.first_name} onChange={e => set('first_name', e.target.value)} required /></label>
          <label>{t('auth.lastName')} <input value={form.last_name} onChange={e => set('last_name', e.target.value)} required /></label>
        </div>
        <label>{t('identity.ssn')} <input placeholder="XXX-XX-XXXX" value={form.ssn} onChange={e => set('ssn', e.target.value)} required /></label>
        <label>Address <input value={form.address} onChange={e => set('address', e.target.value)} required /></label>
        <div className={styles.row3}>
          <label>City <input value={form.city} onChange={e => set('city', e.target.value)} required /></label>
          <label>State <input value={form.state} maxLength={2} onChange={e => set('state', e.target.value)} required /></label>
          <label>ZIP <input value={form.zip_code} onChange={e => set('zip_code', e.target.value)} required /></label>
        </div>
        <h3 className={styles.sectionTitle}>Income</h3>
        <label>{t('filing.wages')} <input type="number" step="0.01" value={form.wages} onChange={e => set('wages', e.target.value)} /></label>
        <label>{t('filing.interest')} <input type="number" step="0.01" value={form.interest} onChange={e => set('interest', e.target.value)} /></label>
        <label>{t('filing.dividends')} <input type="number" step="0.01" value={form.dividends} onChange={e => set('dividends', e.target.value)} /></label>
        <label>{t('filing.otherIncome')} <input type="number" step="0.01" value={form.other_income} onChange={e => set('other_income', e.target.value)} /></label>
        <label className={styles.checkbox}>
          <input type="checkbox" checked={form.standard_deduction} onChange={e => set('standard_deduction', e.target.checked)} />
          {t('filing.standardDeduction')}
        </label>
        <button type="submit" className={styles.btnSubmit} disabled={loading}>
          {loading ? '...' : t('filing.submit')}
        </button>
      </form>
    </div>
  )
}
