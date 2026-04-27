"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../ReturnNav"

interface Check {
  id: string
  category: string
  severity: "error" | "warning" | "info" | "ok"
  message: string
  detail?: string
  field?: string
  path?: string
}

interface PrepCheckResult {
  status: "pass" | "warnings" | "errors"
  totalErrors: number
  totalWarnings: number
  checks: Check[]
}

const SEVERITY_CONFIG = {
  error:   { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: "✕", label: "Error" },
  warning: { color: "#d97706", bg: "#fffbeb", border: "#fde68a", icon: "⚠", label: "Warning" },
  info:    { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", icon: "ℹ", label: "Info" },
  ok:      { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", icon: "✓", label: "OK" },
}

const CATEGORIES = ["Personal Info", "Filing Status", "Income", "Deductions", "Credits & Payments", "Health Insurance", "State Return", "E-file Readiness"]

export default function PrepCheckPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const base = `/dashboard/returns/${id}`

  const [result, setResult] = useState<PrepCheckResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [filter, setFilter] = useState<"all" | "error" | "warning" | "ok">("all")
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => { runCheck() }, [])

  async function runCheck() {
    setRunning(true)
    setLoading(true)
    try {
      const res = await fetch(`/api/returns/${id}/prepcheck`)
      const json = await res.json()
      setResult(json.data)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
    setRunning(false)
  }

  function toggleCategory(cat: string) {
    setExpanded(e => ({ ...e, [cat]: !e[cat] }))
  }

  const filtered = result?.checks.filter(c =>
    filter === "all" ? true : c.severity === filter
  ) || []

  const byCategory = CATEGORIES.reduce((acc, cat) => {
    const items = filtered.filter(c => c.category === cat)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {} as Record<string, Check[]>)

  const canContinue = result && result.totalErrors === 0

  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={2025} />
      <main className="main">
        <div className="header">
          <div>
            <h1 className="title">PrepCheck</h1>
            <p className="subtitle">Review all issues before filing your return</p>
          </div>
          <button className="run-btn" onClick={runCheck} disabled={running}>
            {running ? "Running..." : "↻ Re-run Check"}
          </button>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner" />
            <p>Running diagnostics...</p>
          </div>
        ) : result ? (
          <>
            {/* Summary bar */}
            <div className={`summary-bar ${result.status}`}>
              <div className="summary-icon">
                {result.status === "pass" ? "✓" : result.status === "errors" ? "✕" : "⚠"}
              </div>
              <div className="summary-text">
                {result.status === "pass" && "All checks passed — ready to file!"}
                {result.status === "errors" && `${result.totalErrors} error${result.totalErrors !== 1 ? "s" : ""} must be fixed before filing`}
                {result.status === "warnings" && `${result.totalWarnings} warning${result.totalWarnings !== 1 ? "s" : ""} — review before filing`}
              </div>
              <div className="summary-counts">
                {result.totalErrors > 0 && <span className="count error">{result.totalErrors} Errors</span>}
                {result.totalWarnings > 0 && <span className="count warning">{result.totalWarnings} Warnings</span>}
                {result.totalErrors === 0 && result.totalWarnings === 0 && <span className="count ok">All Clear</span>}
              </div>
            </div>

            {/* Filter tabs */}
            <div className="filter-tabs">
              {(["all","error","warning","ok"] as const).map(f => (
                <button key={f} className={`filter-tab ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
                  {f === "all" ? "All" : f === "error" ? "Errors" : f === "warning" ? "Warnings" : "Passed"}
                  <span className="tab-count">
                    {f === "all" ? result.checks.length :
                     result.checks.filter(c => c.severity === f).length}
                  </span>
                </button>
              ))}
            </div>

            {/* Checks by category */}
            <div className="categories">
              {Object.entries(byCategory).map(([cat, checks]) => {
                const hasError = checks.some(c => c.severity === "error")
                const hasWarn = checks.some(c => c.severity === "warning")
                const isOpen = expanded[cat] !== false
                return (
                  <div key={cat} className="category">
                    <div className="cat-header" onClick={() => toggleCategory(cat)}>
                      <div className="cat-left">
                        <span className={`cat-dot ${hasError ? "error" : hasWarn ? "warning" : "ok"}`} />
                        <span className="cat-name">{cat}</span>
                        <span className="cat-count">{checks.length} item{checks.length !== 1 ? "s" : ""}</span>
                      </div>
                      <span className="chevron">{isOpen ? "▲" : "▼"}</span>
                    </div>
                    {isOpen && (
                      <div className="cat-items">
                        {checks.map(check => {
                          const cfg = SEVERITY_CONFIG[check.severity]
                          return (
                            <div key={check.id} className="check-item" style={{borderLeft: `3px solid ${cfg.color}`, background: cfg.bg}}>
                              <div className="check-header">
                                <span className="check-icon" style={{color: cfg.color}}>{cfg.icon}</span>
                                <span className="check-msg">{check.message}</span>
                                {check.path && (
                                  <button className="fix-btn" onClick={() => router.push(`${base}${check.path}`)}>
                                    Fix →
                                  </button>
                                )}
                              </div>
                              {check.detail && <p className="check-detail">{check.detail}</p>}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

              {Object.keys(byCategory).length === 0 && (
                <div className="empty">
                  <span>✓</span>
                  <p>No items match this filter</p>
                </div>
              )}
            </div>
          </>
        ) : null}

        <div className="nav-footer">
          <button className="back-btn" onClick={() => router.push(`${base}/summary`)}>BACK</button>
          <button
            className={`continue-btn ${!canContinue ? "disabled" : ""}`}
            onClick={() => canContinue && router.push(`${base}/efile`)}
            disabled={!canContinue}
            title={!canContinue ? "Fix all errors before continuing to e-file" : ""}
          >
            {canContinue ? "CONTINUE TO E-FILE →" : `FIX ${result?.totalErrors || 0} ERROR${(result?.totalErrors || 0) !== 1 ? "S" : ""} TO CONTINUE`}
          </button>
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .root{display:flex;min-height:100vh;font-family:'DM Sans',sans-serif;background:#f8fafc}
        .main{flex:1;margin-left:220px;padding:24px 36px;display:flex;flex-direction:column;gap:16px}
        .header{display:flex;justify-content:space-between;align-items:flex-start}
        .title{font-size:24px;font-weight:700;color:#0f172a}
        .subtitle{font-size:13px;color:#64748b;margin-top:4px}
        .run-btn{background:#1e3a5f;color:#fff;border:none;padding:9px 18px;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
        .run-btn:disabled{opacity:0.5;cursor:not-allowed}
        .loading{display:flex;flex-direction:column;align-items:center;gap:12px;padding:60px;color:#64748b}
        .spinner{width:32px;height:32px;border:3px solid #e2e8f0;border-top-color:#3b82f6;border-radius:50%;animation:spin 0.7s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .summary-bar{display:flex;align-items:center;gap:16px;padding:16px 20px;border-radius:10px;border:1.5px solid}
        .summary-bar.pass{background:#f0fdf4;border-color:#bbf7d0}
        .summary-bar.errors{background:#fef2f2;border-color:#fecaca}
        .summary-bar.warnings{background:#fffbeb;border-color:#fde68a}
        .summary-icon{font-size:24px;font-weight:700}
        .summary-bar.pass .summary-icon{color:#16a34a}
        .summary-bar.errors .summary-icon{color:#dc2626}
        .summary-bar.warnings .summary-icon{color:#d97706}
        .summary-text{flex:1;font-size:14px;font-weight:600;color:#0f172a}
        .summary-counts{display:flex;gap:8px}
        .count{padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}
        .count.error{background:#fecaca;color:#dc2626}
        .count.warning{background:#fde68a;color:#d97706}
        .count.ok{background:#bbf7d0;color:#16a34a}
        .filter-tabs{display:flex;gap:0;background:#fff;border:1px solid #e2e8f0;border-radius:9px;overflow:hidden;width:fit-content}
        .filter-tab{background:none;border:none;padding:9px 20px;font-size:13px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;color:#64748b;display:flex;align-items:center;gap:8px;border-right:1px solid #e2e8f0}
        .filter-tab:last-child{border-right:none}
        .filter-tab.active{background:#1e3a5f;color:#fff}
        .tab-count{background:rgba(0,0,0,0.1);padding:1px 7px;border-radius:10px;font-size:11px}
        .filter-tab.active .tab-count{background:rgba(255,255,255,0.2)}
        .categories{display:flex;flex-direction:column;gap:8px}
        .category{background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}
        .cat-header{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;cursor:pointer}
        .cat-header:hover{background:#f8fafc}
        .cat-left{display:flex;align-items:center;gap:10px}
        .cat-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
        .cat-dot.error{background:#dc2626}
        .cat-dot.warning{background:#d97706}
        .cat-dot.ok{background:#16a34a}
        .cat-name{font-size:14px;font-weight:600;color:#0f172a}
        .cat-count{font-size:12px;color:#94a3b8}
        .chevron{font-size:10px;color:#94a3b8}
        .cat-items{display:flex;flex-direction:column;gap:0;border-top:1px solid #e2e8f0}
        .check-item{padding:12px 18px;border-bottom:1px solid rgba(0,0,0,0.05)}
        .check-item:last-child{border-bottom:none}
        .check-header{display:flex;align-items:center;gap:10px}
        .check-icon{font-size:14px;font-weight:700;flex-shrink:0}
        .check-msg{flex:1;font-size:13px;color:#0f172a;font-weight:500}
        .fix-btn{background:#1e3a5f;color:#fff;border:none;padding:4px 12px;border-radius:5px;font-size:11px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap}
        .fix-btn:hover{background:#1e40af}
        .check-detail{font-size:12px;color:#64748b;margin-top:5px;margin-left:24px;line-height:1.5}
        .empty{text-align:center;padding:40px;color:#94a3b8;display:flex;flex-direction:column;align-items:center;gap:8px}
        .empty span{font-size:32px;color:#16a34a}
        .nav-footer{display:flex;justify-content:space-between;padding-top:8px}
        .back-btn,.continue-btn{background:#1e3a5f;color:#fff;border:none;padding:10px 24px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
        .back-btn:hover{background:#1e40af}
        .continue-btn:hover:not(.disabled){background:#16a34a}
        .continue-btn.disabled{background:#94a3b8;cursor:not-allowed}
      `}</style>
    </div>
  )
}
