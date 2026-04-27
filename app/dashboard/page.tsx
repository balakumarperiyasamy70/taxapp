"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:              { label: "Draft",              color: "#64748b", bg: "#f1f5f9" },
  IN_REVIEW:          { label: "In Review",          color: "#2563eb", bg: "#eff6ff" },
  PENDING_SIGNATURE:  { label: "Awaiting Signature", color: "#d97706", bg: "#fffbeb" },
  SIGNED:             { label: "Signed",             color: "#0891b2", bg: "#ecfeff" },
  SUBMITTED:          { label: "Submitted",          color: "#7c3aed", bg: "#f5f3ff" },
  ACCEPTED:           { label: "Accepted",           color: "#16a34a", bg: "#f0fdf4" },
  REJECTED:           { label: "Rejected",           color: "#dc2626", bg: "#fef2f2" },
  AMENDED:            { label: "Amended",            color: "#ea580c", bg: "#fff7ed" },
  EXTENSION_FILED:    { label: "Extension Filed",    color: "#0891b2", bg: "#ecfeff" },
  EXTENSION_REJECTED: { label: "Ext. Rejected",      color: "#dc2626", bg: "#fef2f2" },
}

const RETURN_TYPE_LABELS: Record<string, string> = {
  F1040:  "1040 Individual",
  F1120S: "1120-S S-Corp",
  F1065:  "1065 Partnership",
}

interface Return {
  id: string
  taxYear: number
  returnType: string
  status: string
  updatedAt: string
  client: { firstName: string; lastName: string; businessName: string | null }
  preparer: { name: string } | null
  extensions: { status: string; extendedDueDate: string }[]
}

interface Pagination {
  page: number
  total: number
  totalPages: number
}

