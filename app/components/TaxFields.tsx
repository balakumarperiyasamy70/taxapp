"use client"

/**
 * TaxFields — Reusable masked input components for tax IDs
 * 
 * SSNField  — Social Security Number (XXX-XX-XXXX, 9 digits)
 * EINField  — Employer ID Number (XX-XXXXXXX, 9 digits)
 * ITINField — Individual Taxpayer ID (9XX-XX-XXXX, 9 digits)
 * 
 * All use type="password" for masking, type="text" for show mode.
 * Raw digits stored in state, formatted only for display.
 */

import { useState } from "react"

const FIELD_STYLE = {
  wrapper: { display:"flex" as const, flexDirection:"column" as const, gap:6 },
  label: { fontSize:13, fontWeight:500, color:"#374151" },
  inputWrap: { display:"flex" as const, alignItems:"center" as const, border:"1.5px solid #e2e8f0", borderRadius:7, overflow:"hidden" as const, background:"#fff" },
  input: { flex:1, border:"none", padding:"9px 12px", fontSize:14, fontFamily:"DM Sans,sans-serif", outline:"none", letterSpacing:3, background:"transparent", minWidth:0 },
  eyeBtn: { background:"none", border:"none", padding:"0 12px", cursor:"pointer", fontSize:18, color:"#94a3b8", display:"flex" as const, alignItems:"center" as const, flexShrink:0 },
  check: { color:"#16a34a", fontWeight:700, paddingRight:10, fontSize:14 },
  hint: { fontSize:11, color:"#f59e0b" },
}

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  placeholder?: string
}

export function SSNField({ label, value, onChange, required, placeholder }: FieldProps) {
  const [show, setShow] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 9)
    onChange(digits)
  }

  function formatSSN(d: string) {
    if (d.length <= 3) return d
    if (d.length <= 5) return d.slice(0,3) + '-' + d.slice(3)
    return d.slice(0,3) + '-' + d.slice(3,5) + '-' + d.slice(5)
  }

  return (
    <div style={FIELD_STYLE.wrapper}>
      <label style={FIELD_STYLE.label}>{label}{required && " *"}</label>
      <div style={FIELD_STYLE.inputWrap}>
        <input
          style={FIELD_STYLE.input}
          type={show ? "text" : "password"}
          value={show ? formatSSN(value) : value}
          onChange={handleChange}
          placeholder={placeholder ?? "XXX-XX-XXXX"}
          inputMode="numeric"
          autoComplete="off"
        />
        <button type="button" style={FIELD_STYLE.eyeBtn} onClick={() => setShow(s => !s)}>
          {show ? "🙈" : "👁"}
        </button>
        {value.length === 9 && <span style={FIELD_STYLE.check}>✓</span>}
      </div>
      {value.length > 0 && value.length < 9 && (
        <span style={FIELD_STYLE.hint}>{9 - value.length} more digit{9 - value.length !== 1 ? "s" : ""} needed</span>
      )}
    </div>
  )
}

export function EINField({ label, value, onChange, required, placeholder }: FieldProps) {
  const [show, setShow] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 9)
    onChange(digits)
  }

  function formatEIN(d: string) {
    if (d.length <= 2) return d
    return d.slice(0,2) + '-' + d.slice(2)
  }

  return (
    <div style={FIELD_STYLE.wrapper}>
      <label style={FIELD_STYLE.label}>{label}{required && " *"}</label>
      <div style={FIELD_STYLE.inputWrap}>
        <input
          style={FIELD_STYLE.input}
          type={show ? "text" : "password"}
          value={show ? formatEIN(value) : value}
          onChange={handleChange}
          placeholder={placeholder ?? "XX-XXXXXXX"}
          inputMode="numeric"
          autoComplete="off"
        />
        <button type="button" style={FIELD_STYLE.eyeBtn} onClick={() => setShow(s => !s)}>
          {show ? "🙈" : "👁"}
        </button>
        {value.length === 9 && <span style={FIELD_STYLE.check}>✓</span>}
      </div>
      {value.length > 0 && value.length < 9 && (
        <span style={FIELD_STYLE.hint}>{9 - value.length} more digit{9 - value.length !== 1 ? "s" : ""} needed</span>
      )}
    </div>
  )
}

export function ITINField({ label, value, onChange, required }: FieldProps) {
  // ITIN format: 9XX-XX-XXXX (always starts with 9)
  const [show, setShow] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let digits = e.target.value.replace(/\D/g, '').slice(0, 9)
    if (digits.length > 0 && digits[0] !== '9') digits = '9' + digits.slice(0, 8)
    onChange(digits)
  }

  function formatITIN(d: string) {
    if (d.length <= 3) return d
    if (d.length <= 5) return d.slice(0,3) + '-' + d.slice(3)
    return d.slice(0,3) + '-' + d.slice(3,5) + '-' + d.slice(5)
  }

  return (
    <div style={FIELD_STYLE.wrapper}>
      <label style={FIELD_STYLE.label}>{label}{required && " *"}</label>
      <div style={FIELD_STYLE.inputWrap}>
        <input
          style={FIELD_STYLE.input}
          type={show ? "text" : "password"}
          value={show ? formatITIN(value) : value}
          onChange={handleChange}
          placeholder="9XX-XX-XXXX"
          inputMode="numeric"
          autoComplete="off"
        />
        <button type="button" style={FIELD_STYLE.eyeBtn} onClick={() => setShow(s => !s)}>
          {show ? "🙈" : "👁"}
        </button>
        {value.length === 9 && <span style={FIELD_STYLE.check}>✓</span>}
      </div>
      {value.length > 0 && value.length < 9 && (
        <span style={FIELD_STYLE.hint}>{9 - value.length} more digit{9 - value.length !== 1 ? "s" : ""} needed</span>
      )}
    </div>
  )
}
