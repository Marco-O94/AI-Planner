"""Domain enums (pure, no I/O).

Defined here in Phase 1 because the SQLAlchemy models depend on them; the
Phase 2 domain layer reuses these as the single source of truth (DRY).
Each member's value equals its name so the DB representation is stable and
human-readable regardless of how SQLAlchemy serializes the enum.
"""

from enum import StrEnum


class TechnologyKind(StrEnum):
    LANGUAGE = "LANGUAGE"
    FRAMEWORK = "FRAMEWORK"
    DATABASE = "DATABASE"
    TOOL = "TOOL"


class ProjectStatus(StrEnum):
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    ARCHIVED = "ARCHIVED"


class NoteType(StrEnum):
    REQUIREMENT = "REQUIREMENT"
    CONSTRAINT = "CONSTRAINT"
    DECISION = "DECISION"
    QUESTION = "QUESTION"
    SNIPPET = "SNIPPET"
    REFERENCE = "REFERENCE"


# Allowed badge tones for a note type's color (mirrors the frontend palette).
NOTE_TYPE_COLORS: frozenset[str] = frozenset(
    {"violet", "blue", "green", "amber", "red", "slate", "neutral"}
)

# Built-in note types seeded as GLOBAL defaults: key -> (label, slug, color).
NOTE_TYPE_DEFAULTS: tuple[tuple[str, str, str, str], ...] = (
    ("REQUIREMENT", "Requirement", "requirement", "violet"),
    ("CONSTRAINT", "Constraint", "constraint", "red"),
    ("DECISION", "Decision", "decision", "green"),
    ("QUESTION", "Question", "question", "amber"),
    ("SNIPPET", "Snippet", "snippet", "blue"),
    ("REFERENCE", "Reference", "reference", "slate"),
)


class TaskStatus(StrEnum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"


class TaskPriority(StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class ScopeKind(StrEnum):
    """Shared GLOBAL/PROJECT scope used by both skills and artifact types."""

    GLOBAL = "GLOBAL"
    PROJECT = "PROJECT"


# The plan names SkillScope explicitly; it is the same GLOBAL/PROJECT bucket.
SkillScope = ScopeKind


class ArtifactStatus(StrEnum):
    DRAFT = "DRAFT"
    APPROVED = "APPROVED"
    ARCHIVED = "ARCHIVED"


class PhaseStatus(StrEnum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"
