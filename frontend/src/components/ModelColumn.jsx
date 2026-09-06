import { CircleAlert, Timer } from 'lucide-react'
import ProductCard from './ProductCard'
import { themeFor } from '../lib/constants'

/** One vertical column of ranked results for a single representation. */
export default function ModelColumn({ result, sharedIds, onUseAsQuery }) {
  const theme = themeFor(result.model)

  if (!result.available) {
    return (
      <section className="card flex flex-col">
        <ColumnHeader theme={theme} title={result.model_name} />
        <div className="flex flex-1 items-start gap-2 p-4 text-sm text-rose-700">
          <CircleAlert size={15} className="mt-0.5 shrink-0" />
          <p>{result.error}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="card flex flex-col overflow-hidden animate-rise">
      <ColumnHeader theme={theme} title={result.model_name}>
        <span className="chip">
          <Timer size={10} /> {result.elapsed_ms} ms
        </span>
      </ColumnHeader>

      {result.score_summary && (
        <div className="grid grid-cols-3 gap-px border-b border-ink-100 bg-ink-100 text-center">
          {[
            ['Top score', result.score_summary.max],
            ['Mean', result.score_summary.mean],
            ['Std dev', result.score_summary.std],
          ].map(([label, value]) => (
            <div key={label} className="bg-white px-2 py-2">
              <p className="text-[10px] uppercase tracking-wide text-ink-400">{label}</p>
              <p className="font-mono text-xs font-semibold text-ink-800">{value.toFixed(4)}</p>
            </div>
          ))}
        </div>
      )}

      {result.recommendations.length === 0 ? (
        <p className="p-4 text-sm text-ink-500">
          Nothing cleared the similarity threshold for this representation.
        </p>
      ) : (
        <ul className="scroll-slim max-h-[62vh] space-y-2 overflow-y-auto p-3">
          {result.recommendations.map((item) => (
            <ProductCard
              key={item.product_id}
              item={item}
              accent={theme.accent}
              shared={sharedIds.has(item.product_id)}
              onUseAsQuery={onUseAsQuery}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function ColumnHeader({ theme, title, children }) {
  return (
    <header className="flex items-center gap-2 border-b border-ink-100 px-4 py-3">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${theme.dot}`} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-bold text-ink-900">{title}</h3>
        <p className="text-[11px] text-ink-500">{theme.tag}</p>
      </div>
      {children}
    </header>
  )
}
