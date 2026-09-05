# Acme Retail — Product Recommendation Similarity System

A meaning-based product similarity service for a 51,542-product retail catalogue.
Give it a catalogue product **or** any free product text and it returns the top-N
most similar products, ranked by cosine similarity, from four interchangeable
representations.

| Representation | What it is | Unseen words |
|---|---|---|
| **TF-IDF** | Sparse lexical baseline, 1–2 grams, `min_df=2` | ✗ dropped |
| **Word2Vec** | Skip-gram, 100-d, mean-pooled per product | ✗ dropped |
| **FastText** | Skip-gram + character n-grams (3–6), 100-d | ✓ rebuilt from sub-words |
| **Hybrid** | Min-max-normalised weighted blend (0.4 / 0.2 / 0.4) | ✓ |

**Stack:** FastAPI (Python) · React + Vite + Tailwind · scikit-learn · gensim · NumPy/SciPy

---

## 1. Quick start

### 1.1 Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux

pip install -r requirements.txt
```

Put `AcmeRetail_Products_Prepared.csv` in `backend/data/` (already included), then
build the model artifacts once:

```bash
python scripts/build_artifacts.py
```

That trains TF-IDF, Word2Vec and FastText and writes everything into
`backend/artifacts/` (~2 minutes, ~150 MB). Use `--limit 5000` for a fast smoke test.

Start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

* API docs — <http://127.0.0.1:8000/docs>
* Health — <http://127.0.0.1:8000/api/health>

### 1.2 Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

The dev server proxies `/api` to `http://127.0.0.1:8000`, so there is no CORS setup.

`run_dev.bat` (Windows) / `run_dev.sh` starts both at once.

### 1.3 Single-process deployment

```bash
cd frontend && npm run build
cd ../backend && uvicorn app.main:app --port 8000
```

If `frontend/dist` exists, FastAPI serves the built UI at `/` — one process, one port.

---

## 2. How the system works

```
raw product text
      │
      ▼  clean_text()               lowercase → strip punctuation → collapse whitespace
normalised text
      │
      ▼  build_combined_text()      Name + Main Category + Subcategory → one document
combined document
      │
      ▼  tokenise                   whitespace split
   tokens
      │
      ├──► TF-IDF vectorizer  ──► sparse vector (82,879 features)
      ├──► Word2Vec           ──► mean of known word vectors (100-d)
      └──► FastText           ──► mean of word vectors incl. sub-word (100-d)
      │
      ▼  cosine similarity against every catalogue vector
      ▼  drop the query itself, apply filters, argpartition top-N
   ranked recommendations
```

The **same** `clean_text` / `build_combined_text` functions run at training time and
at query time — that is what guarantees a live query is represented exactly the way
the catalogue was.

### Why cosine similarity

Product documents differ wildly in length (0–39 tokens here). Cosine compares the
*direction* of two vectors and ignores magnitude, so a three-word title and a
thirty-word description are judged on what they say, not how much they say.
All matrices are L2-normalised once at load, which turns cosine into a single dot
product — the reason a query over 51k products returns in **2–10 ms**.

### Why three representations

TF-IDF is the honest baseline: precise where wording matches, blind where it does
not. Word2Vec learns meaning from co-occurrence but drops any word missing from its
vocabulary. FastText adds character n-grams, so novel wording, typos and unseen
brand or model tokens still receive a sensible vector — which is what the
generalisation requirement asks for.

The difference is visible rather than asserted. Query
`"wireless noisecancelling earbudz"` (two words that appear nowhere in training):

* **TF-IDF** matches only `wireless` and returns *running shoes* (top score 0.32).
* **Word2Vec** skips both unknown words entirely.
* **FastText** rebuilds them from sub-words and returns true wireless earbuds with
  noise cancellation (top score 0.94).

Open the **How it works** tab and trace that query to see it stage by stage.

---

## 3. API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Readiness, catalogue size, which models loaded |
| GET | `/api/models` | Per-representation metadata, dimensions, vocabulary, sparsity |
| GET | `/api/catalogue/search?q=` | Type-ahead product search |
| GET | `/api/catalogue/sample?n=` | Random products |
| GET | `/api/catalogue/product/{id}` | One product |
| GET | `/api/catalogue/stats` | Catalogue summary statistics |
| GET | `/api/catalogue/categories` | Main categories with counts |
| POST | `/api/recommend` | **Top-N similar products** |
| POST | `/api/explain` | Stage-by-stage pipeline trace for a query |
| GET | `/api/neighbours?word=` | Nearest words in each embedding space |
| GET | `/api/evaluation` | Offline quality metrics per representation |

### Example

```bash
curl -X POST http://127.0.0.1:8000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"query_text":"wireless noisecancelling earbudz",
       "models":["tfidf","word2vec","fasttext","hybrid"],
       "top_n":10}'
```

