import { ArrowRight, Star } from 'lucide-react'

/** One ranked recommendation. `shared` marks products every model agreed on. */
export default function ProductCard({ item, accent, shared, onUseAsQuery }) {
  const pct = Math.max(0, Math.min(1, item.similarity_score)) * 100

  return (
    <li className="group relative rounded-lg border border-ink-200/80 bg-white p-3 transition hover:border-ink-300 hover:shadow-sm">
      <div className="flex items-start gap-2.5">
        <span
          className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded font-mono text-[10px] font-bold text-white"
          style={{ backgroundColor: accent }}
        >
          {item.rank}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium leading-snug text-ink-900 line-clamp-2">{item.name}</p>

          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <span className="chip">{item.main_category}</span>
            <span className="chip">{item.subcategory}</span>
            {shared && (
              <span className="chip border border-emerald-200 bg-emerald-50 text-emerald-700">
                <Star size={9} /> all models
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: accent }}
              />
            </div>
            <span className="font-mono text-[11px] font-semibold tabular-nums text-ink-700">
              {item.similarity_score.toFixed(4)}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={() => onUseAsQuery(item)}
        title="Use this product as the next query"
        className="absolute right-2 top-2 hidden rounded-md border border-ink-200 bg-white p-1 text-ink-500 hover:text-brand-600 group-hover:block"
      >
        <ArrowRight size={12} />
      </button>
    </li>
  )
}
