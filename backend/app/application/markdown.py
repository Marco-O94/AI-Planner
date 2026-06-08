"""Tiny markdown helpers used for artifact phase parsing."""

import re

_HEADING = re.compile(r"^(#{1,3})\s+(.*\S)\s*$", re.MULTILINE)


def parse_phase_titles(content: str) -> list[str]:
    """Extract phase titles from markdown headings.

    Level-2 (``##``) headings are treated as phases; if a document has none,
    fall back to level-1 (``#``) headings. Returns titles in document order.
    """
    headings = [(len(hashes), title.strip()) for hashes, title in _HEADING.findall(content)]
    level_two = [title for level, title in headings if level == 2]
    if level_two:
        return level_two
    return [title for level, title in headings if level == 1]
