"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError("Invalid email or password")
    } else {
      router.push("/dashboard")
    }
  }

  return (
    <div className="login-root">
      <div className="login-left">
        <div className="brand">
          <div className="brand-icon">
            <svg viewBox="0 0 40 40" fill="none">
              <rect x="4" y="8" width="32" height="26" rx="3" stroke="currentColor" strokeWidth="2.5"/>
              <path d="M4 16h32" stroke="currentColor" strokeWidth="2.5"/>
              <path d="M12 24h8M12 29h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <rect x="24" y="22" width="8" height="9" rx="1.5" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <span className="brand-name">TaxApp</span>
        </div>
        <div className="hero">
          <h1>Professional<br/>tax filing,<br/>simplified.</h1>
          <p>Prepare, review, and e-file federal and state returns from one place. Built for preparers and their clients.</p>
        </div>
        <div className="feature-list">
          <div className="feature"><span className="dot"/>1040 · 1120-S · 1065</div>
          <div className="feature"><span className="dot"/>Extensions: 4868 · 7004</div>
          <div className="feature"><span className="dot"/>IRS MeF e-filing</div>
          <div className="feature"><span className="dot"/>Client portal &amp; e-signature</div>
        </div>
      </div>

      <div className="login-right">
        <div className="form-card">
          <div className="form-header">
            <h2>Sign in</h2>
            <p>Enter your credentials to access your account</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="field">
              <label htmlFor="password">
                Password
                <a href="/forgot-password" className="forgot">Forgot password?</a>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && <div className="error-msg">{error}</div>}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? <span className="spinner"/> : "Sign in"}
            </button>
          </form>

          <div className="form-footer">
            <span>Need access?</span>
            <a href="mailto:admin@taxapp.com">Contact your administrator</a>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .login-root {
          display: flex;
          min-height: 100vh;
          font-family: 'DM Sans', sans-serif;
          background: #0a0f1e;
        }

        /* ── LEFT PANEL ── */
        .login-left {
          flex: 1.1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px 56px;
          background: linear-gradient(145deg, #0d1428 0%, #0a1535 50%, #091020 100%);
          border-right: 1px solid rgba(255,255,255,0.06);
          position: relative;
          overflow: hidden;
        }

        .login-left::before {
          content: '';
          position: absolute;
          top: -120px; right: -120px;
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        .login-left::after {
          content: '';
          position: absolute;
          bottom: -80px; left: -80px;
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #fff;
        }

        .brand-icon {
          width: 40px; height: 40px;
          color: #3b82f6;
        }

        .brand-name {
          font-size: 20px;
          font-weight: 600;
          letter-spacing: -0.3px;
          color: #f8fafc;
        }

        .hero {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 60px 0 40px;
        }

        .hero h1 {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(42px, 5vw, 64px);
          line-height: 1.08;
          color: #f8fafc;
          margin-bottom: 24px;
          letter-spacing: -1px;
        }

        .hero p {
          font-size: 16px;
          line-height: 1.7;
          color: #94a3b8;
          max-width: 380px;
          font-weight: 300;
        }

        .feature-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .feature {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #64748b;
          font-weight: 400;
          letter-spacing: 0.3px;
        }

        .dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #3b82f6;
          flex-shrink: 0;
        }

        /* ── RIGHT PANEL ── */
        .login-right {
          flex: 0.9;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 40px;
          background: #f8fafc;
        }

        .form-card {
          width: 100%;
          max-width: 400px;
        }

        .form-header {
          margin-bottom: 36px;
        }

        .form-header h2 {
          font-family: 'DM Serif Display', serif;
          font-size: 32px;
          color: #0f172a;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }

        .form-header p {
          font-size: 14px;
          color: #64748b;
          font-weight: 400;
        }

        .field {
          margin-bottom: 20px;
        }

        .field label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 8px;
          letter-spacing: 0.1px;
        }

        .forgot {
          font-size: 12px;
          color: #3b82f6;
          text-decoration: none;
          font-weight: 400;
        }

        .forgot:hover { text-decoration: underline; }

        .field input {
          width: 100%;
          padding: 11px 14px;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          color: #0f172a;
          background: #fff;
          transition: border-color 0.15s, box-shadow 0.15s;
          outline: none;
        }

        .field input::placeholder { color: #cbd5e1; }

        .field input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
        }

        .error-msg {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          font-size: 13px;
          padding: 10px 14px;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .submit-btn {
          width: 100%;
          padding: 13px;
          background: #1e40af;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 46px;
          letter-spacing: 0.1px;
          margin-top: 8px;
        }

        .submit-btn:hover:not(:disabled) { background: #1d3a9e; }
        .submit-btn:active:not(:disabled) { transform: scale(0.99); }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .form-footer {
          margin-top: 28px;
          text-align: center;
          font-size: 13px;
          color: #94a3b8;
          display: flex;
          gap: 6px;
          justify-content: center;
        }

        .form-footer a {
          color: #3b82f6;
          text-decoration: none;
        }

        .form-footer a:hover { text-decoration: underline; }

        @media (max-width: 768px) {
          .login-root { flex-direction: column; }
          .login-left { padding: 36px 32px; flex: none; min-height: 280px; }
          .hero { padding: 32px 0 24px; }
          .login-right { flex: none; padding: 40px 24px; }
        }
      `}</style>
    </div>
  )
}
