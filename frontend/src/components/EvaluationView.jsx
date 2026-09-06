import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Info, Loader2, RefreshCw, Trophy } from 'lucide-react'
import { api } from '../lib/api'
import { useAsync } from '../hooks/useAsync'
import { CHART_INK, themeFor } from '../lib/constants'

const METRICS = [
  { key: 'precision_at_k', label: 'Precision@k' },
  { key: 'category_match_at_k', label: 'Category match@k' },
  { key: 'mrr', label: 'MRR' },
]

/** Offline quality comparison across representations. */
export default function EvaluationView() {
  const [sampleSize, setSampleSize] = useState(200)
  const [k, setK] = useState(10)
  const [metric, setMetric] = useState('precision_at_k')

  const { data, loading, error, run } = useAsync(
    (signal) => api.evaluation(sampleSize, k, signal),
    [sampleSize, k],
  )

  const chartData = useMemo(
    () =>
      (data?.metrics ?? []).map((row) => ({
        ...row,
        value: row[metric],
      })),
    [data, metric],
  )

  const activeMetric = METRICS.find((m) => m.key === metric)

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-ink-900">Offline evaluation</h2>
            <p className="mt-0.5 max-w-2xl text-xs text-ink-500">
              Each representation is asked for the top-k neighbours of a random sample of catalogue
              products. Because the catalogue has no human relevance labels, the product taxonomy
              stands in for one: a good neighbour usually shares the query's subcategory.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <Control label="Sample size">
              <select
                className="field w-28 py-1.5"
                value={sampleSize}
                onChange={(e) => setSampleSize(Number(e.target.value))}
              >
                {[100, 200, 300, 500, 1000].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Control>
            <Control label="k">
              <select
                className="field w-20 py-1.5"
                value={k}
                onChange={(e) => setK(Number(e.target.value))}
              >
                {[5, 10, 20].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Control>
            <button className="btn-ghost py-1.5" onClick={() => run()} disabled={loading}>
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              Re-run
            </button>
          </div>
        </div>
      </section>

      {error && <p className="card p-4 text-sm text-rose-700">{error.message}</p>}

      {loading && !data && (
        <div className="card grid h-56 place-items-center text-sm text-ink-500">
          <span className="flex items-center gap-2">
            <Loader2 size={15} className="animate-spin" /> Scoring the sample…
          </span>
        </div>
      )}

      {data && (
        <>
          {data.best_model && (
            <div className="card flex items-center gap-3 border-emerald-200 bg-emerald-50 p-4">
              <Trophy size={18} className="shrink-0 text-emerald-700" />
              <p className="text-sm text-emerald-900">
                <span className="font-bold">
                  {data.metrics.find((m) => m.model === data.best_model)?.model_name}
                </span>{' '}
                ranks highest on precision@{data.k} over {data.sample_size.toLocaleString()} sampled
                queries.
              </p>
            </div>
          )}

          <section className="card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-ink-900">{activeMetric.label} by representation</h3>
              <div className="flex gap-1 rounded-lg bg-ink-100 p-0.5">
                {METRICS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setMetric(m.key)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                      metric === m.key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 4, right: 48, bottom: 4, left: 8 }}
                  barCategoryGap="28%"
                >
                  <CartesianGrid stroke={CHART_INK.grid} strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 1]}
                    tick={{ fontSize: 11, fill: CHART_INK.axis }}
                    tickLine={false}
                    axisLine={{ stroke: CHART_INK.grid }}
                  />
                  <YAxis
                    type="category"
                    dataKey="model_name"
                    width={124}
                    tick={{ fontSize: 12, fill: CHART_INK.text }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(15,23,41,0.04)' }}
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs shadow-lg">
                          <p className="font-bold text-ink-900">{payload[0].payload.model_name}</p>
                          <p className="mt-1 text-ink-600">
                            {activeMetric.label}:{' '}
                            <span className="font-mono font-semibold">
                              {payload[0].value.toFixed(4)}
                            </span>
                          </p>
                          <p className="text-ink-500">
                            Mean top-k score: {payload[0].payload.mean_top_k_score.toFixed(3)}
                          </p>
                        </div>
                      ) : null
                    }
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                    {chartData.map((row) => (
                      <Cell key={row.model} fill={themeFor(row.model).accent} />
                    ))}
                    <LabelList
                      dataKey="value"
                      position="right"
                      formatter={(v) => v.toFixed(3)}
                      style={{ fontSize: 11, fill: CHART_INK.text, fontWeight: 600 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Representation</th>
                  <th className="px-4 py-2.5 font-semibold">Precision@{data.k}</th>
                  <th className="px-4 py-2.5 font-semibold">Category match@{data.k}</th>
                  <th className="px-4 py-2.5 font-semibold">MRR</th>
                  <th className="px-4 py-2.5 font-semibold">Mean score</th>
                  <th className="px-4 py-2.5 font-semibold">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {data.metrics.map((row) => (
                  <tr key={row.model} className="hover:bg-ink-50/60">
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2 font-semibold text-ink-900">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: themeFor(row.model).accent }}
                        />
                        {row.model_name}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums">{row.precision_at_k.toFixed(4)}</td>
                    <td className="px-4 py-2.5 font-mono tabular-nums">
                      {row.category_match_at_k.toFixed(4)}
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums">{row.mrr.toFixed(4)}</td>
                    <td className="px-4 py-2.5 font-mono tabular-nums">
                      {row.mean_top_k_score.toFixed(4)}
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-ink-500">
                      {row.elapsed_ms} ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card flex items-start gap-3 p-4">
            <Info size={16} className="mt-0.5 shrink-0 text-ink-400" />
            <div className="text-xs leading-relaxed text-ink-600">
              <p className="mb-2">{data.caveat}</p>
              <ul className="space-y-0.5">
                {Object.entries(data.definitions).map(([key, value]) => (
                  <li key={key}>
                    <span className="font-mono font-semibold text-ink-800">{key}</span> — {value}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function Control({ label, children }) {
  return (
    <label className="block">
      <span className="label mb-1 block">{label}</span>
      {children}
    </label>
  )
}
