"""FastEmbed wrapper (CPU). Loaded once per process via a cached singleton."""

from __future__ import annotations

from functools import lru_cache

from fastembed import TextEmbedding

from app.config import settings


class Embeddings:
    def __init__(self, model_name: str) -> None:
        self._model = TextEmbedding(model_name=model_name)
        self._dimension: int | None = None

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        return [[float(x) for x in vector] for vector in self._model.embed(texts)]

    def embed_query(self, text: str) -> list[float]:
        return self.embed_texts([text])[0]

    @property
    def dimension(self) -> int:
        if self._dimension is None:
            self._dimension = len(self.embed_query("dimension probe"))
        return self._dimension


@lru_cache
def get_embeddings() -> Embeddings:
    return Embeddings(settings.embedding_model)
