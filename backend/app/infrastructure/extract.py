"""Text extraction from uploaded document bytes (pdf / docx / plain)."""

from __future__ import annotations

import io


def extract_text(filename: str, mime_type: str, data: bytes) -> str:
    name = filename.lower()
    hint = f"{name} {mime_type}".lower()
    if name.endswith(".pdf") or "pdf" in hint:
        return _extract_pdf(data)
    if name.endswith(".docx") or "officedocument.wordprocessing" in hint or "msword" in hint:
        return _extract_docx(data)
    # Markdown / plain text / unknown: best-effort decode.
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("latin-1", errors="ignore")


def _extract_pdf(data: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    return "\n".join((page.extract_text() or "") for page in reader.pages).strip()


def _extract_docx(data: bytes) -> str:
    import docx

    document = docx.Document(io.BytesIO(data))
    return "\n".join(paragraph.text for paragraph in document.paragraphs).strip()
