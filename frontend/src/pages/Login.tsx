import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import styles from './Form.module.css'

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { setAuth } = useAuthStore()
  const successMessage = (location.state as any)?.message || ''
  const [form, setForm] = useState({ email: '', password: '', mfa_code: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/login', form)
      setAuth(res.data.access_token, { email: form.email })
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.card}>
      <h2>{t('auth.loginTitle')}</h2>
      {successMessage && <div className={styles.success}>{successMessage}</div>}
      {error && <div className={styles.error}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <label>{t('auth.email')}
          <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
        </label>
        <label>{t('auth.password')}
          <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
        </label>
        <label>{t('auth.mfaCode')} (optional)
          <input type="text" value={form.mfa_code} onChange={e => setForm({...form, mfa_code: e.target.value})} />
        </label>
        <button type="submit" className={styles.btnSubmit} disabled={loading}>
          {loading ? '...' : t('auth.login')}
        </button>
      </form>
      <p className={styles.switchLink}>
        <Link to="/forgot-password">Forgot password?</Link>
      </p>
      <p className={styles.switchLink}>
        Don't have an account? <Link to="/register">{t('auth.register')}</Link>
      </p>
    </div>
  )
}
