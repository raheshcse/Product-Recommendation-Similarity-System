import { useEffect, useState } from 'react'
import { ArrowDown, Loader2, Search, TriangleAlert } from 'lucide-react'
import { api } from '../lib/api'
import { themeFor } from '../lib/constants'

/**
 * The dry run: shows a query moving through cleaning, field combination and
 * tokenisation, then how each representation turns those tokens into a vector.
 */
export default function ExplainView({ initialText }) {
  const [text, setText] = useState(initialText || 'wireless noisecancelling earbudz')
  const [data, setData] = useState(null)
  const [neighbours, setNeighbours] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const run = async (value) => {
    const query = (value ?? text).trim()
    if (!query) return
    setLoading(true)
    setError(null)
    try {
      const [explained, related] = await Promise.all([
        api.explain({ query_text: query }),
        api.neighbours(query.split(/\s+/).pop()),
      ])
      setData(explained)
      setNeighbours(related)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <h2 className="text-sm font-bold text-ink-900">Pipeline dry run</h2>
        <p className="mt-0.5 text-xs text-ink-500">
          Type any product text and follow it through every stage of the system.
        </p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            run()
          }}
        >
          <input className="field" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn-primary shrink-0" disabled={loading}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            Trace
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
      </section>

      {data && (
        <>
          <section className="card p-5">
            <p className="label mb-4">Stage 1 — Text pre-processing</p>
            <ol className="space-y-0">
              {data.pipeline.map((stage, index) => (
                <li key={stage.stage}>
                  <div className="rounded-lg border border-ink-200 bg-ink-50 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">
                      {stage.stage}
                    </p>
                    <p className="mt-1 break-words font-mono text-xs text-ink-900">
                      {stage.detail || <span className="text-ink-400">(empty)</span>}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-500">{stage.note}</p>
                  </div>
                  {index < data.pipeline.length - 1 && (
                    <div className="flex justify-center py-1.5 text-ink-300">
                      <ArrowDown size={14} />
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>

          <section>
            <p className="label mb-3">Stage 2 — Representation</p>
            <div className="grid gap-4 lg:grid-cols-3">
              {Object.entries(data.models).map(([key, model]) => (
                <ModelExplainCard key={key} modelKey={key} model={model} />
              ))}
            </div>
          </section>

          {neighbours && Object.keys(neighbours.neighbours).length > 0 && (
            <section className="card p-5">
              <p className="label mb-1">
                Stage 3 — What the embeddings learned about “{neighbours.word}”
              </p>
              <p className="mb-4 text-xs text-ink-500">
                Nearest words in each embedding space. This is the evidence that the models capture
                meaning rather than spelling.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(neighbours.neighbours).map(([key, words]) => (
                  <div key={key} className="rounded-lg border border-ink-200 p-3">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-ink-800">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: themeFor(key).accent }}
                      />
                      {themeFor(key).label}
                    </p>
                    {words.length === 0 ? (
                      <p className="text-xs text-ink-500">No vector available for this word.</p>
                    ) : (
                      <ul className="space-y-1">
                        {words.map((w) => (
                          <li key={w.word} className="flex items-center gap-2">
                            <span className="w-32 shrink-0 truncate text-xs text-ink-700">
                              {w.word}
                            </span>
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                              <span
                                className="block h-full rounded-full"
                                style={{
                                  width: `${Math.max(0, w.score) * 100}%`,
                                  backgroundColor: themeFor(key).accent,
                                }}
                              />
                            </span>
                            <span className="w-10 text-right font-mono text-[11px] tabular-nums text-ink-600">
                              {w.score.toFixed(3)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function ModelExplainCard({ modelKey, model }) {
  const theme = themeFor(modelKey)

  return (
    <div className="card flex flex-col p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-900">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: theme.accent }} />
        {model.model_name}
      </p>

      {model.top_terms && (
        <div className="mb-3">
          <p className="label mb-1.5">Highest weighted terms</p>
          {model.top_terms.length === 0 ? (
            <p className="text-xs text-ink-500">No catalogue term matched.</p>
          ) : (
            <ul className="space-y-1">
              {model.top_terms.slice(0, 6).map((t) => (
                <li key={t.term} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 truncate text-[11px] text-ink-700">{t.term}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${t.weight * 100}%`, backgroundColor: theme.accent }}
                    />
                  </span>
                  <span className="w-10 text-right font-mono text-[11px] tabular-nums text-ink-600">
                    {t.weight.toFixed(3)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {model.vector_dimensions != null && (
        <dl className="mb-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-ink-50 p-2">
            <dt className="text-[10px] uppercase tracking-wide text-ink-400">Dimensions</dt>
            <dd className="font-mono font-semibold text-ink-800">{model.vector_dimensions}</dd>
          </div>
          <div className="rounded-md bg-ink-50 p-2">
            <dt className="text-[10px] uppercase tracking-wide text-ink-400">Vector norm</dt>
            <dd className="font-mono font-semibold text-ink-800">{model.vector_norm}</dd>
          </div>
        </dl>
      )}

      {model.vector_preview && (
        <div className="mb-3">
          <p className="label mb-1">First 8 dimensions</p>
          <p className="break-all rounded-md bg-ink-900 p-2 font-mono text-[10px] leading-relaxed text-ink-100">
            [{model.vector_preview.join(', ')} …]
          </p>
        </div>
      )}

      <div className="mt-auto space-y-2">
        {model.unknown_tokens?.length > 0 && (
          <div className="flex items-start gap-1.5 rounded-md bg-amber-50 p-2 text-[11px] text-amber-900">
            <TriangleAlert size={12} className="mt-0.5 shrink-0" />
            <span>
              Unseen: <span className="font-mono">{model.unknown_tokens.join(', ')}</span>
            </span>
          </div>
        )}
        <p className="text-[11px] leading-relaxed text-ink-500">{model.note}</p>
      </div>
    </div>
  )
}
