import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Search, Shuffle, X } from 'lucide-react'
import { api } from '../lib/api'
import { useDebounce } from '../hooks/useDebounce'

/** Type-ahead search over the catalogue, backed by /api/catalogue/search. */
export default function ProductPicker({ selected, onSelect }) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef(null)
  const debounced = useDebounce(term, 220)

  useEffect(() => {
    const handler = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (debounced.trim().length < 2) {
      setResults([])
      return
    }
    const controller = new AbortController()
    setLoading(true)
    api
      .search(debounced.trim(), controller.signal)
      .then((rows) => {
        setResults(rows ?? [])
        setOpen(true)
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setResults([])
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [debounced])

  const pickRandom = async () => {
    const rows = await api.sample(1)
    if (rows?.length) {
      onSelect(rows[0])
      setTerm('')
      setOpen(false)
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-2.5 text-ink-400" />
          <input
            className="field pl-9 pr-8"
            placeholder="Search the catalogue, e.g. bluetooth earphone"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
          />
          {loading && <Loader2 size={14} className="absolute right-3 top-3 animate-spin text-ink-400" />}
        </div>
        <button className="btn-ghost px-3" onClick={pickRandom} title="Pick a random product">
          <Shuffle size={15} />
        </button>
      </div>

      {open && (
        <ul className="scroll-slim absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-ink-200 bg-white py-1 shadow-lg">
          {results.length === 0 && (
            <li className="px-3 py-2 text-sm text-ink-500">No products matched that text.</li>
          )}
          {results.map((product) => (
            <li key={product.product_id}>
              <button
                onClick={() => {
                  onSelect(product)
                  setOpen(false)
                  setTerm('')
                }}
                className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-brand-50"
              >
                <span className="mt-0.5 shrink-0 font-mono text-[10px] text-ink-400">
                  #{product.product_id}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-ink-800">{product.name}</span>
                  <span className="text-[11px] text-ink-500">
                    {product.main_category} › {product.subcategory}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-50 p-3">
          <Check size={15} className="mt-0.5 shrink-0 text-brand-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug text-ink-900">{selected.name}</p>
            <p className="mt-0.5 text-[11px] text-ink-600">
              #{selected.product_id} · {selected.main_category} › {selected.subcategory}
            </p>
          </div>
          <button onClick={() => onSelect(null)} className="text-ink-400 hover:text-ink-700">
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  )
}
