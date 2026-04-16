import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import styles from './Form.module.css'

export default function Register() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '', phone: '', language: 'en' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/register', form)
      const res = await api.post('/auth/login', { email: form.email, password: form.password })
      setAuth(res.data.access_token, { email: form.email })
      navigate('/verify')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.card}>
      <h2>{t('auth.registerTitle')}</h2>
      {error && <div className={styles.error}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className={styles.row}>
          <label>{t('auth.firstName')}
            <input value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} required />
          </label>
          <label>{t('auth.lastName')}
            <input value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} required />
          </label>
        </div>
        <label>{t('auth.email')}
          <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
        </label>
        <label>{t('auth.password')}
          <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
        </label>
        <label>{t('auth.phone')}
          <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
        </label>
        <label>Language
          <select value={form.language} onChange={e => setForm({...form, language: e.target.value})}>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </label>
        <button type="submit" className={styles.btnSubmit} disabled={loading}>
          {loading ? '...' : t('auth.register')}
        </button>
      </form>
      <p className={styles.switchLink}>
        Already have an account? <Link to="/login">{t('auth.login')}</Link>
      </p>
    </div>
  )
}
