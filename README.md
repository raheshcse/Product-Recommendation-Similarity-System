# Product Recommendation Similarity System

An NLP-based product recommendation and similarity system designed to identify products that are semantically similar based on their **product name, main category, and subcategory**.

The project explores and compares three text representation techniques — **TF-IDF, Word2Vec, and FastText** — and uses **cosine similarity** to measure similarity between products and generate ranked Top-N recommendations.

---

## 📌 Project Overview

Traditional product search systems often rely heavily on exact keyword matching. This can make it difficult to identify products that are related in meaning but do not share exactly the same words.

This project addresses that problem by transforming product text into numerical vector representations and measuring similarity between products in vector space.

The system supports:

- Product-to-product similarity
- Semantic product retrieval
- Top-N similar product recommendations
- Comparison of different text representation techniques
- Handling of product vocabulary variations
- Sparse and dense vector representations
- Cosine similarity-based ranking
- REST API access
- Web-based frontend interaction

---

## 🎯 Objective

The primary objective is to build a product similarity system that can:

> Given a product or product description, identify and rank the most similar products based on their textual representation.

The system focuses on understanding relationships between products rather than relying solely on exact keyword overlap.

---

# ⚡ Quick Start

## 1. Clone the Repository

```bash
git clone https://github.com/raheshcse/Product-Recommendation-Similarity-System.git
cd Product-Recommendation-Similarity-System
```

The main application is contained inside:

```text
acme-recsys/
```

Navigate into the application directory:

```bash
cd acme-recsys
```

---

# 🐍 2. Backend Setup

Navigate to the backend:

```bash
cd backend
```

Create a Python virtual environment:

```bash
python -m venv .venv
```

Activate the environment.

### Windows

```bash
.venv\Scripts\activate
```

### macOS / Linux

```bash
source .venv/bin/activate
```

Install the required dependencies:

```bash
pip install -r requirements.txt
```

---

## 📊 Dataset

The original Acme Retail catalogue contains approximately **70,000 products**.

The dataset is intentionally excluded from the Git repository because of its size and repository management considerations.

The prepared dataset should be placed locally at:

```text
acme-recsys/backend/data/AcmeRetail_Products_Prepared.csv
```

The prepared dataset contains the three fields used by the similarity system:

```text
Name
Main Category
Subcategory
```

---

# 🧠 3. Build Model Artefacts

From:

```text
acme-recsys/backend/
```

run:

```bash
python scripts/build_artifacts.py
```

This builds the three text representations:

```text
TF-IDF
Word2Vec
FastText
```

Generated artefacts are stored in:

```text
acme-recsys/backend/artifacts/
```

The artefacts are generated locally and are excluded from version control.

The full build takes approximately **2 minutes** and produces approximately **150 MB** of model artefacts.

### Smoke Test

For a faster test using a limited number of products:

```bash
python scripts/build_artifacts.py --limit 5000
```

---

# 🚀 4. Start the Backend

From:

```text
acme-recsys/backend/
```

run:

```bash
uvicorn app.main:app --reload --port 8000
```

The backend will be available at:

```text
http://127.0.0.1:8000
```

### API Documentation

```text
http://127.0.0.1:8000/docs
```

### Health Check

```text
http://127.0.0.1:8000/api/health
```

---

# ⚛️ 5. Frontend Setup

Open a new terminal.

Navigate to the frontend:

```bash
cd Product-Recommendation-Similarity-System/acme-recsys/frontend
```

Install the frontend dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend will be available at:

```text
http://localhost:5173
```

---

# 🔄 Running the Complete Application

Once both the backend and frontend are running:

```text
             PRODUCT RECOMMENDATION SYSTEM
                         │
             ┌───────────┴───────────┐
             │                       │
             ▼                       ▼
      React Frontend           FastAPI Backend
      localhost:5173           localhost:8000
             │                       │
             └───────────┬───────────┘
                         │
                         ▼
                Recommendation Engine
                         │
              ┌──────────┼──────────┐
              │          │          │
              ▼          ▼          ▼
           TF-IDF     Word2Vec   FastText
              │          │          │
              └──────────┼──────────┘
                         ▼
                  Cosine Similarity
                         │
                         ▼
                    Ranked Top-N
                         │
                         ▼
                  Similar Products
```

---

# 🧠 System Architecture

The system follows an end-to-end NLP and recommendation pipeline:

