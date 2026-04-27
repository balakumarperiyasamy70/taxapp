"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

interface Client {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  businessName: string | null
  createdAt: string
}

export default function ClientsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    address: "", city: "", state: "", zip: "", ssn: "",
  })

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
    if (status === "authenticated") fetchClients()
  }, [status])

  async function fetchClients() {
    setLoading(true)
    const res = await fetch("/api/clients")
    if (res.ok) {
      const json = await res.json()
      setClients(json.data.clients)
    }
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (res.ok) {
      setShowForm(false)
      setForm({ firstName: "", lastName: "", email: "", phone: "", address: "", city: "", state: "", zip: "", ssn: "" })
      fetchClients()
    } else {
      setError(json.error?.message ?? "Failed to create client")
    }
    setSaving(false)
  }

  const filtered = clients.filter(c =>
    `${c.firstName} ${c.lastName} ${c.email ?? ""}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="root">
      <div className="header">
        <div>
          <h1 className="title">Clients</h1>
          <p className="sub">{clients.length} total</p>
        </div>
        <button className="primary-btn" onClick={() => setShowForm(true)}>+ New Client</button>
      </div>

      <input className="search" placeholder="Search by name or email..." value={search} onChange={(e: any) => setSearch(e.target.value)} />

      {loading ? (
        <div className="loading"><div className="spinner"/></div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <p>{search ? "No clients match your search" : "No clients yet"}</p>
          {!search && <button className="primary-btn" onClick={() => setShowForm(true)}>Add your first client</button>}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Added</th><th></th></tr></thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="row" onClick={() => router.push(`/dashboard/returns/new?clientId=${c.id}`)}>
                  <td className="name">{c.firstName} {c.lastName}</td>
                  <td className="muted">{c.email ?? "—"}</td>
                  <td className="muted">{c.phone ?? "—"}</td>
                  <td className="muted">{new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                  <td><button className="open-btn" onClick={e => { e.stopPropagation(); router.push(`/dashboard/returns/new?clientId=${c.id}`) }}>New Return →</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Client Modal */}
      {showForm && (
        <div className="overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Client</h2>
              <button className="close-btn" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-row">
                <div className="field">
                  <label>First Name *</label>
                  <input required value={form.firstName} onChange={(e: any) => setForm(f => ({...f, firstName: e.target.value}))} />
                </div>
                <div className="field">
                  <label>Last Name *</label>
                  <input required value={form.lastName} onChange={(e: any) => setForm(f => ({...f, lastName: e.target.value}))} />
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={(e: any) => setForm(f => ({...f, email: e.target.value}))} />
                </div>
                <div className="field">
                  <label>Phone</label>
                  <input value={form.phone} onChange={(e: any) => setForm(f => ({...f, phone: e.target.value}))} />
                </div>
              </div>
              <div className="field">
                <label>SSN (stored encrypted)</label>
                <input placeholder="XXX-XX-XXXX" value={form.ssn} onChange={(e: any) => setForm(f => ({...f, ssn: e.target.value}))} />
              </div>
              <div className="field">
                <label>Address</label>
                <input value={form.address} onChange={(e: any) => setForm(f => ({...f, address: e.target.value}))} />
              </div>
              <div className="form-row">
                <div className="field">
                  <label>City</label>
                  <input value={form.city} onChange={(e: any) => setForm(f => ({...f, city: e.target.value}))} />
                </div>
                <div className="field" style={{maxWidth: 80}}>
                  <label>State</label>
                  <input maxLength={2} value={form.state} onChange={(e: any) => setForm(f => ({...f, state: e.target.value.toUpperCase()}))} />
                </div>
                <div className="field" style={{maxWidth: 120}}>
                  <label>ZIP</label>
                  <input value={form.zip} onChange={(e: any) => setForm(f => ({...f, zip: e.target.value}))} />
                </div>
              </div>
              {error && <div className="error">{error}</div>}
              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={saving}>{saving ? "Saving..." : "Create Client"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .root { font-family: 'DM Sans', sans-serif; padding: 32px 36px; margin-left: 220px; min-height: 100vh; background: #f8fafc; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .title { font-size: 24px; font-weight: 600; color: #0f172a; }
        .sub { font-size: 13px; color: #94a3b8; margin-top: 2px; }
        .primary-btn { background: #1e40af; color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .primary-btn:hover { background: #1d3a9e; }
        .primary-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .search { width: 100%; max-width: 400px; padding: 9px 14px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-family: 'DM Sans', sans-serif; outline: none; margin-bottom: 16px; background: #fff; }
        .search:focus { border-color: #3b82f6; }
        .table-wrap { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
        .table { width: 100%; border-collapse: collapse; }
        .table th { padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; background: #fafafa; border-bottom: 1px solid #f1f5f9; }
        .row { cursor: pointer; transition: background 0.1s; }
        .row:hover { background: #f8fafc; }
        .table td { padding: 14px 16px; font-size: 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .table tr:last-child td { border-bottom: none; }
        .name { font-weight: 500; color: #0f172a; }
        .muted { color: #64748b; }
        .open-btn { background: none; border: 1px solid #e2e8f0; padding: 5px 12px; border-radius: 6px; font-size: 12px; color: #64748b; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .open-btn:hover { border-color: #3b82f6; color: #3b82f6; background: #eff6ff; }
        .loading { padding: 64px; display: flex; justify-content: center; }
        .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .empty { padding: 64px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; }
        .empty p { color: #94a3b8; font-size: 15px; }
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 24px; }
        .modal { background: #fff; border-radius: 14px; width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 24px 24px 0; }
        .modal-header h2 { font-size: 20px; font-weight: 600; color: #0f172a; }
        .close-btn { background: none; border: none; font-size: 18px; color: #94a3b8; cursor: pointer; }
        .modal form { padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 16px; }
        .form-row { display: flex; gap: 12px; }
        .field { flex: 1; display: flex; flex-direction: column; gap: 6px; }
        .field label { font-size: 13px; font-weight: 500; color: #374151; }
        .field input { padding: 9px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-family: 'DM Sans', sans-serif; outline: none; }
        .field input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 10px 14px; border-radius: 8px; font-size: 13px; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding-top: 8px; }
        .cancel-btn { background: #fff; border: 1px solid #e2e8f0; padding: 9px 16px; border-radius: 8px; font-size: 14px; cursor: pointer; font-family: 'DM Sans', sans-serif; color: #374151; }
      `}</style>
    </div>
  )
}