const STATUSES = ["ALL", "DRAFT", "IN_REVIEW", "PENDING_SIGNATURE", "SIGNED", "SUBMITTED", "ACCEPTED", "REJECTED", "EXTENSION_FILED"]
const YEARS = [2025, 2024, 2023]

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [returns, setReturns] = useState<Return[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState("ALL")
  const [filterYear, setFilterYear] = useState<number | "">("")
  const [filterType, setFilterType] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  useEffect(() => {
    if (status !== "authenticated") return
    fetchReturns()
  }, [status, filterStatus, filterYear, filterType, page])

  async function fetchReturns() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: "20" })
    if (filterStatus !== "ALL") params.set("status", filterStatus)
    if (filterYear) params.set("taxYear", String(filterYear))
    if (filterType) params.set("returnType", filterType)

    const res = await fetch(`/api/returns?${params}`)
    if (res.ok) {
      const json = await res.json()
      setReturns(json.data.returns)
      setPagination(json.data.pagination)
    }
    setLoading(false)
  }

  const filtered = search
    ? returns.filter(r => {
        const name = r.client.businessName ?? `${r.client.firstName} ${r.client.lastName}`
        return name.toLowerCase().includes(search.toLowerCase())
      })
    : returns

  const stats = {
    total: pagination.total,
    inReview: returns.filter(r => r.status === "IN_REVIEW").length,
    awaitingSig: returns.filter(r => r.status === "PENDING_SIGNATURE").length,
    accepted: returns.filter(r => r.status === "ACCEPTED").length,
  }

  if (status === "loading") return <div className="loading-screen"><div className="spinner-lg"/></div>

  return (
    <div className="root">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
            <rect x="4" y="8" width="32" height="26" rx="3" stroke="#3b82f6" strokeWidth="2.5"/>
            <path d="M4 16h32" stroke="#3b82f6" strokeWidth="2.5"/>
            <path d="M12 24h8M12 29h5" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
            <rect x="24" y="22" width="8" height="9" rx="1.5" stroke="#3b82f6" strokeWidth="2"/>
          </svg>
          <span>TaxApp</span>
        </div>
        <nav className="sidebar-nav">
          <a href="/dashboard" className="nav-item active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Dashboard
          </a>
          <a href="/dashboard/returns/new" className="nav-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            New Return
          </a>
          <a href="/dashboard/extensions" className="nav-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Extensions
          </a>
          <a href="/dashboard/clients" className="nav-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Clients
          </a>
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{session?.user?.name?.[0] ?? "?"}</div>
            <div className="user-details">
              <div className="user-name">{session?.user?.name}</div>
              <div className="user-role">{(session?.user as any)?.role}</div>
            </div>
          </div>
          <button className="signout-btn" onClick={() => signOut({ callbackUrl: "/login" })}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        {/* Header */}
        <header className="topbar">
          <div>
            <h1 className="page-title">Returns</h1>
            <p className="page-sub">Tax year 2025 · {pagination.total} total</p>
          </div>
          <button className="new-btn" onClick={() => router.push("/dashboard/returns/new")}>
            + New Return
          </button>
        </header>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-num">{stats.total}</div>
            <div className="stat-label">Total Returns</div>
          </div>
          <div className="stat-card">
            <div className="stat-num" style={{color:"#2563eb"}}>{stats.inReview}</div>
            <div className="stat-label">In Review</div>
          </div>
          <div className="stat-card">
            <div className="stat-num" style={{color:"#d97706"}}>{stats.awaitingSig}</div>
            <div className="stat-label">Awaiting Signature</div>
          </div>
          <div className="stat-card">
            <div className="stat-num" style={{color:"#16a34a"}}>{stats.accepted}</div>
            <div className="stat-label">Accepted</div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <input
            className="search-input"
            placeholder="Search client name..."
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
          />
          <select className="filter-select" value={filterStatus} onChange={(e: any) => { setFilterStatus(e.target.value); setPage(1) }}>
            {STATUSES.map(s => <option key={s} value={s}>{s === "ALL" ? "All Statuses" : STATUS_CONFIG[s]?.label ?? s}</option>)}
          </select>
          <select className="filter-select" value={filterYear} onChange={(e: any) => { setFilterYear(e.target.value ? Number(e.target.value) : ""); setPage(1) }}>
            <option value="">All Years</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="filter-select" value={filterType} onChange={(e: any) => { setFilterType(e.target.value); setPage(1) }}>
            <option value="">All Types</option>
            {Object.entries(RETURN_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="table-wrap">
          {loading ? (
            <div className="table-loading"><div className="spinner-lg"/></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <p>No returns found</p>
              <button className="new-btn" onClick={() => router.push("/dashboard/returns/new")}>Create your first return</button>
            </div>
          ) : (
            <table className="returns-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Year</th>
                  <th>Status</th>
                  <th>Preparer</th>
                  <th>Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const clientName = r.client.businessName ?? `${r.client.firstName} ${r.client.lastName}`
                  const sc = STATUS_CONFIG[r.status] ?? { label: r.status, color: "#64748b", bg: "#f1f5f9" }
                  const hasExt = r.extensions?.[0]?.status === "ACCEPTED"
                  return (
                    <tr key={r.id} onClick={() => router.push(`/dashboard/returns/${r.id}`)} className="table-row">
                      <td>
                        <div className="client-name">{clientName}</div>
                        {hasExt && <span className="ext-badge">Extension</span>}
                      </td>
                      <td className="type-cell">{RETURN_TYPE_LABELS[r.returnType] ?? r.returnType}</td>
                      <td className="year-cell">{r.taxYear}</td>
                      <td>
                        <span className="status-badge" style={{ color: sc.color, background: sc.bg }}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="preparer-cell">{r.preparer?.name ?? "—"}</td>
                      <td className="date-cell">{new Date(r.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                      <td>
                        <button className="open-btn" onClick={e => { e.stopPropagation(); router.push(`/dashboard/returns/${r.id}`) }}>
                          Open →
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="pagination">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="page-btn">← Prev</button>
            <span className="page-info">Page {page} of {pagination.totalPages}</span>
            <button disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)} className="page-btn">Next →</button>
          </div>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f8fafc; }

        .root { display: flex; min-height: 100vh; font-family: 'DM Sans', sans-serif; background: #f8fafc; }

        /* Sidebar */
        .sidebar { width: 220px; background: #0f172a; display: flex; flex-direction: column; flex-shrink: 0; position: fixed; top: 0; left: 0; height: 100vh; }
        .sidebar-brand { display: flex; align-items: center; gap: 10px; padding: 24px 20px; color: #f8fafc; font-size: 17px; font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .sidebar-nav { flex: 1; padding: 16px 12px; display: flex; flex-direction: column; gap: 4px; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 7px; color: #94a3b8; text-decoration: none; font-size: 14px; font-weight: 400; transition: background 0.15s, color 0.15s; }
        .nav-item:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
        .nav-item.active { background: rgba(59,130,246,0.15); color: #60a5fa; }
        .sidebar-footer { padding: 16px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; gap: 10px; }
        .user-avatar { width: 32px; height: 32px; border-radius: 50%; background: #1e40af; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; flex-shrink: 0; }
        .user-details { flex: 1; min-width: 0; }
        .user-name { font-size: 13px; font-weight: 500; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .user-role { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .signout-btn { background: none; border: none; cursor: pointer; color: #64748b; padding: 4px; display: flex; align-items: center; transition: color 0.15s; }
        .signout-btn:hover { color: #94a3b8; }

        /* Main */
        .main { margin-left: 220px; flex: 1; padding: 32px 36px; min-height: 100vh; }
        .topbar { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; }
        .page-title { font-size: 24px; font-weight: 600; color: #0f172a; letter-spacing: -0.3px; }
        .page-sub { font-size: 13px; color: #94a3b8; margin-top: 2px; }
        .new-btn { background: #1e40af; color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: background 0.15s; white-space: nowrap; }
        .new-btn:hover { background: #1d3a9e; }

        /* Stats */
        .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        .stat-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px 24px; }
        .stat-num { font-size: 28px; font-weight: 600; color: #0f172a; letter-spacing: -0.5px; }
        .stat-label { font-size: 12px; color: #94a3b8; margin-top: 4px; font-weight: 400; }

        /* Filters */
        .filters-bar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
        .search-input { flex: 1; min-width: 200px; padding: 9px 14px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-family: 'DM Sans', sans-serif; color: #0f172a; outline: none; background: #fff; }
        .search-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .filter-select { padding: 9px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 13px; font-family: 'DM Sans', sans-serif; color: #374151; background: #fff; outline: none; cursor: pointer; }
        .filter-select:focus { border-color: #3b82f6; }

        /* Table */
        .table-wrap { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
        .returns-table { width: 100%; border-collapse: collapse; }
        .returns-table th { padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #f1f5f9; background: #fafafa; }
        .table-row { cursor: pointer; transition: background 0.1s; }
        .table-row:hover { background: #f8fafc; }
        .returns-table td { padding: 14px 16px; font-size: 14px; color: #374151; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .returns-table tr:last-child td { border-bottom: none; }
        .client-name { font-weight: 500; color: #0f172a; }
        .ext-badge { display: inline-block; margin-top: 3px; font-size: 10px; color: #0891b2; background: #ecfeff; padding: 1px 6px; border-radius: 4px; font-weight: 500; }
        .type-cell { color: #64748b; font-size: 13px; }
        .year-cell { font-weight: 500; color: #0f172a; }
        .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; white-space: nowrap; }
        .preparer-cell { color: #64748b; font-size: 13px; }
        .date-cell { color: #94a3b8; font-size: 13px; }
        .open-btn { background: none; border: 1px solid #e2e8f0; padding: 5px 12px; border-radius: 6px; font-size: 12px; color: #64748b; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
        .open-btn:hover { border-color: #3b82f6; color: #3b82f6; background: #eff6ff; }

        /* Empty */
        .empty-state { padding: 64px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; }
        .empty-state p { color: #94a3b8; font-size: 15px; }
        .table-loading { padding: 64px; display: flex; justify-content: center; }

        /* Pagination */
        .pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 24px; }
        .page-btn { background: #fff; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 8px; font-size: 13px; cursor: pointer; font-family: 'DM Sans', sans-serif; color: #374151; transition: all 0.15s; }
        .page-btn:hover:not(:disabled) { border-color: #3b82f6; color: #3b82f6; }
        .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .page-info { font-size: 13px; color: #94a3b8; }

        /* Spinners */
        .loading-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f8fafc; }
        .spinner-lg { width: 36px; height: 36px; border: 3px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