```text
Product Catalogue
       │
       ▼
Data Preparation
       │
       ▼
Text Cleaning & Normalisation
       │
       ▼
Product Text Construction
       │
       ├───────────────┬───────────────┐
       ▼               ▼               ▼
    TF-IDF          Word2Vec        FastText
       │               │               │
       └───────────────┼───────────────┘
                       ▼
                Product Vectors
                       │
                       ▼
              Cosine Similarity
                       │
                       ▼
                 Ranking Engine
                       │
                       ▼
                  Top-N Products
                       │
                       ▼
                   REST API
                       │
                       ▼
                 React Frontend
```

---

# 📊 Dataset

The project uses an Acme Retail product catalogue containing approximately **70,000 products**.

The original dataset contains multiple product attributes. For the similarity system, only the following three text attributes are used:

| Field | Description |
|---|---|
| `Name` | Product name |
| `Main Category` | Main product category |
| `Subcategory` | More specific product classification |

These fields are combined to create the textual representation used by the NLP models.

### Example

```text
Name:
Wireless Bluetooth Headphones

Main Category:
Electronics

Subcategory:
Headphones
```

Combined representation:

```text
wireless bluetooth headphones electronics headphones
```

---

# 🧹 Data Preparation

Before generating vector representations, the product data is cleaned and normalised.

The preprocessing pipeline includes:

1. Selecting relevant product attributes
2. Handling missing values
3. Converting text fields to strings
4. Converting text to lowercase
5. Removing special characters
6. Removing unnecessary whitespace
7. Removing duplicate records
8. Combining product attributes into a single text representation
9. Tokenising product text where required

The prepared dataset contains:

```text
Name
Main Category
Subcategory
```

---

# 🔢 Text Representation

Three different approaches are implemented and compared.

## 1. TF-IDF

TF-IDF is used as a traditional lexical baseline.

It represents each product using the importance of its terms within the catalogue.

The implementation uses:

- `TfidfVectorizer`
- Unigrams and bigrams
- English stop-word removal
- Minimum document frequency filtering

TF-IDF produces a **sparse vector representation**.

### Advantages

- Simple and interpretable
- Efficient for lexical matching
- Strong information-retrieval baseline

### Limitations

TF-IDF primarily measures term importance and does not inherently capture semantic relationships between different words.

---

# 🧠 2. Word2Vec

Word2Vec is used to learn dense word representations from the context in which words occur throughout the product catalogue.

The implementation uses the **Skip-Gram architecture**.

Configuration includes:

```text
Vector size: 100
Window size: 5
Minimum word frequency: 2
Skip-Gram: Enabled
Epochs: 10
```

Word-level embeddings are aggregated to create a fixed-size **product-level vector**.

### Pipeline

```text
Product Text
     │
     ▼
Tokenisation
     │
     ▼
Word2Vec Embeddings
     │
     ▼
Vector Aggregation
     │
     ▼
Product Vector
```

---

# 🔤 3. FastText

FastText extends the traditional word embedding approach by incorporating **character-level subword information**.

This is particularly useful for product catalogues containing:

- Spelling variations
- Compound words
- Technical terminology
- Rare words
- Vocabulary variations
- Previously unseen words

Configuration includes:

```text
Vector size: 100
Window size: 5
Minimum word frequency: 2
Skip-Gram: Enabled
Character n-grams: 3–6
Epochs: 10
```

Product-level vectors are created by aggregating the FastText vectors of the words within each product.

FastText's subword representation also allows it to generate useful vectors for words that were not directly observed during training when their character patterns overlap with known vocabulary.

---

# 📐 Cosine Similarity

After converting products into vector representations, **cosine similarity** is used to measure similarity between products.

The recommendation process is:

1. Select a query product
2. Obtain its vector representation
3. Compare it with the vectors of catalogue products
4. Calculate cosine similarity scores
5. Exclude the query product itself
6. Sort products by similarity
7. Return the Top-N most similar products

Conceptually:

```text
Query Product
      │
      ▼
Query Vector
      │
      ▼
Compare Against Catalogue Vectors
      │
      ▼
Cosine Similarity Scores
      │
      ▼
Sort Descending
      │
      ▼
Top-N Similar Products
```

---

# 🧪 Model Testing & Evaluation

The similarity pipeline evaluates all three representations.

Evaluation considerations include:

- Similarity score distribution
- Top-N ranking quality
- Semantic relevance
- Product-category consistency
- Vocabulary variation
- Behaviour across different product types
- Comparison between lexical and dense representations

---

# 🏗️ Project Structure

