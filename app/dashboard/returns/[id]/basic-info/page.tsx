"use client"

import { useRouter, useParams } from "next/navigation"
import ReturnNav from "../ReturnNav"

export default function BasicInfoPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const base = `/dashboard/returns/${id}`

  const sections = [
    { label: "Filing Status", href: `${base}/basic-info/filing-status`, btn: "ADD/EDIT" },
    { label: "Personal Information", href: `${base}/basic-info/personal-info`, btn: "ADD/EDIT" },
    { label: "Dependents / Qualifying Person", href: `${base}/basic-info/dependents`, btn: "ADD/EDIT" },
    { label: "IRS Identity Protection PIN", href: `${base}/basic-info/ip-pin`, btn: "BEGIN" },
  ]

  return (
    <div className="root">
      <ReturnNav returnId={id} taxYear={2025} />
      <main className="main">
        <div className="page-header">
          <h1>Basic Information</h1>
        </div>

        <div className="sections">
          {sections.map((s) => (
            <div key={s.label} className="section-row">
              <span className="section-label">{s.label}</span>
              <button className={`section-btn ${s.btn === "BEGIN" ? "begin" : ""}`} onClick={() => router.push(s.href)}>
                {s.btn}
              </button>
            </div>
          ))}
        </div>

        <div className="nav-footer">
          <button className="back-btn" onClick={() => router.push(base)}>BACK</button>
          <button className="continue-btn" onClick={() => router.push(`${base}/federal/income`)}>CONTINUE</button>
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .root { display: flex; min-height: 100vh; font-family: 'DM Sans', sans-serif; background: #f8fafc; }
        .main { flex: 1; margin-left: 220px; padding: 32px 40px; }
        .page-header { margin-bottom: 28px; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; }
        .page-header h1 { font-size: 22px; font-weight: 600; color: #0f172a; }
        .sections { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 32px; }
        .section-row { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid #f1f5f9; }
        .section-row:last-child { border-bottom: none; }
        .section-label { font-size: 15px; color: #0f172a; font-weight: 400; }
        .section-btn { background: #1e3a5f; color: #fff; border: none; padding: 8px 20px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; letter-spacing: 0.3px; }
        .section-btn:hover { background: #1e40af; }
        .section-btn.begin { background: #0f766e; }
        .section-btn.begin:hover { background: #0d9488; }
        .nav-footer { display: flex; justify-content: space-between; }
        .back-btn { background: #1e3a5f; color: #fff; border: none; padding: 10px 24px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .continue-btn { background: #1e3a5f; color: #fff; border: none; padding: 10px 24px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .back-btn:hover, .continue-btn:hover { background: #1e40af; }
      `}</style>
    </div>
  )
}
