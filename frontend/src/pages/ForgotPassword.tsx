import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import styles from './Form.module.css'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/forgot-password', { email })
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) return (
    <div className={styles.card}>
      <h2>Check your email</h2>
      <div className={styles.success}>
        If <strong>{email}</strong> is registered, a password reset link has been sent. Check your inbox (and spam folder).
      </div>
      <p className={styles.switchLink}><Link to="/login">Back to login</Link></p>
    </div>
  )

  return (
    <div className={styles.card}>
      <h2>Forgot Password</h2>
      <p className={styles.subtitle}>Enter your email and we'll send you a reset link.</p>
      {error && <div className={styles.error}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <label>Email address
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
        </label>
        <button type="submit" className={styles.btnSubmit} disabled={loading}>
          {loading ? '...' : 'Send Reset Link'}
        </button>
      </form>
      <p className={styles.switchLink}><Link to="/login">Back to login</Link></p>
    </div>
  )
}
