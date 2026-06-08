"""Split text into embedding-sized chunks (paragraph- then length-based)."""

from __future__ import annotations

import re

_PARAGRAPH = re.compile(r"\n\s*\n")
_MAX_CHARS = 1000


def chunk_text(text: str, *, max_chars: int = _MAX_CHARS) -> list[str]:
    cleaned = (text or "").strip()
    if not cleaned:
        return []
    chunks: list[str] = []
    for paragraph in (p.strip() for p in _PARAGRAPH.split(cleaned) if p.strip()):
        if len(paragraph) <= max_chars:
            chunks.append(paragraph)
        else:
            for start in range(0, len(paragraph), max_chars):
                chunks.append(paragraph[start : start + max_chars])
    return chunks
