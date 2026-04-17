import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import styles from './Dashboard.module.css'

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
    </div>
  )
}
