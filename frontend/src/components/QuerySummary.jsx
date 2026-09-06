import { GitCompareArrows, Quote, Target } from 'lucide-react'

/** What was actually asked, plus how much the models agreed on the answer. */
export default function QuerySummary({ query, agreement }) {
  const isCatalogue = query.mode === 'catalogue'

  return (
    <section className="card p-5">
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0">
          <p className="label mb-2 flex items-center gap-1.5">
            {isCatalogue ? <Target size={12} /> : <Quote size={12} />}
            {isCatalogue ? 'Query product' : 'Free-text query'}
          </p>

          {isCatalogue ? (
            <>
              <h2 className="text-base font-bold leading-snug text-ink-900">{query.product.name}</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="chip">#{query.product.product_id}</span>
                <span className="chip">{query.product.main_category}</span>
                <span className="chip">{query.product.subcategory}</span>
              </div>
            </>
          ) : (
            <h2 className="text-base font-bold leading-snug text-ink-900">"{query.raw_text}"</h2>
          )}

          <div className="mt-3 rounded-lg bg-ink-50 p-3">
            <p className="label mb-1">Text handed to every representation</p>
            <p className="font-mono text-xs leading-relaxed text-ink-700">{query.processed_text}</p>
          </div>
        </div>

        <div className="lg:border-l lg:border-ink-100 lg:pl-5">
          <p className="label mb-2 flex items-center gap-1.5">
            <GitCompareArrows size={12} /> Model agreement
          </p>

          {agreement.overlap_pct == null ? (
            <p className="text-sm text-ink-500">Select two or more models to compare them.</p>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tabular-nums text-ink-900">
                  {agreement.overlap_pct}%
                </span>
                <span className="text-xs text-ink-500">
                  of the top results appear in every selected model
                </span>
              </div>

              <ul className="mt-3 space-y-1.5">
                {agreement.pairwise.map((pair) => (
                  <li key={pair.pair} className="flex items-center gap-2">
                    <span className="w-36 shrink-0 truncate text-[11px] text-ink-600">
                      {pair.pair}
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                      <span
                        className="block h-full rounded-full bg-ink-400"
                        style={{ width: `${pair.jaccard * 100}%` }}
                      />
                    </span>
                    <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-ink-700">
                      {pair.jaccard.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-ink-400">
                Jaccard overlap of the returned sets. Low numbers mean the representations disagree
                — usually where the lexical baseline breaks down.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
