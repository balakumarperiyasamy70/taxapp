import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import styles from './Dashboard.module.css'
import formStyles from './Form.module.css'

interface Props { site: string }

interface TaxReturn {
  id: number
  tax_year: number
  return_type: string
  status: string
  tax_owed_cents: number
  refund_amount_cents: number
  submission_id: string | null
  created_at: string
}

interface Loan {
  id: number
  requested_amount_cents: number
  approved_amount_cents: number | null
  status: string
  created_at: string
}

const RETURN_LABELS: Record<string, string> = {
  '4868': 'Form 4868 (Extension)',
  '1040': 'Form 1040 (Individual)',
  'schedule_c': 'Schedule C (Sole Prop)',
  '1120s': 'Form 1120-S (S-Corp)',
  '1065': 'Form 1065 (Partnership)',
}

const STATUS_COLORS: Record<string, string> = {
  draft: styles.statusDraft,
  submitted: styles.statusSubmitted,
  accepted: styles.statusAccepted,
  rejected: styles.statusRejected,
  pending: styles.statusDraft,
  approved: styles.statusAccepted,
  denied: styles.statusRejected,
  disbursed: styles.statusAccepted,
}

function fmt(cents: number) { return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}` }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }

export default function Dashboard({ site }: Props) {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [returns, setReturns] = useState<TaxReturn[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)
  const [emailModal, setEmailModal] = useState<{ returnId: number; returnType: string } | null>(null)
  const [dob, setDob] = useState('')
  const [emailStatus, setEmailStatus] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)

  const handleDownload = async (id: number, returnType: string, taxYear: number) => {
    try {
      const res = await api.get(`/tax/returns/${id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `TaxReturn_${returnType}_${taxYear}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Download failed. Please try again.') }
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailModal) return
    setEmailLoading(true)
    setEmailStatus('')
    try {
      const res = await api.post(`/tax/returns/${emailModal.returnId}/email-pdf`, { dob })
      setEmailStatus(res.data.message)
    } catch (err: any) {
      setEmailStatus(err.response?.data?.detail || 'Failed to send email')
    } finally {
      setEmailLoading(false)
    }
  }

  useEffect(() => {
    Promise.all([
      api.get('/tax/returns').catch(() => ({ data: [] })),
      api.get('/loans/').catch(() => ({ data: [] })),
    ]).then(([r, l]) => {
      setReturns(r.data)
      setLoans(l.data)
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h2 className={styles.welcome}>Welcome, {user?.email}</h2>

      {/* Service cards */}
      <div className={styles.cards}>
        {site === 'extension' && (
          <Link to="/extension" className={styles.card}>
            <div className={styles.icon}>📋</div>
            <h3>{t('extension.title')}</h3>
            <p>{t('extension.subtitle')}</p>
          </Link>
        )}
        {site === 'filing' && (<>
          <Link to="/filing" className={styles.card}>
            <div className={styles.icon}>📄</div>
            <h3>{t('filing.title')}</h3>
            <p>File your federal tax return online</p>
          </Link>
          <Link to="/business" className={styles.card}>
            <div className={styles.icon}>🏢</div>
            <h3>Business Tax Filing</h3>
            <p>Schedule C, S-Corp, Partnership returns</p>
          </Link>
        </>)}
        {site === 'loan' && (
          <Link to="/loan" className={styles.card}>
            <div className={styles.icon}>💰</div>
            <h3>{t('loan.title')}</h3>
            <p>{t('loan.subtitle')}</p>
          </Link>
        )}
        <Link to="/verify" className={styles.card}>
          <div className={styles.icon}>🔒</div>
          <h3>{t('identity.title')}</h3>
          <p>Verify your identity to proceed</p>
        </Link>
      </div>

      {/* Filed Returns */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>My Filed Returns</h3>
        {loading ? (
          <p className={styles.empty}>Loading...</p>
        ) : returns.length === 0 ? (
          <p className={styles.empty}>No returns filed yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Tax Year</th>
                  <th>Status</th>
                  <th>Tax Owed</th>
                  <th>Refund</th>
                  <th>Filed</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {returns.map(r => (
                  <tr key={r.id}>
                    <td>#{r.id}</td>
                    <td>{RETURN_LABELS[r.return_type] || r.return_type}</td>
                    <td>{r.tax_year}</td>
                    <td><span className={`${styles.badge} ${STATUS_COLORS[r.status] || ''}`}>{r.status}</span></td>
                    <td>{r.tax_owed_cents > 0 ? fmt(r.tax_owed_cents) : '—'}</td>
                    <td>{r.refund_amount_cents > 0 ? fmt(r.refund_amount_cents) : '—'}</td>
                    <td>{fmtDate(r.created_at)}</td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.btnDownload} onClick={() => handleDownload(r.id, r.return_type, r.tax_year)}>⬇ PDF</button>
                        <button className={styles.btnEmail} onClick={() => { setEmailModal({ returnId: r.id, returnType: r.return_type }); setDob(''); setEmailStatus('') }}>✉ Email</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Loan Applications */}
      {(site === 'loan' || loans.length > 0) && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>My Loan Applications</h3>
          {loading ? (
            <p className={styles.empty}>Loading...</p>
          ) : loans.length === 0 ? (
            <p className={styles.empty}>No loan applications yet.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Requested</th>
                    <th>Approved</th>
                    <th>Status</th>
                    <th>Applied</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map(l => (
                    <tr key={l.id}>
                      <td>#{l.id}</td>
                      <td>{fmt(l.requested_amount_cents)}</td>
                      <td>{l.approved_amount_cents != null ? fmt(l.approved_amount_cents) : '—'}</td>
                      <td><span className={`${styles.badge} ${STATUS_COLORS[l.status] || ''}`}>{l.status}</span></td>
                      <td>{fmtDate(l.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Email PDF Modal */}
      {emailModal && (
        <div className={styles.modalOverlay} onClick={() => setEmailModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>Email Password-Protected PDF</h3>
            <p style={{ fontSize: '0.88rem', color: '#666', marginBottom: '1rem' }}>
              The PDF will be sent to <strong>{user?.email}</strong> with a password.<br />
              Password = <strong>birth year + last 4 digits of SSN/EIN</strong><br />
              Example: <em>19700078</em>
            </p>
            {emailStatus ? (
              <div className={emailStatus.includes('sent') ? formStyles.success : formStyles.error}>
                {emailStatus}
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem', fontWeight: 500 }}>
                  Your Date of Birth (to generate password)
                  <input
                    type="text" placeholder="MM/DD/YYYY" value={dob} maxLength={10}
                    onChange={e => {
                      const d = e.target.value.replace(/\D/g, '').slice(0, 8)
                      let f = d
                      if (d.length > 4) f = `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`
                      else if (d.length > 2) f = `${d.slice(0,2)}/${d.slice(2)}`
                      setDob(f)
                    }}
                    style={{ padding: '0.6rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.95rem' }}
                    required
                  />
                </label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                  <button type="submit" className={formStyles.btnSubmit} disabled={emailLoading} style={{ flex: 1 }}>
                    {emailLoading ? 'Sending...' : 'Send PDF'}
                  </button>
                  <button type="button" onClick={() => setEmailModal(null)}
                    style={{ flex: 1, padding: '0.8rem', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', background: 'white' }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
            {emailStatus && (
              <button onClick={() => setEmailModal(null)}
                style={{ marginTop: '1rem', width: '100%', padding: '0.7rem', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', background: 'white' }}>
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