```text
Product-Recommendation-Similarity-System/
│
├── README.md
├── .gitignore
│
└── acme-recsys/
    │
    ├── backend/
    │   ├── app/
    │   ├── data/
    │   ├── artifacts/
    │   ├── scripts/
    │   │   └── build_artifacts.py
    │   ├── .env.example
    │   └── requirements.txt
    │
    ├── frontend/
    │   ├── src/
    │   ├── package.json
    │   └── ...
    │
    ├── run_dev.bat
    ├── run_dev.sh
    └── .gitignore
```

### Local-only files

The following files are intentionally excluded from Git:

```text
AcmeRetail_Products_70000.csv
AcmeRetail_Products_Prepared.csv
*.model
*.joblib
*.npy
*.npz
*.zip
backend/artifacts/*
```

---

# 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| Python | Machine learning and NLP pipeline |
| Pandas | Data processing |
| NumPy | Numerical computation |
| Scikit-learn | TF-IDF and cosine similarity |
| Gensim | Word2Vec and FastText |
| SciPy | Sparse matrix operations |
| Joblib | Model serialisation |
| FastAPI | Backend REST API |
| Uvicorn | ASGI application server |
| React | Frontend application |
| Vite | Frontend development tooling |
| Node.js / npm | Frontend dependency management |
| Git / GitHub | Version control |

---

# 💾 Model Artefacts

The system generates reusable model artefacts during the build process.

These artefacts are **not committed to the Git repository** because they can be regenerated using:

```bash
python scripts/build_artifacts.py
```

### TF-IDF

```text
tfidf_vectorizer.joblib
tfidf_matrix.npz
product_metadata.csv
```

### Word2Vec

```text
acme_word2vec.model
product_word2vec_vectors.npy
product_metadata_word2vec.csv
```

### FastText

```text
acme_fasttext.model
product_fasttext_vectors.npy
product_metadata_fasttext.csv
```

### Similarity Results

```text
cosine_results_tfidf.csv
cosine_results_word2vec.csv
cosine_results_fasttext.csv
```

---

# ⚖️ Representation Comparison

| Representation | Type | Semantic Information | Subword Information | Primary Role |
|---|---|---:|---:|---|
| TF-IDF | Sparse | Limited | No | Lexical baseline |
| Word2Vec | Dense | Yes | Limited | Word-level semantics |
| FastText | Dense | Yes | Yes | Semantic + subword representation |

The comparison demonstrates the trade-offs between traditional lexical representations and dense embedding-based approaches.

---

# 🔐 Data & Repository Considerations

The original product dataset and generated model artefacts are excluded from version control.

This keeps the Git repository lightweight while allowing the complete processing and model-building pipeline to remain reproducible.

The repository contains:

- Application source code
- NLP processing logic
- Recommendation logic
- API implementation
- Frontend implementation
- Model-building scripts
- Configuration examples
- Documentation

Large datasets and generated model files are maintained locally rather than committed to Git.

---

# 🚀 Future Improvements

Potential improvements towards a production-ready recommendation system include:

- Transformer-based sentence embeddings
- More advanced product-level embedding strategies
- TF-IDF-weighted embedding aggregation
- Approximate nearest-neighbour search
- Vector database integration
- Category-aware recommendation filtering
- Improved offline evaluation metrics
- Recommendation API optimisation
- Caching of frequently requested recommendations
- Recommendation latency benchmarking
- Automated relevance evaluation
- User-facing recommendation analytics

---

# 🎓 Project Context

This project was developed as a practical NLP and information-retrieval system for product similarity and recommendation.

The implementation demonstrates an end-to-end machine learning workflow:

```text
Data
  ↓
Preprocessing
  ↓
Text Representation
  ↓
Embedding Generation
  ↓
Similarity Calculation
  ↓
Ranking
  ↓
Recommendation
  ↓
Evaluation
  ↓
API
  ↓
Frontend
```

The project specifically investigates the difference between **lexical similarity** and **semantic similarity** through TF-IDF, Word2Vec, and FastText representations.

---

# 🎥 Demonstration

The system can be demonstrated through the web interface by:

1. Selecting or entering a product
2. Generating vector representations
3. Calculating similarity against the product catalogue
4. Comparing TF-IDF, Word2Vec, and FastText results
5. Displaying ranked Top-N recommendations
6. Inspecting similarity scores and evaluation results

---

# 👨‍💻 Author

**Rahesh Saravanan**

AI & Full-Stack Engineer | Machine Learning & NLP

GitHub:

https://github.com/raheshcse

---

## 📄 Licence

This project is intended for educational, technical assessment, and demonstration purposes.
