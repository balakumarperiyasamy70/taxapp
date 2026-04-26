"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "./ReturnNav"

interface TaxReturn {
  id: string
  taxYear: number
  returnType: string
  status: string
  client: {
    firstName: string
    lastName: string
    ssn: string | null
  }
  f1040: {
    filingStatus: string | null
    totalIncome: number | null
    adjustedGrossIncome: number | null
    totalTax: number | null
    totalPayments: number | null
    refundOrOwed: number | null
  } | null
}

export default function ReturnDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [taxReturn, setTaxReturn] = useState<TaxReturn | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
    if (status === "authenticated") fetchReturn()
  }, [status])

  async function fetchReturn() {
    const res = await fetch(`/api/returns/${id}`)
    if (res.ok) {
      const json = await res.json()
      setTaxReturn(json.data)
    }
    setLoading(false)
  }

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
    </div>
  )

  if (!taxReturn) return (
    <div className="error-screen">
      <p>Return not found.</p>
      <button onClick={() => router.push("/dashboard")}>← Back to dashboard</button>
    </div>
  )

  const clientName = `${taxReturn.client.firstName} ${taxReturn.client.lastName}`
  const agi = taxReturn.f1040?.adjustedGrossIncome ?? 0
  const federal = taxReturn.f1040?.refundOrOwed ?? 0

  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={taxReturn.taxYear} />

      <main className="main">
        {/* Top bar */}
        <div className="topbar">
          <div className="client-info">
            <h1 className="client-name">{clientName}</h1>
            <span className="return-type">{taxReturn.taxYear} · Form 1040 · <span className={`status-badge status-${taxReturn.status.toLowerCase()}`}>{taxReturn.status.replace(/_/g, " ")}</span></span>
          </div>
          <div className="return-summary">
            <div className="summary-item">
              <div className="summary-label">AGI</div>
              <div className="summary-value">${agi.toLocaleString()}</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Federal</div>
              <div className={`summary-value ${federal >= 0 ? "refund" : "owed"}`}>
                {federal >= 0 ? `$${federal.toLocaleString()} refund` : `$${Math.abs(federal).toLocaleString()} owed`}
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-label">State - AR</div>
              <div className="summary-value">—</div>
            </div>
          </div>
        </div>

        {/* Main action cards */}
        <div className="section-cards">
          <ActionCard
            title="Basic Information"
            desc="Filing status, personal info, dependents, IP PIN"
            href={`/dashboard/returns/${id}/basic-info`}
            complete={!!taxReturn.f1040?.filingStatus}
          />
          <ActionCard
            title="Federal Section"
            desc="Income, deductions, credits, other taxes, payments"
            href={`/dashboard/returns/${id}/federal/income`}
            complete={false}
          />
          <ActionCard
            title="Health Insurance"
            desc="ACA / Form 1095-A marketplace coverage"
            href={`/dashboard/returns/${id}/health`}
            complete={false}
          />
          <ActionCard
            title="State Section"
            desc="Arkansas state return"
            href={`/dashboard/returns/${id}/state`}
            complete={false}
          />
          <ActionCard
            title="Summary / Print"
            desc="Review all 1040 lines and print return"
            href={`/dashboard/returns/${id}/summary`}
            complete={false}
          />
          <ActionCard
            title="E-file"
            desc="Submit return to IRS MeF"
            href={`/dashboard/returns/${id}/efile`}
            complete={taxReturn.status === "ACCEPTED"}
            locked={taxReturn.status === "DRAFT" || taxReturn.status === "IN_REVIEW"}
          />
        </div>

        {/* Quick links */}
        <div className="quick-links">
          <h2>Quick Actions</h2>
          <div className="links-row">
            <a href={`/dashboard/returns/${id}/prepcheck`} className="link-card">
              <div className="link-icon">✓</div>
              <div>PrepCheck</div>
            </a>
            <a href={`/dashboard/returns/${id}/amended`} className="link-card">
              <div className="link-icon">✎</div>
              <div>Amended Return</div>
            </a>
            <a href={`/dashboard/returns/${id}/portal`} className="link-card">
              <div className="link-icon">👤</div>
              <div>Customer Portal</div>
            </a>
            <a href={`/dashboard/returns/${id}/extension`} className="link-card">
              <div className="link-icon">⏱</div>
              <div>File Extension</div>
            </a>
          </div>
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .root { display: flex; min-height: 100vh; font-family: 'DM Sans', sans-serif; background: #f8fafc; }
        .main { flex: 1; margin-left: 220px; padding: 0; }

        .topbar { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 20px 32px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 10; }
        .client-name { font-size: 20px; font-weight: 600; color: #0f172a; }
        .return-type { font-size: 13px; color: #64748b; margin-top: 2px; display: block; }
        .status-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
        .status-draft { background: #f1f5f9; color: #64748b; }
        .status-in_review { background: #eff6ff; color: #2563eb; }
        .status-accepted { background: #f0fdf4; color: #16a34a; }
        .status-rejected { background: #fef2f2; color: #dc2626; }

        .return-summary { display: flex; gap: 32px; }
        .summary-item { text-align: right; }
        .summary-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
        .summary-value { font-size: 16px; font-weight: 600; color: #0f172a; margin-top: 2px; }
        .summary-value.refund { color: #16a34a; }
        .summary-value.owed { color: #dc2626; }

        .section-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 28px 32px; }

        .quick-links { padding: 0 32px 32px; }
        .quick-links h2 { font-size: 14px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
        .links-row { display: flex; gap: 12px; }
        .link-card { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; text-decoration: none; color: #374151; font-size: 13px; font-weight: 500; transition: all 0.15s; }
        .link-card:hover { border-color: #3b82f6; color: #3b82f6; background: #eff6ff; }
        .link-icon { font-size: 16px; }

        .loading-screen { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .error-screen { padding: 40px; }
      `}</style>
    </div>
  )
}

function ActionCard({ title, desc, href, complete, locked }: {
  title: string
  desc: string
  href: string
  complete: boolean
  locked?: boolean
}) {
  const router = useRouter()
  return (
    <div
      className={`action-card ${complete ? "complete" : ""} ${locked ? "locked" : ""}`}
      onClick={() => !locked && router.push(href)}
    >
      <div className="card-status">
        {complete ? <span className="check">✓</span> : locked ? <span className="lock">🔒</span> : <span className="pending">○</span>}
      </div>
      <div className="card-body">
        <div className="card-title">{title}</div>
        <div className="card-desc">{desc}</div>
      </div>
      {!locked && <span className="card-arrow">→</span>}
      <style>{`
        .action-card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; cursor: pointer; display: flex; align-items: center; gap: 14px; transition: all 0.15s; }
        .action-card:hover:not(.locked) { border-color: #3b82f6; box-shadow: 0 2px 8px rgba(59,130,246,0.1); }
        .action-card.complete { border-color: #bbf7d0; background: #f0fdf4; }
        .action-card.locked { cursor: not-allowed; opacity: 0.5; }
        .check { color: #16a34a; font-size: 18px; font-weight: 700; }
        .pending { color: #cbd5e1; font-size: 18px; }
        .lock { font-size: 16px; }
        .card-body { flex: 1; }
        .card-title { font-size: 14px; font-weight: 600; color: #0f172a; }
        .card-desc { font-size: 12px; color: #94a3b8; margin-top: 2px; }
        .card-arrow { color: #94a3b8; font-size: 16px; }
      `}</style>
    </div>
  )
}
