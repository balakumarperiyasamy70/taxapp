import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import styles from './Form.module.css'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!token) return (
    <div className={styles.card}>
      <div className={styles.error}>Invalid reset link. Please request a new one.</div>
      <p className={styles.switchLink}><Link to="/forgot-password">Request reset link</Link></p>
    </div>
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/reset-password', { token, new_password: password })
      navigate('/login', { state: { message: 'Password reset successfully. Please log in.' } })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Reset failed. Link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.card}>
      <h2>Reset Password</h2>
      <p className={styles.subtitle}>Enter your new password below.</p>
      {error && <div className={styles.error}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <label>New Password
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoFocus minLength={8} />
        </label>
        <label>Confirm Password
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} />
        </label>
        <button type="submit" className={styles.btnSubmit} disabled={loading}>
          {loading ? '...' : 'Set New Password'}
        </button>
      </form>
    </div>
  )
}
