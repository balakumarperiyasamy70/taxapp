"use client"

/**
 * AddressField — Google Places Autocomplete for US addresses
 * 
 * Auto-fills street, city, state, ZIP when user types.
 * Requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env
 * 
 * Usage:
 *   <AddressField
 *     value={form.address}
 *     onChange={(parts) => {
 *       set("address", parts.street)
 *       set("city", parts.city)
 *       set("state", parts.state)
 *       set("zip", parts.zip)
 *     }}
 *   />
 */

import { useEffect, useRef, useState } from "react"

interface AddressParts {
  street: string
  city: string
  state: string
  zip: string
  country: string
}

interface Props {
  value: string
  onChange: (parts: AddressParts) => void
  label?: string
  required?: boolean
  placeholder?: string
}

declare global {
  interface Window {
    google: any
    initGoogleMaps: () => void
  }
}

let googleLoaded = false
let googleLoading = false
const callbacks: (() => void)[] = []

function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    if (googleLoaded) { resolve(); return }
    callbacks.push(resolve)
    if (googleLoading) return
    googleLoading = true
    window.initGoogleMaps = () => {
      googleLoaded = true
      callbacks.forEach(cb => cb())
      callbacks.length = 0
    }
    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`
    script.async = true
    script.defer = true
    document.head.appendChild(script)
  })
}

function parseAddressComponents(components: any[]): AddressParts {
  const get = (type: string) =>
    components.find((c: any) => c.types.includes(type))?.long_name || ""
  const getShort = (type: string) =>
    components.find((c: any) => c.types.includes(type))?.short_name || ""

  const streetNumber = get("street_number")
  const route = get("route")
  const street = [streetNumber, route].filter(Boolean).join(" ")
  const city = get("locality") || get("sublocality") || get("neighborhood")
  const state = getShort("administrative_area_level_1")
  const zip = get("postal_code")
  const country = getShort("country")

  return { street, city, state, zip, country }
}

export default function AddressField({ value, onChange, label, required, placeholder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)
  const [inputValue, setInputValue] = useState(value)
  const [loaded, setLoaded] = useState(false)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""

  useEffect(() => {
    if (!apiKey) return
    loadGoogleMaps(apiKey).then(() => setLoaded(true))
  }, [apiKey])

  useEffect(() => {
    if (!loaded || !inputRef.current || autocompleteRef.current) return

    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
      componentRestrictions: { country: "us" },
      fields: ["address_components", "formatted_address"],
    })

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current.getPlace()
      if (!place.address_components) return

      const parts = parseAddressComponents(place.address_components)
      setInputValue(parts.street || place.formatted_address)
      onChange(parts)
    })
  }, [loaded])

  useEffect(() => {
    setInputValue(value)
  }, [value])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>
          {label}{required && " *"}
        </label>
      )}
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder={placeholder ?? "Start typing address..."}
          autoComplete="off"
          style={{
            width: "100%",
            padding: "9px 12px 9px 36px",
            border: "1.5px solid #e2e8f0",
            borderRadius: 7,
            fontSize: 14,
            fontFamily: "DM Sans, sans-serif",
            outline: "none",
            color: "#0f172a",
          }}
          onFocus={e => (e.target.style.borderColor = "#3b82f6")}
          onBlur={e => (e.target.style.borderColor = "#e2e8f0")}
        />
        <span style={{
          position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
          fontSize: 16, pointerEvents: "none",
        }}>
          📍
        </span>
        {!apiKey && (
          <span style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            fontSize: 11, color: "#f59e0b",
          }}>
            No API key
          </span>
        )}
      </div>
      {!apiKey && (
        <span style={{ fontSize: 11, color: "#94a3b8" }}>
          Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env to enable autocomplete
        </span>
      )}
    </div>
  )
}
