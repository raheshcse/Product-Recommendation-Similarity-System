"""In-memory product catalogue: lookup, search and summary statistics."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd

from app.core.logging import get_logger
from app.services.text_processing import build_combined_text, clean_text

logger = get_logger(__name__)

REQUIRED_COLUMNS = ("Name", "Main Category", "Subcategory")


class Catalogue:
    """Loads the prepared product catalogue and answers metadata questions."""

    def __init__(self, csv_path: Path) -> None:
        self.csv_path = Path(csv_path)
        self.df: pd.DataFrame = pd.DataFrame()

    # ------------------------------------------------------------------
    def load(self) -> None:
        if not self.csv_path.exists():
            raise FileNotFoundError(f"Prepared catalogue not found: {self.csv_path}")

        df = pd.read_csv(self.csv_path)

        missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
        if missing:
            raise ValueError(f"Catalogue is missing required columns: {missing}")

        for column in REQUIRED_COLUMNS:
            df[column] = df[column].fillna("").astype(str).map(clean_text)

        df["combined_text"] = [
            build_combined_text(n, m, s)
            for n, m, s in zip(df["Name"], df["Main Category"], df["Subcategory"])
        ]
        df["product_id"] = df.index.astype(int)
        # Lower-cased haystack used by the type-ahead search.
        df["_search_key"] = df["combined_text"]

        self.df = df
        logger.info("Catalogue loaded: %s products from %s", len(df), self.csv_path.name)

    # ------------------------------------------------------------------
    @property
    def size(self) -> int:
        return int(len(self.df))

    def get(self, product_id: int) -> dict[str, Any]:
        if not 0 <= product_id < self.size:
            raise IndexError(f"product_id {product_id} is outside 0..{self.size - 1}")
        row = self.df.iloc[product_id]
        return _row_to_dict(product_id, row)

    def records(self, indices, scores=None) -> list[dict[str, Any]]:
        """Materialise catalogue rows for a list of positional indices."""
        subset = self.df.iloc[list(indices)]
        out: list[dict[str, Any]] = []
        for rank, (idx, row) in enumerate(subset.iterrows(), start=1):
            record = _row_to_dict(int(idx), row)
            record["rank"] = rank
            if scores is not None:
                record["similarity_score"] = round(float(scores[rank - 1]), 6)
            out.append(record)
        return out

    # ------------------------------------------------------------------
    def search(self, query: str, limit: int = 25) -> list[dict[str, Any]]:
        """Simple substring search powering the product picker."""
        needle = clean_text(query)
        if not needle:
            return []

        mask = self.df["_search_key"].str.contains(needle, regex=False, na=False)
        matches = self.df[mask]
        if matches.empty:
            # Fall back to matching every token independently.
            tokens = needle.split()
            mask = pd.Series(True, index=self.df.index)
            for token in tokens:
                mask &= self.df["_search_key"].str.contains(token, regex=False, na=False)
            matches = self.df[mask]

        # Prefer names that start with the query, then shorter names.
        matches = matches.assign(
            _starts=~matches["Name"].str.startswith(needle),
            _length=matches["Name"].str.len(),
        ).sort_values(["_starts", "_length"])

        return [_row_to_dict(int(idx), row) for idx, row in matches.head(limit).iterrows()]

    def sample(self, n: int = 12, seed: int | None = None) -> list[dict[str, Any]]:
        n = min(n, self.size)
        subset = self.df.sample(n=n, random_state=seed)
        return [_row_to_dict(int(idx), row) for idx, row in subset.iterrows()]

    # ------------------------------------------------------------------
    def stats(self) -> dict[str, Any]:
        token_counts = self.df["combined_text"].str.split().str.len()
        main_counts = self.df["Main Category"].value_counts()

        return {
            "total_products": self.size,
            "main_categories": int(self.df["Main Category"].nunique()),
            "subcategories": int(self.df["Subcategory"].nunique()),
            "avg_tokens_per_product": round(float(token_counts.mean()), 2),
            "min_tokens_per_product": int(token_counts.min()),
            "max_tokens_per_product": int(token_counts.max()),
            "unique_tokens": int(
                len(set(self.df["combined_text"].str.cat(sep=" ").split()))
            ),
            "top_categories": [
                {"name": str(name), "count": int(count)}
                for name, count in main_counts.head(10).items()
            ],
        }

    def categories(self) -> list[dict[str, Any]]:
        grouped = (
            self.df.groupby("Main Category")["Subcategory"]
            .agg(["nunique", "count"])
            .sort_values("count", ascending=False)
        )
        return [
            {
                "name": str(name),
                "product_count": int(row["count"]),
                "subcategory_count": int(row["nunique"]),
            }
            for name, row in grouped.iterrows()
        ]


def _row_to_dict(product_id: int, row) -> dict[str, Any]:
    return {
        "product_id": int(product_id),
        "name": str(row["Name"]),
        "main_category": str(row["Main Category"]),
        "subcategory": str(row["Subcategory"]),
        "combined_text": str(row["combined_text"]),
    }
