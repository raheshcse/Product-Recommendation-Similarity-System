"""Rebuild every model artifact from the prepared catalogue.

Run once before starting the API:

    python scripts/build_artifacts.py

Options:
    --limit 5000        train on a subset (fast smoke test)
    --skip tfidf        skip one or more representations
    --artifacts-dir DIR write somewhere other than ./artifacts

The hyper-parameters mirror the Colab notebook exactly, with one deliberate
change: the FastText hash-bucket count is reduced (see core/config.py) so the
saved model is a few hundred MB smaller with no measurable quality loss on a
catalogue of this size.
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import get_settings  # noqa: E402
from app.core.logging import get_logger  # noqa: E402
from app.services.text_processing import build_combined_text  # noqa: E402

logger = get_logger("build_artifacts")


# ----------------------------------------------------------------------
def load_corpus(csv_path: Path, limit: int | None) -> pd.DataFrame:
    if not csv_path.exists():
        raise SystemExit(f"Prepared catalogue not found: {csv_path}")

    df = pd.read_csv(csv_path)
    required = ["Name", "Main Category", "Subcategory"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise SystemExit(f"Catalogue is missing required columns: {missing}")

    if limit:
        df = df.head(limit).copy()

    for column in required:
        df[column] = df[column].fillna("").astype(str)

    df["combined_text"] = [
        build_combined_text(n, m, s)
        for n, m, s in zip(df["Name"], df["Main Category"], df["Subcategory"])
    ]

    empty = int((df["combined_text"].str.strip() == "").sum())
    logger.info("Corpus: %s products (%s with empty text)", len(df), empty)
    return df


# ----------------------------------------------------------------------
def build_tfidf(df: pd.DataFrame, out_dir: Path, settings) -> None:
    import joblib
    from scipy import sparse
    from sklearn.feature_extraction.text import TfidfVectorizer

    logger.info("Building TF-IDF ...")
    vectorizer = TfidfVectorizer(
        lowercase=True,
        stop_words="english",
        ngram_range=(settings.tfidf_ngram_min, settings.tfidf_ngram_max),
        min_df=settings.tfidf_min_df,
    )
    matrix = vectorizer.fit_transform(df["combined_text"])

    joblib.dump(vectorizer, out_dir / "tfidf_vectorizer.joblib")
    sparse.save_npz(out_dir / "tfidf_matrix.npz", matrix)

    density = matrix.nnz / float(matrix.shape[0] * matrix.shape[1])
    logger.info(
        "TF-IDF done: %s x %s, %.4f%% sparse",
        matrix.shape[0],
        matrix.shape[1],
        (1 - density) * 100,
    )


def _mean_pool(sentences: list[list[str]], model, allow_subword: bool) -> np.ndarray:
    dim = int(model.vector_size)
    out = np.zeros((len(sentences), dim), dtype=np.float32)

    for row, tokens in enumerate(sentences):
        vectors = []
        for token in tokens:
            if allow_subword:
                try:
                    vectors.append(model.wv[token])
                except KeyError:
                    continue
            elif token in model.wv:
                vectors.append(model.wv[token])
        if vectors:
            out[row] = np.mean(vectors, axis=0)

    zero_rows = int(np.count_nonzero(~out.any(axis=1)))
    logger.info("Product vectors: %s x %s (%s zero vectors)", out.shape[0], out.shape[1], zero_rows)
    return out


def build_word2vec(df: pd.DataFrame, out_dir: Path, settings) -> None:
    from gensim.models import Word2Vec

    logger.info("Training Word2Vec ...")
    sentences = [text.split() for text in df["combined_text"]]

    model = Word2Vec(
        sentences=sentences,
        vector_size=settings.embedding_dim,
        window=settings.embedding_window,
        min_count=settings.embedding_min_count,
        workers=settings.embedding_workers,
        sg=1,
        epochs=settings.embedding_epochs,
        seed=settings.embedding_seed,
    )
    model.save(str(out_dir / "acme_word2vec.model"))
    np.save(out_dir / "product_word2vec_vectors.npy", _mean_pool(sentences, model, False))
    logger.info("Word2Vec done: vocabulary %s", len(model.wv))


def build_fasttext(df: pd.DataFrame, out_dir: Path, settings) -> None:
    from gensim.models import FastText

    logger.info("Training FastText ...")
    sentences = [text.split() for text in df["combined_text"]]

    model = FastText(
        sentences=sentences,
        vector_size=settings.embedding_dim,
        window=settings.embedding_window,
        min_count=settings.embedding_min_count,
        workers=settings.embedding_workers,
        sg=1,
        epochs=settings.embedding_epochs,
        min_n=settings.fasttext_min_n,
        max_n=settings.fasttext_max_n,
        bucket=settings.fasttext_buckets,
        seed=settings.embedding_seed,
    )
    model.save(str(out_dir / "acme_fasttext.model"))
    np.save(out_dir / "product_fasttext_vectors.npy", _mean_pool(sentences, model, True))
    logger.info("FastText done: vocabulary %s", len(model.wv))


# ----------------------------------------------------------------------
def main() -> None:
    settings = get_settings()

    parser = argparse.ArgumentParser(description="Build recommendation model artifacts.")
    parser.add_argument("--dataset", type=Path, default=settings.prepared_dataset_path)
    parser.add_argument("--artifacts-dir", type=Path, default=settings.artifacts_dir)
    parser.add_argument("--limit", type=int, default=None, help="Only use the first N products.")
    parser.add_argument(
        "--skip",
        nargs="*",
        default=[],
        choices=["tfidf", "word2vec", "fasttext"],
        help="Representations to skip.",
    )
    args = parser.parse_args()

    out_dir: Path = args.artifacts_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    started = time.perf_counter()
    df = load_corpus(args.dataset, args.limit)

    builders = {
        "tfidf": build_tfidf,
        "word2vec": build_word2vec,
        "fasttext": build_fasttext,
    }
    for key, builder in builders.items():
        if key in args.skip:
            logger.info("Skipping %s", key)
            continue
        builder(df, out_dir, settings)

    # Metadata is shared by every representation - one file, one source of truth.
    metadata_path = out_dir / "product_metadata.csv"
    df[["Name", "Main Category", "Subcategory", "combined_text"]].to_csv(metadata_path, index=False)

    logger.info("=" * 62)
    logger.info("Artifacts written to %s in %.1fs", out_dir, time.perf_counter() - started)
    for path in sorted(out_dir.iterdir()):
        if path.is_file():
            logger.info("  %-42s %8.2f MB", path.name, path.stat().st_size / 1e6)


if __name__ == "__main__":
    main()