```jsonc
{
  "query": { "mode": "free_text", "processed_text": "wireless noisecancelling earbudz", ... },
  "results": [
    {
      "model": "fasttext",
      "model_name": "FastText",
      "elapsed_ms": 2.56,
      "recommendations": [
        { "rank": 1, "product_id": 30412,
          "name": "luisport open ear bluetooth headphones wireless earphones ...",
          "main_category": "tv audio cameras", "subcategory": "headphones",
          "similarity_score": 0.9445 }
      ],
      "score_summary": { "max": 0.9445, "mean": 0.5145, "min": -0.21, "std": 0.0928 }
    }
  ],
  "agreement": { "overlap_pct": 30.0, "pairwise": [ ... ] }
}
```

`product_id` may be sent instead of `query_text` to use a catalogue item as the query.

---

## 4. Evaluation

The catalogue carries no human relevance labels, so the product taxonomy stands in
for one: a good neighbour of a query should usually share its subcategory.

Measured over 200 random query products, k = 10:

| Representation | Precision@10 | Category match@10 | MRR |
|---|---|---|---|
| **FastText** | **0.841** | **0.961** | 0.914 |
| Word2Vec | 0.836 | 0.956 | **0.936** |
| Hybrid | 0.820 | 0.948 | 0.872 |
| TF-IDF | 0.790 | 0.927 | 0.862 |

These are proxies, not ground truth — they reward taxonomically consistent
recommendations and should be read alongside the qualitative side-by-side view.
The **Evaluation** tab re-runs them live at any sample size and k.

---

## 5. Project structure

```
acme-recsys/
├── backend/
│   ├── app/
│   │   ├── main.py                     app factory, lifespan, static SPA mount
│   │   ├── core/
│   │   │   ├── config.py               all settings & hyper-parameters
│   │   │   └── logging.py
│   │   ├── schemas/recommendation.py   pydantic request/response models
│   │   ├── services/
│   │   │   ├── text_processing.py      the single source of text cleaning
│   │   │   ├── catalogue.py            in-memory catalogue, search, stats
│   │   │   ├── recommender.py          scoring, ranking, hybrid blend, agreement
│   │   │   ├── evaluation.py           precision@k / category match / MRR
│   │   │   └── representations/
│   │   │       ├── base.py             the interface every model implements
│   │   │       ├── tfidf.py
│   │   │       └── dense.py            Word2Vec + FastText
│   │   └── api/
│   │       ├── deps.py
│   │       └── routes/                 health · catalogue · recommend
│   ├── scripts/build_artifacts.py      rebuilds every artifact from the CSV
│   ├── data/                           prepared catalogue CSV
│   ├── artifacts/                      generated models (git-ignored)
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.jsx                     layout + query state
        ├── lib/{api,constants}.js      one API client, one colour system
        ├── hooks/{useAsync,useDebounce}.js
        └── components/
            ├── Header · QueryPanel · ProductPicker
            ├── QuerySummary · ModelColumn · ProductCard · ScoreChart
            └── ExplainView · EvaluationView · ModelsView · EmptyState
```

### Adding a fourth representation

Subclass `BaseRepresentation` (or `DenseEmbeddingRepresentation`), implement
`load`, `score_by_index`, `score_by_text` and `explain`, and add it to the
`candidates` list in `RecommendationEngine.load`. Nothing in the similarity engine,
the API layer or the UI needs to change — the frontend renders whatever
`/api/models` reports.

---

## 6. Engineering notes

* **Graceful degradation.** A missing or corrupt artifact disables only that
  representation; `/api/health` and `/api/models` report exactly what failed and the
  UI greys out that model instead of erroring.
* **Vector/catalogue consistency.** At start-up every representation's row count is
  checked against the catalogue; a mismatch marks the model unavailable rather than
  silently returning wrong products.
* **Ranking cost.** `np.argpartition` selects the top-N in O(n) instead of sorting
  51k scores per request.
* **FastText model size.** The hash-bucket count is set to 200,000 (gensim's default
  is 2,000,000). At this vocabulary size that costs nothing measurable in quality and
  saves roughly 700 MB per saved model.
* **Known limitation.** One catalogue row has empty text and therefore a zero vector;
  it can never be recommended. Cosine is undefined at zero magnitude, so the engine
  returns all-zero scores rather than `NaN`.
* **Scaling beyond this catalogue.** Exact cosine over 51k rows is 2–10 ms. Past a
  few million products the right move is an ANN index (FAISS / HNSW) behind the same
  `score_by_*` interface — no other layer changes.

---

## 7. Credits

Public libraries used: scikit-learn (TF-IDF), gensim (Word2Vec, FastText),
NumPy/SciPy (vector maths), FastAPI + Uvicorn, React, Vite, Tailwind CSS, Recharts,
lucide-react. No pre-trained external embeddings — both dense models are trained
from scratch on this catalogue.
