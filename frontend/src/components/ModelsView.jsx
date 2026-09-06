import { Check, CircleAlert, Database, Layers, X } from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { api } from '../lib/api'
import { themeFor } from '../lib/constants'

/** Reference tab: what each representation is, and what the catalogue looks like. */
export default function ModelsView() {
  const models = useAsync((signal) => api.models(signal), [])
  const stats = useAsync((signal) => api.stats(signal), [])

  return (
    <div className="space-y-5">
      {stats.data && (
        <section className="card p-5">
          <p className="label mb-4 flex items-center gap-1.5">
            <Database size={12} /> Catalogue
          </p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
            <Stat label="Products" value={stats.data.total_products.toLocaleString()} />
            <Stat label="Main categories" value={stats.data.main_categories} />
            <Stat label="Subcategories" value={stats.data.subcategories} />
            <Stat label="Unique tokens" value={stats.data.unique_tokens.toLocaleString()} />
            <Stat label="Avg tokens / product" value={stats.data.avg_tokens_per_product} />
            <Stat
              label="Token range"
              value={`${stats.data.min_tokens_per_product}–${stats.data.max_tokens_per_product}`}
            />
          </div>

          <div className="mt-5">
            <p className="label mb-2">Largest categories</p>
            <ul className="space-y-1.5">
              {stats.data.top_categories.map((category) => (
                <li key={category.name} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-xs text-ink-700">{category.name}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                    <span
                      className="block h-full rounded-full bg-ink-400"
                      style={{
                        width: `${(category.count / stats.data.top_categories[0].count) * 100}%`,
                      }}
                    />
                  </span>
                  <span className="w-16 shrink-0 text-right font-mono text-xs tabular-nums text-ink-600">
                    {category.count.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section>
        <p className="label mb-3 flex items-center gap-1.5">
          <Layers size={12} /> Representations
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {(models.data ?? []).map((model) => (
            <ModelCard key={model.key} model={model} />
          ))}
        </div>
      </section>
    </div>
  )
}

function ModelCard({ model }) {
  const theme = themeFor(model.key)

  return (
    <article className="card flex flex-col p-5">
      <div className="mb-3 flex items-start gap-2.5">
        <span
          className="mt-1 h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: theme.accent }}
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-ink-900">{model.name}</h3>
          <p className="text-[11px] uppercase tracking-wide text-ink-400">{model.family}</p>
        </div>
        {model.loaded ? (
          <span className="chip border border-emerald-200 bg-emerald-50 text-emerald-700">
            <Check size={10} /> loaded
          </span>
        ) : (
          <span className="chip border border-rose-200 bg-rose-50 text-rose-700">
            <X size={10} /> missing
          </span>
        )}
      </div>

      <p className="text-xs leading-relaxed text-ink-600">{model.description}</p>

      {model.error && (
        <p className="mt-3 flex items-start gap-1.5 rounded-md bg-rose-50 p-2 text-[11px] text-rose-800">
          <CircleAlert size={12} className="mt-0.5 shrink-0" />
          {model.error}
        </p>
      )}

      {model.loaded && (
        <>
          <dl className="mt-4 grid grid-cols-3 gap-2">
            <Stat label="Products" value={model.n_products.toLocaleString()} compact />
            <Stat
              label={model.family === 'lexical' ? 'Features' : 'Dimensions'}
              value={model.dimensions ? model.dimensions.toLocaleString() : '—'}
              compact
            />
            <Stat
              label="Vocabulary"
              value={model.vocabulary_size ? model.vocabulary_size.toLocaleString() : '—'}
              compact
            />
          </dl>

          {Object.keys(model.extra ?? {}).length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {Object.entries(model.extra).map(([key, value]) => (
                <li key={key} className="chip">
                  {key.replace(/_/g, ' ')}:{' '}
                  <span className="font-mono">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <p className="mt-auto pt-4 text-[11px] text-ink-500">
        {model.handles_unseen_words
          ? '✓ Produces a vector for words never seen during training.'
          : '✗ Words outside the training vocabulary cannot be represented.'}
      </p>
    </article>
  )
}

function Stat({ label, value, compact }) {
  return (
    <div className={compact ? 'rounded-md bg-ink-50 p-2' : ''}>
      <p className="text-[10px] uppercase tracking-wide text-ink-400">{label}</p>
      <p className={`font-semibold tabular-nums text-ink-900 ${compact ? 'text-xs' : 'text-xl'}`}>
        {value}
      </p>
    </div>
  )
}
