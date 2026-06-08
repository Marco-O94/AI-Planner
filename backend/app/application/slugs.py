"""Slug generation with collision handling."""

from collections.abc import Callable

from slugify import slugify


def make_unique_slug(base: str, exists: Callable[[str], bool]) -> str:
    """Slugify ``base`` and append ``-2``, ``-3``... until ``exists`` is False."""
    root = slugify(base) or "item"
    candidate = root
    suffix = 2
    while exists(candidate):
        candidate = f"{root}-{suffix}"
        suffix += 1
    return candidate
