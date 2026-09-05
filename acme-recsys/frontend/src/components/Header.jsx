import { Boxes, CircleAlert, CircleCheck, Loader2 } from 'lucide-react'

const TABS = [
  { key: 'recommend', label: 'Recommend' },
  { key: 'explain', label: 'How it works' },
  { key: 'evaluate', label: 'Evaluation' },
  { key: 'models', label: 'Models' },
]

export default function Header({ health, loading, tab, onTabChange }) {
  const status = loading ? 'loading' : health?.status ?? 'offline'

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/70 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-ink-900 text-white">
            <Boxes size={18} />
          </div>
          <div className="leading-tight">
            <h1 className="text-[15px] font-bold tracking-tight">Acme Retail · Product Similarity</h1>
            <p className="text-xs text-ink-500">
              Meaning-based recommendations across TF-IDF, Word2Vec and FastText
            </p>
          </div>
        </div>

        <nav className="order-3 flex w-full gap-1 rounded-lg bg-ink-100 p-1 md:order-2 md:w-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-semibold transition md:flex-none ${
                tab === t.key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="order-2 ml-auto md:order-3">
          <StatusPill status={status} health={health} />
        </div>
      </div>
    </header>
  )
}

function StatusPill({ status, health }) {
  if (status === 'loading') {
    return (
      <span className="chip bg-ink-100 text-ink-500">
        <Loader2 size={12} className="animate-spin" /> connecting
      </span>
    )
  }
  if (status === 'ok') {
    return (
      <span className="chip border border-emerald-200 bg-emerald-50 text-emerald-700">
        <CircleCheck size={12} />
        API online · {health.catalogue_size.toLocaleString()} products ·{' '}
        {health.models_available.length} models
      </span>
    )
  }
  return (
    <span className="chip border border-rose-200 bg-rose-50 text-rose-700">
      <CircleAlert size={12} />
      {status === 'degraded' ? 'API degraded — some models missing' : 'API offline'}
    </span>
  )
}
