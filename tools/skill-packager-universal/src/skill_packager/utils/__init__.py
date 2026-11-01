"""Utility functions."""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any


def compute_sha256(file_path: Path) -> str:
    """Compute SHA-256 hash of a file."""
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return f"sha256:{h.hexdigest()}"


def compute_fingerprint(content: str) -> str:
    """Compute keccak256-like fingerprint (using SHA-256 as fallback)."""
    return "0x" + hashlib.sha256(content.encode("utf-8")).hexdigest()[:40]


def ensure_directory(path: Path) -> None:
    """Ensure directory exists."""
    path.mkdir(parents=True, exist_ok=True)


def write_json(data: Any, path: Path) -> None:
    """Write data as JSON file."""
    import json
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def read_json(path: Path) -> Any:
    """Read JSON file."""
    import json
    return json.loads(path.read_text(encoding="utf-8"))
