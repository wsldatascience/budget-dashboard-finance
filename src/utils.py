"""
Shared utilities — imported by pipeline, mart, and generator modules.
"""
from __future__ import annotations

import hashlib
from pathlib import Path


def compute_variance_pct(realizado: float, orcado: float) -> float | None:
    """
    Return (realizado - orcado) / abs(orcado) * 100, rounded to 2 decimals.
    Returns None when orcado == 0 (division undefined — caller decides display).
    """
    if orcado == 0:
        return None
    return round((realizado - orcado) / abs(orcado) * 100, 2)


def file_sha256(path: str | Path, length: int = 16) -> str:
    """Return the first `length` hex chars of the SHA-256 of the file."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()[:length]
