"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../ReturnNav"

interface SummaryData {
  client: { firstName: string; lastName: string }
  f1040: {
    filingStatus: string | null
    totalIncome: number | null
    adjustedGrossIncome: number | null
    standardDeduction: number | null
    itemizedDeduction: number | null
    taxableIncome: number | null
    totalTax: number | null
    totalPayments: number | null
    refundOrOwed: number | null
  } | null
  stateReturns: Array<{ stateCode: string; refundAmount: number | null; amountOwed: number | null; data: any }>
}

const FILING_STATUS_LABELS: Record<string, string> = {
  SINGLE: "Single",
  MARRIED_FILING_JOINTLY: "Married Filing Jointly",
  MARRIED_FILING_SEPARATELY: "Married Filing Separately",
  HEAD_OF_HOUSEHOLD: "Head of Household",
  QUALIFYING_SURVIVING_SPOUSE: "Qualifying Surviving Spouse",
}

export default function SummaryPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const base = `/dashboard/returns/${id}`
  const [view, setView] = useState<"summary" | "1040">("summary")
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    p1: true, p2: true,
  })

  useEffect(() => {
    fetch(`/api/returns/${id}`)
      .then(r => r.json())
      .then(json => { setData(json.data); setLoading(false) })
  }, [id])

  function toggle(key: string) { setOpenSections(s => ({ ...s, [key]: !s[key] })) }

  function fmt(n: number | null | undefined) {
    if (!n) return "$0.00"
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" })
  }

  async function downloadPDF(formType: string, label: string) {
    setDownloading(formType)
    try {
      const res = await fetch(`/api/returns/${id}/pdf?form=${formType}`)
      if (!res.ok) throw new Error("PDF generation failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${label}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert("PDF generation failed. Please try again.")
    }
    setDownloading(null)
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>
  if (!data) return <div>Return not found</div>

  const f = data.f1040
  const agi = f?.adjustedGrossIncome ?? 0
  const totalTax = f?.totalTax ?? 0
  const totalPayments = f?.totalPayments ?? 0
  const refundOrOwed = f?.refundOrOwed ?? 0
  const arState = data.stateReturns?.find(s => s.stateCode === "AR")
  const arRefund = arState?.refundAmount ?? 0
  const arOwed = arState?.amountOwed ?? 0

  const SECTIONS = [
    {
      key: "p1", label: "1040 Page 1 — Income",
      lines: [
        { no: "1z", desc: "Wages, salaries, tips", val: null },
        { no: "2b", desc: "Taxable interest", val: null },
        { no: "3b", desc: "Ordinary dividends", val: null },
        { no: "4b", desc: "IRA distributions (taxable)", val: null },
        { no: "5b", desc: "Pensions and annuities (taxable)", val: null },
        { no: "6b", desc: "Social security (taxable)", val: null },
        { no: "7", desc: "Capital gain or loss", val: null },
        { no: "8", desc: "Other income (Schedule 1)", val: null },
        { no: "9", desc: "Total Income", val: f?.totalIncome },
        { no: "10", desc: "Adjustments to income", val: null },
        { no: "11", desc: "Adjusted Gross Income", val: agi },
      ]
    },
    {
      key: "p2", label: "1040 Page 2 — Tax & Payments",
      lines: [
        { no: "12", desc: "Standard or itemized deduction", val: f?.standardDeduction },
        { no: "15", desc: "Taxable income", val: f?.taxableIncome },
        { no: "16", desc: "Tax", val: totalTax },
        { no: "24", desc: "Total Tax", val: totalTax },
        { no: "25", desc: "Federal tax withheld", val: null },
        { no: "33", desc: "Total Payments", val: totalPayments },
        { no: "35a", desc: "Amount Refunded to You", val: refundOrOwed >= 0 ? refundOrOwed : null },
        { no: "37", desc: "Amount You Owe", val: refundOrOwed < 0 ? Math.abs(refundOrOwed) : null },
      ]
    },
    {
      key: "ar", label: "Arkansas AR1000F",
      lines: [
        { no: "5", desc: "Arkansas AGI", val: arState?.data?.arAGI },
        { no: "7", desc: "AR Net Income", val: arState?.data?.arTaxableIncome },
        { no: "10", desc: "Arkansas Income Tax", val: arState?.data?.arGrossTax },
        { no: "12", desc: "Arkansas Net Tax", val: arState?.data?.arNetTax },
        { no: "15", desc: "Total AR Payments", val: arState?.data?.arPayments },
        { no: "16", desc: "AR Refund", val: arRefund || null },
        { no: "17", desc: "AR Balance Due", val: arOwed || null },
      ]
    },
  ]

  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={2025} />
      <main className="main">
        {/* Top summary bar */}
        <div className="top-bar">
          <div className="client-name">{data.client.firstName} {data.client.lastName}</div>
          <div className="summary-pills">
            <div className={`pill ${refundOrOwed >= 0 ? "refund" : "owed"}`}>
              Federal: {refundOrOwed >= 0 ? `${fmt(refundOrOwed)} refund` : `${fmt(Math.abs(refundOrOwed))} owed`}
            </div>
            {(arRefund > 0 || arOwed > 0) && (
              <div className={`pill ${arRefund > 0 ? "refund" : "owed"}`}>
                AR: {arRefund > 0 ? `${fmt(arRefund)} refund` : `${fmt(arOwed)} owed`}
              </div>
            )}
          </div>
        </div>

        {/* Print / Download buttons */}
        <div className="download-section">
          <h2 className="section-title">Print / Download Forms</h2>
          <div className="download-grid">
            <DownloadCard
              title="Form 1040"
              desc="U.S. Individual Income Tax Return (2 pages)"
              icon="📄"
              onClick={() => downloadPDF("1040", `Form_1040_${data.client.lastName}_2025`)}
              loading={downloading === "1040"}
            />
            <DownloadCard
              title="AR1000F"
              desc="Arkansas Individual Income Tax Return"
              icon="📄"
              onClick={() => downloadPDF("ar1000f", `AR1000F_${data.client.lastName}_2025`)}
              loading={downloading === "ar1000f"}
            />
            <DownloadCard
              title="Complete Return"
              desc="All forms combined into one PDF"
              icon="📦"
              onClick={() => downloadPDF("complete", `Complete_Return_${data.client.lastName}_2025`)}
              loading={downloading === "complete"}
            />
            <DownloadCard
              title="Schedule 1"
              desc="Additional Income & Adjustments"
              icon="📄"
              onClick={() => downloadPDF("schedule1", `Schedule_1_${data.client.lastName}_2025`)}
              loading={downloading === "schedule1"}
            />
            <DownloadCard
              title="Schedule A"
              desc="Itemized Deductions"
              icon="📄"
              onClick={() => downloadPDF("schedule-a", `Schedule_A_${data.client.lastName}_2025`)}
              loading={downloading === "schedule-a"}
            />
            <DownloadCard
              title="Schedule B"
              desc="Interest & Ordinary Dividends"
              icon="📄"
              onClick={() => downloadPDF("schedule-b", `Schedule_B_${data.client.lastName}_2025`)}
              loading={downloading === "schedule-b"}
            />
            <DownloadCard
              title="Schedule C"
              desc="Profit or Loss From Business"
              icon="📄"
              onClick={() => downloadPDF("schedule-c", `Schedule_C_${data.client.lastName}_2025`)}
              loading={downloading === "schedule-c"}
            />
            <DownloadCard
              title="Schedule D"
              desc="Capital Gains and Losses"
              icon="📄"
              onClick={() => downloadPDF("schedule-d", `Schedule_D_${data.client.lastName}_2025`)}
              loading={downloading === "schedule-d"}
            />
            <DownloadCard
              title="Schedule SE"
              desc="Self-Employment Tax"
              icon="📄"
              onClick={() => downloadPDF("schedule-se", `Schedule_SE_${data.client.lastName}_2025`)}
              loading={downloading === "schedule-se"}
            />
            <DownloadCard
              title="Schedule 8812"
              desc="Credits for Qualifying Children"
              icon="📄"
              onClick={() => downloadPDF("schedule-8812", `Schedule_8812_${data.client.lastName}_2025`)}
              loading={downloading === "schedule-8812"}
            />
            <DownloadCard
              title="Form 8962"
              desc="Premium Tax Credit"
              icon="📄"
              onClick={() => downloadPDF("form-8962", `Form_8962_${data.client.lastName}_2025`)}
              loading={downloading === "form-8962"}
            />
          </div>
        </div>

        {/* View toggle */}
        <div className="view-toggle">
          <button className={`toggle-btn ${view === "summary" ? "active" : ""}`} onClick={() => setView("summary")}>Summary View</button>
          <button className={`toggle-btn ${view === "1040" ? "active" : ""}`} onClick={() => setView("1040")}>1040 View</button>
        </div>

        {view === "summary" && (
          <div className="sections">
            {SECTIONS.map(section => (
              <div key={section.key} className="section">
                <div className="section-header" onClick={() => toggle(section.key)}>
                  <span className="section-label">{section.label}</span>
                  <span className="chevron">{openSections[section.key] ? "▲" : "▼"}</span>
                </div>
                {openSections[section.key] && (
                  <div className="section-lines">
                    {section.lines.map(line => (
                      <div key={line.no} className={`line-row ${line.no === "35a" || line.no === "16" ? "refund-line" : line.no === "37" || line.no === "17" ? "owed-line" : ""}`}>
                        <span className="line-no">{line.no}</span>
                        <span className="line-desc">{line.desc}</span>
                        <span className="line-val">{line.val != null ? fmt(line.val) : "—"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {view === "1040" && (
          <div className="form-preview">
            <div className="form-1040">
              <div className="form-top">
                <div>
                  <span className="form-title">Form 1040</span>
                  <span className="form-sub">U.S. Individual Income Tax Return</span>
                </div>
                <div className="form-year">2025</div>
              </div>
              <div className="form-info-row">
                <span>{data.client.firstName} {data.client.lastName}</span>
                <span>{FILING_STATUS_LABELS[f?.filingStatus || ""] || ""}</span>
              </div>
              <div className="form-lines">
                <FormLine no="11" desc="Adjusted Gross Income" val={fmt(agi)} total />
                <FormLine no="12" desc="Standard or itemized deductions" val={fmt(f?.standardDeduction ?? 0)} />
                <FormLine no="15" desc="Taxable Income" val={fmt(f?.taxableIncome ?? 0)} total />
                <FormLine no="24" desc="Total Tax" val={fmt(totalTax)} total />
                <FormLine no="33" desc="Total Payments" val={fmt(totalPayments)} />
                <FormLine no="35a" desc="Amount Refunded to You" val={refundOrOwed >= 0 ? fmt(refundOrOwed) : "—"} refund />
                <FormLine no="37" desc="Amount You Owe" val={refundOrOwed < 0 ? fmt(Math.abs(refundOrOwed)) : "—"} owed />
              </div>
            </div>
          </div>
        )}

        <div className="nav-footer">
          <button className="back-btn" onClick={() => router.push(`${base}/state`)}>BACK</button>
          <button className="continue-btn" onClick={() => router.push(`${base}/efile`)}>CONTINUE TO E-FILE</button>
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .root{display:flex;min-height:100vh;font-family:'DM Sans',sans-serif;background:#f8fafc}
        .main{flex:1;margin-left:220px;padding:24px 36px;display:flex;flex-direction:column;gap:20px}
        .top-bar{display:flex;justify-content:space-between;align-items:center;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px 24px}
        .client-name{font-size:20px;font-weight:700;color:#0f172a}
        .summary-pills{display:flex;gap:12px}
        .pill{padding:8px 18px;border-radius:20px;font-size:14px;font-weight:600}
        .pill.refund{background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0}
        .pill.owed{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}
        .section-title{font-size:14px;font-weight:600;color:#374151;margin-bottom:12px}
        .download-section{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px}
        .download-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
        .view-toggle{display:flex;background:#e2e8f0;border-radius:8px;padding:3px;width:fit-content}
        .toggle-btn{padding:8px 24px;border:none;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;background:none;color:#64748b;transition:all 0.15s}
        .toggle-btn.active{background:#1e3a5f;color:#fff}
        .sections{display:flex;flex-direction:column;gap:0;background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}
        .section{border-bottom:1px solid #e2e8f0}
        .section:last-child{border-bottom:none}
        .section-header{display:flex;justify-content:space-between;align-items:center;padding:14px 24px;cursor:pointer;transition:background 0.1s}
        .section-header:hover{background:#f8fafc}
        .section-label{font-size:14px;font-weight:600;color:#0f172a}
        .chevron{font-size:10px;color:#94a3b8}
        .section-lines{padding:0 24px 14px;display:flex;flex-direction:column;gap:6px}
        .line-row{display:flex;align-items:center;gap:12px;padding:5px 0;border-bottom:1px solid #f8fafc}
        .line-no{font-size:11px;font-weight:700;color:#94a3b8;width:36px;flex-shrink:0}
        .line-desc{font-size:13px;color:#374151;flex:1}
        .line-val{font-size:13px;font-weight:600;color:#0f172a;min-width:100px;text-align:right}
        .refund-line .line-val{color:#16a34a}
        .owed-line .line-val{color:#dc2626}
        .form-preview{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:24px}
        .form-1040{border:2px solid #0f172a;border-radius:4px;padding:24px;max-width:700px;margin:0 auto}
        .form-top{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:16px}
        .form-title{font-size:28px;font-weight:900;color:#0f172a;margin-right:12px}
        .form-sub{font-size:12px;color:#64748b}
        .form-year{font-size:36px;font-weight:900;color:#0f172a}
        .form-info-row{display:flex;justify-content:space-between;font-size:14px;color:#374151;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #e2e8f0}
        .form-lines{display:flex;flex-direction:column;gap:4px}
        .nav-footer{display:flex;justify-content:space-between}
        .back-btn,.continue-btn{background:#1e3a5f;color:#fff;border:none;padding:10px 24px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
        .back-btn:hover,.continue-btn:hover{background:#1e40af}
        .loading{display:flex;align-items:center;justify-content:center;min-height:100vh}
        .spinner{width:32px;height:32px;border:3px solid #e2e8f0;border-top-color:#3b82f6;border-radius:50%;animation:spin 0.7s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  )
}

function DownloadCard({ title, desc, icon, onClick, loading }: any) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        background: loading ? "#f8fafc" : "#fff",
        border: "1.5px solid #e2e8f0",
        borderRadius: 10,
        padding: "16px",
        cursor: loading ? "wait" : "pointer",
        textAlign: "left",
        transition: "all 0.15s",
        fontFamily: "DM Sans, sans-serif",
      }}
      onMouseEnter={e => !loading && ((e.target as HTMLElement).closest("button")!.style.borderColor = "#3b82f6")}
      onMouseLeave={e => ((e.target as HTMLElement).closest("button")!.style.borderColor = "#e2e8f0")}
    >
      <div style={{fontSize:24,marginBottom:8}}>{loading ? "⏳" : icon}</div>
      <div style={{fontSize:14,fontWeight:700,color:"#0f172a"}}>{title}</div>
      <div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>{loading ? "Generating..." : desc}</div>
    </button>
  )
}

function FormLine({ no, desc, val, total, refund, owed }: any) {
  const color = refund ? "#16a34a" : owed ? "#dc2626" : "#0f172a"
  return (
    <div style={{display:"flex",alignItems:"baseline",gap:12,padding:"6px 0",borderBottom:total?"2px solid #0f172a":"1px dotted #e2e8f0"}}>
      <span style={{fontSize:11,fontWeight:700,color:"#94a3b8",width:32}}>{no}</span>
      <span style={{flex:1,fontSize:total?14:13,fontWeight:total?700:400,color:"#374151"}}>{desc}</span>
      <span style={{fontSize:total?15:13,fontWeight:total?700:500,color,minWidth:120,textAlign:"right"}}>{val}</span>
    </div>
  )
}
