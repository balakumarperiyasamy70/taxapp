"use client"

import { useState, useEffect, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"

const FILING_STATUSES = [
  { value: "SINGLE", label: "Single" },
  { value: "MARRIED_FILING_JOINTLY", label: "Married Filing Jointly" },
  { value: "MARRIED_FILING_SEPARATELY", label: "Married Filing Separately" },
  { value: "HEAD_OF_HOUSEHOLD", label: "Head of Household" },
  { value: "QUALIFYING_SURVIVING_SPOUSE", label: "Qualifying Surviving Spouse" },
]

const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"]

interface Client {
  id: string
  firstName: string
  lastName: string
  email: string | null
  ssn: string | null
  dob: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
}

function NewReturnForm() {
  const { status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedClientId = searchParams.get("clientId")

  const [step, setStep] = useState(1)
  const [clients, setClients] = useState<Client[]>([])
  const [clientSearch, setClientSearch] = useState("")
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    taxYear: 2025,
    stateCode: "AR",
    filingStatus: "",
    spouseFirstName: "",
    spouseLastName: "",
    spouseSsn: "",
  })

  const [incomeItems, setIncomeItems] = useState([
    { type: "W2", payerName: "", amount: "", federalWithheld: "", stateWithheld: "" }
  ])

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
    if (status === "authenticated") fetchClients()
  }, [status])

  useEffect(() => {
    if (preselectedClientId && clients.length > 0) {
      const c = clients.find(c => c.id === preselectedClientId)
      if (c) { setSelectedClient(c); setStep(2) }
    }
  }, [preselectedClientId, clients])

  async function fetchClients() {
    const res = await fetch("/api/clients")
    if (res.ok) {
      const json = await res.json()
      setClients(json.data.clients)
    }
  }

  function updateIncome(i: number, field: string, value: string) {
    setIncomeItems(items => items.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  function addW2() {
    setIncomeItems(items => [...items, { type: "W2", payerName: "", amount: "", federalWithheld: "", stateWithheld: "" }])
  }

  function removeIncome(i: number) {
    setIncomeItems(items => items.filter((_, idx) => idx !== i))
  }

  async function handleSubmit() {
    if (!selectedClient) return
    setSaving(true)
    setError("")

    // 1. Create the return
    const returnRes = await fetch("/api/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: selectedClient.id,
        taxYear: form.taxYear,
        returnType: "F1040",
        stateCode: form.stateCode,
      }),
    })

    if (!returnRes.ok) {
      const json = await returnRes.json()
      setError(json.error?.message ?? "Failed to create return")
      setSaving(false)
      return
    }

    const { data: taxReturn } = await returnRes.json()

    // 2. Update 1040 data
    if (form.filingStatus) {
      await fetch(`/api/returns/${taxReturn.id}/f1040`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filingStatus: form.filingStatus,
          spouseFirstName: form.spouseFirstName || undefined,
          spouseLastName: form.spouseLastName || undefined,
          spouseSsn: form.spouseSsn || undefined,
        }),
      })
    }

    // 3. Add income items
    for (const item of incomeItems) {
      if (item.amount) {
        await fetch(`/api/returns/${taxReturn.id}/income`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: item.type,
            payerName: item.payerName || undefined,
            amount: parseFloat(item.amount),
            federalWithheld: item.federalWithheld ? parseFloat(item.federalWithheld) : undefined,
            stateWithheld: item.stateWithheld ? parseFloat(item.stateWithheld) : undefined,
          }),
        })
      }
    }

    router.push(`/dashboard/returns/${taxReturn.id}`)
  }

  const filteredClients = clients.filter(c =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(clientSearch.toLowerCase())
  )

  return (
    <div className="root">
      <div className="header">
        <button className="back-btn" onClick={() => router.back()}>← Back</button>
        <div>
          <h1 className="title">New 1040 Return</h1>
          <p className="sub">Tax Year {form.taxYear}</p>
        </div>
      </div>

      {/* Steps */}
      <div className="steps">
        {["Select Client", "Return Details", "Income"].map((s, i) => (
          <div key={i} className={`step ${step === i+1 ? "active" : step > i+1 ? "done" : ""}`}>
            <div className="step-num">{step > i+1 ? "✓" : i+1}</div>
            <span>{s}</span>
          </div>
        ))}
      </div>

      <div className="card">
        {/* Step 1: Select Client */}
        {step === 1 && (
          <div className="step-body">
            <h2 className="step-title">Select Client</h2>
            <input className="search" placeholder="Search clients..." value={clientSearch} onChange={(e: any) => setClientSearch(e.target.value)} autoFocus />
            <div className="client-list">
              {filteredClients.length === 0 ? (
                <div className="empty-clients">
                  <p>No clients found.</p>
                  <button className="link-btn" onClick={() => router.push("/dashboard/clients")}>Add a client first →</button>
                </div>
              ) : filteredClients.map(c => (
                <div key={c.id} className={`client-row ${selectedClient?.id === c.id ? "selected" : ""}`} onClick={() => setSelectedClient(c)}>
                  <div className="client-avatar">{c.firstName[0]}{c.lastName[0]}</div>
                  <div>
                    <div className="client-name">{c.firstName} {c.lastName}</div>
                    <div className="client-email">{c.email ?? "No email"}</div>
                  </div>
                  {selectedClient?.id === c.id && <span className="check">✓</span>}
                </div>
              ))}
            </div>
            <div className="step-footer">
              <div/>
              <button className="primary-btn" disabled={!selectedClient} onClick={() => setStep(2)}>Continue →</button>
            </div>
          </div>
        )}

        {/* Step 2: Return Details */}
        {step === 2 && selectedClient && (
          <div className="step-body">
            <h2 className="step-title">Return Details</h2>
            <div className="client-selected">
              <div className="client-avatar sm">{selectedClient.firstName[0]}{selectedClient.lastName[0]}</div>
              <div>
                <div className="client-name">{selectedClient.firstName} {selectedClient.lastName}</div>
                <button className="link-btn" onClick={() => setStep(1)}>Change client</button>
              </div>
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Tax Year *</label>
                <select value={form.taxYear} onChange={(e: any) => setForm(f => ({...f, taxYear: Number(e.target.value)}))}>
                  {[2025, 2024, 2023].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="field">
                <label>State Return</label>
                <select value={form.stateCode} onChange={(e: any) => setForm(f => ({...f, stateCode: e.target.value}))}>
                  <option value="">None</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field full">
                <label>Filing Status *</label>
                <select value={form.filingStatus} onChange={(e: any) => setForm(f => ({...f, filingStatus: e.target.value}))}>
                  <option value="">Select filing status</option>
                  {FILING_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              {form.filingStatus === "MARRIED_FILING_JOINTLY" && <>
                <div className="field">
                  <label>Spouse First Name</label>
                  <input value={form.spouseFirstName} onChange={(e: any) => setForm(f => ({...f, spouseFirstName: e.target.value}))} />
                </div>
                <div className="field">
                  <label>Spouse Last Name</label>
                  <input value={form.spouseLastName} onChange={(e: any) => setForm(f => ({...f, spouseLastName: e.target.value}))} />
                </div>
                <div className="field full">
                  <label>Spouse SSN</label>
                  <input placeholder="XXX-XX-XXXX" value={form.spouseSsn} onChange={(e: any) => setForm(f => ({...f, spouseSsn: e.target.value}))} />
                </div>
              </>}
            </div>

            <div className="step-footer">
              <button className="secondary-btn" onClick={() => setStep(1)}>← Back</button>
              <button className="primary-btn" disabled={!form.filingStatus} onClick={() => setStep(3)}>Continue →</button>
            </div>
          </div>
        )}

        {/* Step 3: Income */}
        {step === 3 && (
          <div className="step-body">
            <h2 className="step-title">Income — W-2s & 1099s</h2>
            <p className="step-desc">Add all income sources. You can add more later from the return detail page.</p>

            {incomeItems.map((item, i) => (
              <div key={i} className="income-block">
                <div className="income-header">
                  <span className="income-label">W-2 #{i+1}</span>
                  {incomeItems.length > 1 && <button className="remove-btn" onClick={() => removeIncome(i)}>Remove</button>}
                </div>
                <div className="form-grid">
                  <div className="field full">
                    <label>Employer Name</label>
                    <input placeholder="Employer name" value={item.payerName} onChange={(e: any) => updateIncome(i, "payerName", e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Box 1 — Wages *</label>
                    <input type="number" min="0" step="0.01" placeholder="0.00" value={item.amount} onChange={(e: any) => updateIncome(i, "amount", e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Box 2 — Federal Withheld</label>
                    <input type="number" min="0" step="0.01" placeholder="0.00" value={item.federalWithheld} onChange={(e: any) => updateIncome(i, "federalWithheld", e.target.value)} />
                  </div>
                  <div className="field">
                    <label>State Tax Withheld</label>
                    <input type="number" min="0" step="0.01" placeholder="0.00" value={item.stateWithheld} onChange={(e: any) => updateIncome(i, "stateWithheld", e.target.value)} />
                  </div>
                </div>
              </div>
            ))}

            <button className="add-income-btn" onClick={addW2}>+ Add another W-2</button>

            {error && <div className="error">{error}</div>}

            <div className="step-footer">
              <button className="secondary-btn" onClick={() => setStep(2)}>← Back</button>
              <button className="primary-btn" disabled={saving} onClick={handleSubmit}>
                {saving ? "Creating..." : "Create Return →"}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .root { font-family: 'DM Sans', sans-serif; padding: 32px 36px; margin-left: 220px; min-height: 100vh; background: #f8fafc; }
        .header { display: flex; align-items: center; gap: 20px; margin-bottom: 28px; }
        .back-btn { background: none; border: 1px solid #e2e8f0; padding: 8px 14px; border-radius: 8px; font-size: 13px; cursor: pointer; color: #64748b; font-family: 'DM Sans', sans-serif; }
        .back-btn:hover { border-color: #94a3b8; color: #374151; }
        .title { font-size: 22px; font-weight: 600; color: #0f172a; }
        .sub { font-size: 13px; color: #94a3b8; margin-top: 2px; }

        .steps { display: flex; align-items: center; gap: 0; margin-bottom: 28px; }
        .step { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #94a3b8; font-weight: 400; }
        .step:not(:last-child)::after { content: '→'; margin: 0 16px; color: #e2e8f0; }
        .step.active { color: #1e40af; font-weight: 500; }
        .step.done { color: #16a34a; }
        .step-num { width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid currentColor; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; flex-shrink: 0; }
        .step.active .step-num { background: #1e40af; border-color: #1e40af; color: #fff; }
        .step.done .step-num { background: #16a34a; border-color: #16a34a; color: #fff; }

        .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 640px; }
        .step-body { padding: 28px; display: flex; flex-direction: column; gap: 20px; }
        .step-title { font-size: 18px; font-weight: 600; color: #0f172a; }
        .step-desc { font-size: 14px; color: #64748b; margin-top: -12px; }

        .search { width: 100%; padding: 9px 14px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-family: 'DM Sans', sans-serif; outline: none; }
        .search:focus { border-color: #3b82f6; }

        .client-list { display: flex; flex-direction: column; gap: 6px; max-height: 320px; overflow-y: auto; }
        .client-row { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1.5px solid #e2e8f0; border-radius: 9px; cursor: pointer; transition: all 0.15s; }
        .client-row:hover { border-color: #93c5fd; background: #eff6ff; }
        .client-row.selected { border-color: #3b82f6; background: #eff6ff; }
        .client-avatar { width: 36px; height: 36px; border-radius: 50%; background: #1e40af; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; flex-shrink: 0; }
        .client-avatar.sm { width: 30px; height: 30px; font-size: 11px; }
        .client-name { font-size: 14px; font-weight: 500; color: #0f172a; }
        .client-email { font-size: 12px; color: #94a3b8; }
        .check { margin-left: auto; color: #3b82f6; font-weight: 700; }
        .client-selected { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 9px; }

        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .field.full { grid-column: 1 / -1; }
        .field label { font-size: 13px; font-weight: 500; color: #374151; }
        .field input, .field select { padding: 9px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-family: 'DM Sans', sans-serif; outline: none; background: #fff; color: #0f172a; }
        .field input:focus, .field select:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }

        .income-block { border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 14px; }
        .income-header { display: flex; justify-content: space-between; align-items: center; }
        .income-label { font-size: 13px; font-weight: 600; color: #374151; }
        .remove-btn { background: none; border: none; color: #dc2626; font-size: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .add-income-btn { background: none; border: 1.5px dashed #cbd5e1; padding: 10px; border-radius: 8px; font-size: 13px; color: #64748b; cursor: pointer; font-family: 'DM Sans', sans-serif; text-align: center; transition: all 0.15s; }
        .add-income-btn:hover { border-color: #3b82f6; color: #3b82f6; background: #eff6ff; }

        .step-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid #f1f5f9; }
        .primary-btn { background: #1e40af; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .primary-btn:hover:not(:disabled) { background: #1d3a9e; }
        .primary-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .secondary-btn { background: #fff; border: 1px solid #e2e8f0; padding: 10px 16px; border-radius: 8px; font-size: 14px; cursor: pointer; font-family: 'DM Sans', sans-serif; color: #374151; }
        .secondary-btn:hover { border-color: #94a3b8; }
        .link-btn { background: none; border: none; color: #3b82f6; font-size: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif; padding: 0; }
        .link-btn:hover { text-decoration: underline; }
        .empty-clients { padding: 32px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; color: #94a3b8; }
        .error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 10px 14px; border-radius: 8px; font-size: 13px; }
      `}</style>
    </div>
  )
}

export default function NewReturnPage() {
  return (
    <Suspense fallback={<div style={{padding:40}}>Loading...</div>}>
      <NewReturnForm />
    </Suspense>
  )
}
