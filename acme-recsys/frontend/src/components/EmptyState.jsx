import { Compass } from 'lucide-react'

export default function EmptyState({ samples, onPick }) {
  return (
    <section className="card p-8 text-center">
      <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl bg-ink-100 text-ink-500">
        <Compass size={20} />
      </div>
      <h2 className="text-base font-bold text-ink-900">Pick a product, or describe one</h2>
      <p className="mx-auto mt-1.5 max-w-lg text-sm text-ink-500">
        Every selected representation ranks the whole catalogue against your query and returns its
        top matches side by side, so you can see where meaning-based embeddings pull ahead of exact
        word matching.
      </p>

      {samples?.length > 0 && (
        <div className="mt-6">
          <p className="label mb-3">Try one of these</p>
          <div className="mx-auto grid max-w-3xl gap-2 sm:grid-cols-2">
            {samples.map((product) => (
              <button
                key={product.product_id}
                onClick={() => onPick(product)}
                className="rounded-lg border border-ink-200 bg-white p-3 text-left transition hover:border-brand-400 hover:bg-brand-50"
              >
                <p className="line-clamp-1 text-[13px] font-medium text-ink-900">{product.name}</p>
                <p className="mt-0.5 text-[11px] text-ink-500">
                  {product.main_category} › {product.subcategory}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
