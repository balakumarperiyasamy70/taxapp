import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import styles from './Form.module.css'

export default function VerifyIdentity() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [form, setForm] = useState({ ssn: '', dob: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/users/verify-identity', {
        ssn: form.ssn.replace(/-/g, ''),
        dob: form.dob,
        kba_answers: {},
      })
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.card}>
      <h2>{t('identity.title')}</h2>
      <p className={styles.subtitle}>Your information is encrypted and stored securely.</p>
      {error && <div className={styles.error}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <label>{t('identity.ssn')}
          <input
            type="text"
            placeholder="XXX-XX-XXXX"
            value={form.ssn}
            onChange={e => setForm({...form, ssn: e.target.value})}
            maxLength={11}
            required
          />
        </label>
        <label>{t('identity.dob')}
          <input
            type="date"
            value={form.dob}
            onChange={e => setForm({...form, dob: e.target.value})}
            required
          />
        </label>
        <button type="submit" className={styles.btnSubmit} disabled={loading}>
          {loading ? '...' : t('identity.verify')}
        </button>
      </form>
    </div>
  )
}
