"""Pluggable file storage. Local-disk implementation for now."""

from __future__ import annotations

import pathlib
import uuid
from functools import lru_cache
from typing import Protocol

from app.config import settings


class StorageBackend(Protocol):
    def save(self, filename: str, data: bytes) -> str: ...
    def read(self, storage_path: str) -> bytes: ...
    def delete(self, storage_path: str) -> None: ...


class LocalStorage:
    def __init__(self, base_dir: str) -> None:
        self._base = pathlib.Path(base_dir)
        self._base.mkdir(parents=True, exist_ok=True)

    def save(self, filename: str, data: bytes) -> str:
        key = f"{uuid.uuid4().hex}_{pathlib.Path(filename).name}"
        (self._base / key).write_bytes(data)
        return key

    def read(self, storage_path: str) -> bytes:
        return (self._base / storage_path).read_bytes()

    def delete(self, storage_path: str) -> None:
        target = self._base / storage_path
        if target.exists():
            target.unlink()


@lru_cache
def get_storage() -> LocalStorage:
    return LocalStorage(settings.storage_dir)
