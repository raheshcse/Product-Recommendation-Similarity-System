import { useEffect, useMemo, useState } from 'react'
import { CircleAlert, Loader2, ServerCrash } from 'lucide-react'

import Header from './components/Header'
import QueryPanel from './components/QueryPanel'
import QuerySummary from './components/QuerySummary'
import ModelColumn from './components/ModelColumn'
import ScoreChart from './components/ScoreChart'
import EmptyState from './components/EmptyState'
import ExplainView from './components/ExplainView'
import EvaluationView from './components/EvaluationView'
import ModelsView from './components/ModelsView'

import { api } from './lib/api'
import { useAsync } from './hooks/useAsync'
import { MODEL_ORDER } from './lib/constants'

export default function App() {
  const [tab, setTab] = useState('recommend')

  // ---- query state -------------------------------------------------
  const [mode, setMode] = useState('catalogue')
  const [product, setProduct] = useState(null)
  const [text, setText] = useState('')
  const [selectedModels, setSelectedModels] = useState(['tfidf', 'word2vec', 'fasttext'])
  const [topN, setTopN] = useState(10)
  const [minScore, setMinScore] = useState(0)
  const [categoryFilter, setCategoryFilter] = useState(null)

  // ---- results -----------------------------------------------------
  const [response, setResponse] = useState(null)
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState(null)

  const health = useAsync((signal) => api.health(signal), [])
  const models = useAsync((signal) => api.models(signal), [])
  const categories = useAsync((signal) => api.categories(signal), [])
  const samples = useAsync((signal) => api.sample(6, signal), [])

  const availableModels = useMemo(() => {
    const rows = models.data ?? []
    return [...rows].sort((a, b) => MODEL_ORDER.indexOf(a.key) - MODEL_ORDER.indexOf(b.key))
  }, [models.data])

  // Drop any pre-selected model the backend could not load.
  useEffect(() => {
    if (!models.data) return
    const loaded = new Set(models.data.filter((m) => m.loaded).map((m) => m.key))
    setSelectedModels((current) => {
      const filtered = current.filter((key) => loaded.has(key))
      return filtered.length ? filtered : [...loaded].slice(0, 3)
    })
  }, [models.data])

  const canSubmit =
    selectedModels.length > 0 && (mode === 'catalogue' ? Boolean(product) : text.trim().length > 0)

  const runSearch = async (overrides = {}) => {
    const payload = {
      models: selectedModels,
      top_n: topN,
      min_score: minScore,
      category_filter: categoryFilter,
      ...(mode === 'catalogue'
        ? { product_id: product?.product_id }
        : { query_text: text.trim() }),
      ...overrides,
    }

    setRunning(true)
    setRunError(null)
    try {
      setResponse(await api.recommend(payload))
    } catch (error) {
      setRunError(error.message)
      setResponse(null)
    } finally {
      setRunning(false)
    }
  }

  const useAsQuery = (item) => {
    setMode('catalogue')
    setProduct(item)
    setTab('recommend')
    runSearch({ product_id: item.product_id, query_text: undefined })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const pickSample = (item) => {
    setMode('catalogue')
    setProduct(item)
    runSearch({ product_id: item.product_id, query_text: undefined })
  }

  const sharedIds = useMemo(
    () => new Set(response?.agreement?.shared_product_ids ?? []),
    [response],
  )

  const columns = response?.results?.length ?? 0
  const gridClass =
    columns >= 4
      ? 'xl:grid-cols-4 lg:grid-cols-2'
      : columns === 3
        ? 'xl:grid-cols-3 md:grid-cols-2'
        : columns === 2
          ? 'md:grid-cols-2'
          : 'grid-cols-1'

  return (
    <div className="min-h-screen">
      <Header health={health.data} loading={health.loading} tab={tab} onTabChange={setTab} />

      <main className="mx-auto max-w-[1600px] px-6 py-6">
        {health.error && <ApiDown message={health.error.message} />}

        {!health.error && tab === 'recommend' && (
          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <QueryPanel
              mode={mode}
              onModeChange={setMode}
              product={product}
              onProductChange={setProduct}
              text={text}
              onTextChange={setText}
              models={selectedModels}
              availableModels={availableModels}
              onModelsChange={setSelectedModels}
              topN={topN}
              onTopNChange={setTopN}
              minScore={minScore}
              onMinScoreChange={setMinScore}
              categoryFilter={categoryFilter}
              onCategoryFilterChange={setCategoryFilter}
              categories={categories.data ?? []}
              onSubmit={() => runSearch()}
              loading={running}
              canSubmit={canSubmit}
            />

            <div className="min-w-0 space-y-5">
              {runError && (
                <p className="card flex items-start gap-2 p-4 text-sm text-rose-700">
                  <CircleAlert size={16} className="mt-0.5 shrink-0" />
                  {runError}
                </p>
              )}

              {running && !response && (
                <div className="card grid h-64 place-items-center text-sm text-ink-500">
                  <span className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Ranking {health.data?.catalogue_size?.toLocaleString() ?? ''} products…
                  </span>
                </div>
              )}

              {!response && !running && (
                <EmptyState samples={samples.data ?? []} onPick={pickSample} />
              )}

              {response && (
                <>
                  <QuerySummary query={response.query} agreement={response.agreement} />
                  <div className={`grid gap-4 ${gridClass}`}>
                    {response.results.map((result) => (
                      <ModelColumn
                        key={result.model}
                        result={result}
                        sharedIds={sharedIds}
                        onUseAsQuery={useAsQuery}
                      />
                    ))}
                  </div>
                  <ScoreChart results={response.results} />
                </>
              )}
            </div>
          </div>
        )}

        {!health.error && tab === 'explain' && (
          <ExplainView initialText={mode === 'free_text' ? text : product?.name} />
        )}
        {!health.error && tab === 'evaluate' && <EvaluationView />}
        {!health.error && tab === 'models' && <ModelsView />}
      </main>

      <footer className="mx-auto max-w-[1600px] px-6 pb-8 pt-2 text-[11px] text-ink-400">
        Acme Retail · Product Recommendation Similarity System — FastAPI + React. All cleaning,
        vectorisation, cosine scoring and ranking happen server-side.
      </footer>
    </div>
  )
}

function ApiDown({ message }) {
  return (
    <div className="card mx-auto max-w-xl p-8 text-center">
      <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl bg-rose-50 text-rose-600">
        <ServerCrash size={20} />
      </div>
      <h2 className="text-base font-bold text-ink-900">Cannot reach the API</h2>
      <p className="mt-1.5 text-sm text-ink-500">{message}</p>
      <pre className="mt-4 overflow-x-auto rounded-lg bg-ink-900 p-3 text-left text-xs text-ink-100">
        cd backend{'\n'}python scripts/build_artifacts.py{'\n'}uvicorn app.main:app --reload
      </pre>
    </div>
  )
}
