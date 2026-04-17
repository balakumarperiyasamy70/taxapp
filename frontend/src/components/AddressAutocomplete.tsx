import { useState, useRef, useEffect } from 'react'
import api from '../services/api'
import styles from './AddressAutocomplete.module.css'

interface AddressResult {
  address: string
  city: string
  state: string
  zip: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  onSelect: (result: AddressResult) => void
  placeholder?: string
  required?: boolean
}

export default function AddressAutocomplete({ value, onChange, onSelect, placeholder, required }: Props) {
  const [suggestions, setSuggestions] = useState<{ description: string; place_id: string }[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    onChange(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.length < 3) { setSuggestions([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await api.get('/places/autocomplete', { params: { input: val } })
        setSuggestions(res.data)
        setOpen(res.data.length > 0)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  const handleSelect = async (placeId: string, description: string) => {
    onChange(description)
    setOpen(false)
    setSuggestions([])
    try {
      const res = await api.get('/places/details', { params: { place_id: placeId } })
      onSelect(res.data)
    } catch {}
  }

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <input
        type="text"
        value={value}
        onChange={handleInput}
        placeholder={placeholder || 'Start typing your address...'}
        required={required}
        autoComplete="off"
        className={styles.input}
      />
      {loading && <span className={styles.spinner}>⟳</span>}
      {open && suggestions.length > 0 && (
        <ul className={styles.dropdown}>
          {suggestions.map(s => (
            <li key={s.place_id} onMouseDown={() => handleSelect(s.place_id, s.description)}>
              {s.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
