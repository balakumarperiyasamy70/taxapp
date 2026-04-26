"use client"
import { useState } from "react"

interface Props {
  value: string
  onChange: (raw: string) => void
  label?: string
  required?: boolean
  placeholder?: string
}

function formatSSN(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 9)
  if (digits.length <= 3) return digits
  if (digits.length <= 5) return `${digits.slice(0,3)}-${digits.slice(3)}`
  return `${digits.slice(0,3)}-${digits.slice(3,5)}-${digits.slice(5)}`
}

function maskSSN(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 9)
  if (digits.length === 0) return ""
  const masked = "•".repeat(digits.length)
  if (digits.length <= 3) return masked
  if (digits.length <= 5) return `${masked.slice(0,3)}-${masked.slice(3)}`
  return `${masked.slice(0,3)}-${masked.slice(3,5)}-${masked.slice(5)}`
}

export default function SSNInput({ value, onChange, label, required, placeholder }: Props) {
  const [show, setShow] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 9)
    onChange(raw)
  }

  const displayed = show ? formatSSN(value) : maskSSN(value)

  return (
    <div className="ssn-field">
      {label && <label className="ssn-label">{label}{required && " *"}</label>}
      <div className="ssn-wrap">
        <input
          className="ssn-input"
          value={displayed}
          onChange={handleChange}
          placeholder={placeholder ?? "XXX-XX-XXXX"}
          inputMode="numeric"
          maxLength={11}
          autoComplete="off"
        />
        <button type="button" className="ssn-toggle" onClick={() => setShow(s => !s)}>
          {show ? "🙈" : "👁"}
        </button>
        {value.length === 9 && <span className="ssn-check">✓</span>}
      </div>
      {value.length > 0 && value.length < 9 && (
        <span className="ssn-hint">{9 - value.length} more digit{9 - value.length !== 1 ? "s" : ""} needed</span>
      )}
      <style>{`
        .ssn-field{display:flex;flex-direction:column;gap:5px}
        .ssn-label{font-size:13px;font-weight:500;color:#374151}
        .ssn-wrap{display:flex;align-items:center;border:1.5px solid #e2e8f0;border-radius:7px;overflow:hidden;background:#fff;transition:border-color 0.15s}
        .ssn-wrap:focus-within{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,0.1)}
        .ssn-input{flex:1;border:none;padding:9px 12px;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;letter-spacing:2px;background:transparent}
        .ssn-toggle{background:none;border:none;padding:0 10px;cursor:pointer;font-size:16px;flex-shrink:0}
        .ssn-check{color:#16a34a;font-weight:700;padding-right:10px;font-size:14px}
        .ssn-hint{font-size:11px;color:#f59e0b}
      `}</style>
    </div>
  )
}
