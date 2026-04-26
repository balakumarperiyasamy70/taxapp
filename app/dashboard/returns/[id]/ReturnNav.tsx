"use client"

import { usePathname, useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"

interface Props {
  returnId: string
  taxYear: number
}

export default function ReturnNav({ returnId, taxYear }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()

  const base = `/dashboard/returns/${returnId}`

  function isActive(path: string) {
    return pathname.startsWith(base + path)
  }

  return (
    <aside className="sidenav">
      {/* Form Finder */}
      <div className="form-finder">
        <div className="ff-label">Form Finder</div>
        <input
          className="ff-input"
          placeholder="Enter the form number..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const val = (e.target as HTMLInputElement).value.trim()
              if (val) router.push(`${base}/federal/income/${val.toLowerCase().replace(/\s+/g, "-")}`)
            }
          }}
        />
      </div>

      <nav className="nav">
        {/* Basic Information */}
        <NavItem
          label="Basic Information"
          icon="ℹ"
          active={isActive("/basic-info")}
          onClick={() => router.push(`${base}/basic-info`)}
        />

        {/* Federal Section */}
        <div className="nav-section">
          <div className={`nav-section-header ${isActive("/federal") ? "active" : ""}`}
            onClick={() => router.push(`${base}/federal/income`)}>
            <span className="nav-icon">🏛</span>
            <span>Federal Section</span>
          </div>
          {isActive("/federal") && (
            <div className="nav-sub">
              <SubItem label="Income" active={isActive("/federal/income")} onClick={() => router.push(`${base}/federal/income`)} />
              <SubItem label="Deductions" active={isActive("/federal/deductions")} onClick={() => router.push(`${base}/federal/deductions`)} />
              <SubItem label="Other Taxes" active={isActive("/federal/other-taxes")} onClick={() => router.push(`${base}/federal/other-taxes`)} />
              <SubItem label="Payments & Estimates" active={isActive("/federal/payments")} onClick={() => router.push(`${base}/federal/payments`)} />
              <SubItem label="Miscellaneous Forms" active={isActive("/federal/misc")} onClick={() => router.push(`${base}/federal/misc`)} />
            </div>
          )}
        </div>

        <NavItem label="Health Insurance" icon="❤" active={isActive("/health")} onClick={() => router.push(`${base}/health`)} />
        <NavItem label="State Section" icon="📍" active={isActive("/state")} onClick={() => router.push(`${base}/state`)} />
        <NavItem label="Summary/Print" icon="🖨" active={isActive("/summary")} onClick={() => router.push(`${base}/summary`)} />
        <NavItem label="E-file" icon="📤" active={isActive("/efile")} onClick={() => router.push(`${base}/efile`)} />
        <NavItem label="2025 Amended Return" icon="✎" active={isActive("/amended")} onClick={() => router.push(`${base}/amended`)} />
        <NavItem label="Your Office" icon="🏢" active={isActive("/office")} onClick={() => router.push(`/dashboard`)} />
        <NavItem label="Create Customer Portal" icon="👤" active={isActive("/portal")} onClick={() => router.push(`${base}/portal`)} />
        <NavItem label="PrepCheck" icon="✓" active={isActive("/prepcheck")} onClick={() => router.push(`${base}/prepcheck`)} />
        <NavItem label="Help & Support" icon="?" active={false} onClick={() => {}} />

        <div className="save-exit" onClick={() => router.push("/dashboard")}>
          <span>↩</span>
          <span>Save & Exit Return</span>
        </div>
      </nav>

      <style>{`
        .sidenav {
          width: 220px;
          background: #fff;
          border-right: 1px solid #e2e8f0;
          position: fixed;
          top: 0; left: 0;
          height: 100vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          z-index: 20;
        }

        .form-finder {
          padding: 12px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }
        .ff-label {
          font-size: 10px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .ff-input {
          width: 100%;
          padding: 7px 10px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 12px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          color: #374151;
        }
        .ff-input:focus { border-color: #3b82f6; }

        .nav {
          flex: 1;
          padding: 8px 0;
          display: flex;
          flex-direction: column;
        }

        .nav-section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 14px;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: background 0.1s;
        }
        .nav-section-header:hover { background: #f8fafc; }
        .nav-section-header.active { color: #1e40af; background: #eff6ff; font-weight: 600; }
        .nav-icon { font-size: 14px; width: 18px; text-align: center; }

        .nav-sub {
          padding-left: 32px;
          border-left: 2px solid #e2e8f0;
          margin-left: 22px;
        }

        .save-exit {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          font-size: 12px;
          color: #64748b;
          cursor: pointer;
          margin-top: auto;
          border-top: 1px solid #e2e8f0;
          transition: background 0.1s;
        }
        .save-exit:hover { background: #f8fafc; color: #374151; }
      `}</style>
    </aside>
  )
}

function NavItem({ label, icon, active, onClick }: { label: string; icon: string; active: boolean; onClick: () => void }) {
  return (
    <div className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
      <style>{`
        .nav-item { display: flex; align-items: center; gap: 8px; padding: 9px 14px; font-size: 13px; color: #374151; cursor: pointer; transition: background 0.1s; }
        .nav-item:hover { background: #f8fafc; }
        .nav-item.active { color: #1e40af; background: #eff6ff; font-weight: 600; border-right: 2px solid #1e40af; }
        .nav-icon { font-size: 14px; width: 18px; text-align: center; }
      `}</style>
    </div>
  )
}

function SubItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <div className={`sub-item ${active ? "active" : ""}`} onClick={onClick}>
      {label}
      <style>{`
        .sub-item { padding: 7px 10px; font-size: 12px; color: #64748b; cursor: pointer; transition: background 0.1s; border-radius: 4px; }
        .sub-item:hover { background: #f1f5f9; color: #374151; }
        .sub-item.active { color: #1e40af; font-weight: 600; background: #dbeafe; }
      `}</style>
    </div>
  )
}
