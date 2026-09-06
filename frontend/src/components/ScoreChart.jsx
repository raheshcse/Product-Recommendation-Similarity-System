import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Table2, LineChart as LineIcon } from 'lucide-react'
import { CHART_INK, themeFor } from '../lib/constants'

/**
 * How similarity decays down the ranked list, one line per representation.
 *
 * Rank is an ordered position, so the falling shape of the curve is the
 * information: a steep drop means one clear match, a flat curve means the model
 * finds the whole neighbourhood equally close. A table view is always available
 * because identity must never rest on colour alone.
 */
export default function ScoreChart({ results }) {
  const [view, setView] = useState('chart')

  const series = useMemo(
    () => results.filter((r) => r.available && r.recommendations.length > 0),
    [results],
  )

  const data = useMemo(() => {
    const maxRank = Math.max(0, ...series.map((r) => r.recommendations.length))
    return Array.from({ length: maxRank }, (_, i) => {
      const row = { rank: i + 1 }
      series.forEach((r) => {
        row[r.model] = r.recommendations[i]?.similarity_score ?? null
      })
      return row
    })
  }, [series])

  if (series.length === 0) return null

  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-ink-900">Similarity decay by rank</h3>
          <p className="mt-0.5 text-xs text-ink-500">
            Cosine similarity of each result against the query. A steep fall means one standout
            match; a flat line means the model sees a whole cluster as equally close.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-ink-100 p-0.5">
          {[
            { key: 'chart', icon: LineIcon, label: 'Chart' },
            { key: 'table', icon: Table2, label: 'Table' },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                view === key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'
              }`}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
      </div>

      <Legend series={series} />

      {view === 'chart' ? (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -12 }}>
              <CartesianGrid stroke={CHART_INK.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="rank"
                tick={{ fontSize: 11, fill: CHART_INK.axis }}
                tickLine={false}
                axisLine={{ stroke: CHART_INK.grid }}
                label={{
                  value: 'Rank',
                  position: 'insideBottomRight',
                  offset: -2,
                  style: { fontSize: 11, fill: CHART_INK.axis },
                }}
              />
              <YAxis
                domain={[0, 1]}
                tick={{ fontSize: 11, fill: CHART_INK.axis }}
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(v) => v.toFixed(1)}
              />
              <Tooltip content={<ScoreTooltip series={series} />} cursor={{ stroke: CHART_INK.axis }} />
              {series.map((r) => (
                <Line
                  key={r.model}
                  type="monotone"
                  dataKey={r.model}
                  name={r.model_name}
                  stroke={themeFor(r.model).accent}
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 2, stroke: CHART_INK.surface }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: CHART_INK.surface }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ScoreTable data={data} series={series} />
      )}
    </section>
  )
}

function Legend({ series }) {
  return (
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {series.map((r) => (
        <span key={r.model} className="flex items-center gap-1.5 text-xs font-medium text-ink-700">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: themeFor(r.model).accent }}
          />
          {r.model_name}
        </span>
      ))}
    </div>
  )
}

function ScoreTooltip({ active, payload, label, series }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-ink-200 bg-white px-3 py-2 shadow-lg">
      <p className="mb-1.5 text-xs font-bold text-ink-900">Rank {label}</p>
      <ul className="space-y-1">
        {payload.map((entry) => {
          const result = series.find((r) => r.model === entry.dataKey)
          const item = result?.recommendations[label - 1]
          return (
            <li key={entry.dataKey} className="flex items-start gap-2 text-[11px]">
              <span
                className="mt-1 h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.stroke }}
              />
              <span className="min-w-0">
                <span className="font-semibold text-ink-800">{entry.name}</span>{' '}
                <span className="font-mono tabular-nums text-ink-600">
                  {entry.value?.toFixed(4)}
                </span>
                {item && (
                  <span className="block max-w-[240px] truncate text-ink-500">{item.name}</span>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ScoreTable({ data, series }) {
  return (
    <div className="scroll-slim max-h-64 overflow-auto rounded-lg border border-ink-200">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-ink-50 text-ink-600">
          <tr>
            <th className="px-3 py-2 font-semibold">Rank</th>
            {series.map((r) => (
              <th key={r.model} className="px-3 py-2 font-semibold">
                {r.model_name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {data.map((row) => (
            <tr key={row.rank}>
              <td className="px-3 py-1.5 font-mono text-ink-500">{row.rank}</td>
              {series.map((r) => (
                <td key={r.model} className="px-3 py-1.5 font-mono tabular-nums text-ink-800">
                  {row[r.model] == null ? '—' : row[r.model].toFixed(4)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
