"""Text normalisation shared by training and inference.

This module is deliberately the *only* place where product text is cleaned.
The exact same function is used when artifacts are built and when a live query
arrives, which guarantees a query is represented the way the catalogue was.
"""

from __future__ import annotations

import re

_NON_ALPHANUMERIC = re.compile(r"[^a-z0-9\s]")
_MULTI_SPACE = re.compile(r"\s+")

TEXT_COLUMNS: tuple[str, ...] = ("Name", "Main Category", "Subcategory")


def clean_text(text: object) -> str:
    """Lowercase, strip punctuation, collapse whitespace.

    >>> clean_text("Sony WH-1000XM5  (Wireless!)")
    'sony wh 1000xm5 wireless'
    """
    if text is None:
        return ""

    value = str(text).lower()
    value = _NON_ALPHANUMERIC.sub(" ", value)
    value = _MULTI_SPACE.sub(" ", value)
    return value.strip()


def build_combined_text(name: object, main_category: object = "", subcategory: object = "") -> str:
    """Concatenate the three catalogue text fields into one document.

    Mirrors the `Name + Main Category + Subcategory` combination used during
    training.  Empty fields are dropped so short-text products stay clean.
    """
    parts = [clean_text(name), clean_text(main_category), clean_text(subcategory)]
    return " ".join(part for part in parts if part).strip()


def tokenize(text: str) -> list[str]:
    """Whitespace tokenisation of already-cleaned text."""
    return clean_text(text).split()
