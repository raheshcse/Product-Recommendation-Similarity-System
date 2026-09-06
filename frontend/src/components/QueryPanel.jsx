import { Play, Sparkles, SlidersHorizontal, Loader2 } from 'lucide-react'
import ProductPicker from './ProductPicker'
import { EXAMPLE_QUERIES, themeFor } from '../lib/constants'

/**
 * Everything that defines a query: mode, subject, models, top-N and filters.
 * Purely controlled - all state lives in App so the panel stays reusable.
 */
export default function QueryPanel({
  mode,
  onModeChange,
  product,
  onProductChange,
  text,
  onTextChange,
  models,
  availableModels,
  onModelsChange,
  topN,
  onTopNChange,
  minScore,
  onMinScoreChange,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  onSubmit,
  loading,
  canSubmit,
}) {
  const toggleModel = (key) =>
    onModelsChange(models.includes(key) ? models.filter((m) => m !== key) : [...models, key])

  return (
    <aside className="card sticky top-[76px] flex flex-col gap-5 p-5">
      <div>
        <p className="label mb-2">Query source</p>
        <div className="flex gap-1 rounded-lg bg-ink-100 p-1">
          {[
            { key: 'catalogue', label: 'Catalogue product' },
            { key: 'free_text', label: 'Free text' },
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => onModeChange(option.key)}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                mode === option.key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'catalogue' ? (
        <ProductPicker selected={product} onSelect={onProductChange} />
      ) : (
        <div>
          <textarea
            className="field h-24 resize-none"
            placeholder="Describe any product — it does not have to exist in the catalogue."
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EXAMPLE_QUERIES.map((example) => (
              <button
                key={example}
                onClick={() => onTextChange(example)}
                className="chip hover:bg-brand-50 hover:text-brand-700"
              >
                <Sparkles size={10} />
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="label mb-2">Representations to compare</p>
        <div className="grid gap-1.5">
          {availableModels.map((model) => {
            const theme = themeFor(model.key)
            const checked = models.includes(model.key)
            return (
              <label
                key={model.key}
                className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition ${
                  checked ? theme.soft : 'border-ink-200 bg-white hover:bg-ink-50'
                } ${model.loaded ? '' : 'pointer-events-none opacity-40'}`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-3.5 w-3.5 accent-current"
                  checked={checked}
                  disabled={!model.loaded}
                  onChange={() => toggleModel(model.key)}
                />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold">{model.name}</span>
                  <span className="block text-[11px] opacity-80">{theme.tag}</span>
                </span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="space-y-4 border-t border-ink-100 pt-4">
        <p className="label flex items-center gap-1.5">
          <SlidersHorizontal size={12} /> Retrieval settings
        </p>

        <Slider
          label="Results per model"
          value={topN}
          min={3}
          max={30}
          step={1}
          display={topN}
          onChange={onTopNChange}
        />
        <Slider
          label="Minimum similarity"
          value={minScore}
          min={0}
          max={0.9}
          step={0.05}
          display={minScore.toFixed(2)}
          onChange={onMinScoreChange}
        />

        <div>
          <p className="label mb-1.5">Restrict to category</p>
          <select
            className="field"
            value={categoryFilter ?? ''}
            onChange={(e) => onCategoryFilterChange(e.target.value || null)}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} ({c.product_count.toLocaleString()})
              </option>
            ))}
          </select>
        </div>
      </div>

      <button className="btn-primary w-full" onClick={onSubmit} disabled={!canSubmit || loading}>
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
        {loading ? 'Ranking catalogue…' : 'Find similar products'}
      </button>
    </aside>
  )
}

function Slider({ label, value, min, max, step, display, onChange }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <p className="label">{label}</p>
        <span className="font-mono text-xs font-semibold text-ink-800">{display}</span>
      </div>
      <input
        type="range"
        className="w-full accent-brand-500"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}
