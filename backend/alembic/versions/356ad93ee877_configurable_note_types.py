"""configurable note types

Revision ID: 356ad93ee877
Revises: 2a71b265792c
Create Date: 2026-06-09 08:59:26.566575

"""
import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ENUM as PgEnum


# revision identifiers, used by Alembic.
revision: str = '356ad93ee877'
down_revision: Union[str, Sequence[str], None] = '2a71b265792c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Self-contained seed snapshot; keep in sync with app.domain.enums.NOTE_TYPE_DEFAULTS
_DEFAULTS = (
    ("REQUIREMENT", "Requirement", "requirement", "violet"),
    ("CONSTRAINT", "Constraint", "constraint", "red"),
    ("DECISION", "Decision", "decision", "green"),
    ("QUESTION", "Question", "question", "amber"),
    ("SNIPPET", "Snippet", "snippet", "blue"),
    ("REFERENCE", "Reference", "reference", "slate"),
)


def upgrade() -> None:
    # 1. note_types table
    op.create_table(
        "note_types",
        sa.Column(
            "id",
            sa.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "scope",
            PgEnum("GLOBAL", "PROJECT", name="scope_kind", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "project_id",
            sa.UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("key", sa.String(), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("color", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_default", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "(scope = 'GLOBAL' AND project_id IS NULL) OR "
            "(scope = 'PROJECT' AND project_id IS NOT NULL)",
            name="ck_note_types_scope_project",
        ),
    )
    op.create_index(
        "uq_note_types_global_slug", "note_types", ["slug"],
        unique=True, postgresql_where=sa.text("project_id IS NULL"),
    )
    op.create_index(
        "uq_note_types_project_slug", "note_types", ["project_id", "slug"],
        unique=True, postgresql_where=sa.text("project_id IS NOT NULL"),
    )

    # 2. seed the 6 GLOBAL defaults
    rows = ", ".join(
        f"('{uuid.uuid4()}', 'GLOBAL'::scope_kind, '{key}', '{name}', '{slug}', '{color}', true)"
        for key, name, slug, color in _DEFAULTS
    )
    op.execute(
        f"INSERT INTO note_types (id, scope, key, name, slug, color, is_default) VALUES {rows}"
    )

    # 3. add nullable note_type_id
    op.add_column("notes", sa.Column("note_type_id", sa.UUID(as_uuid=True), nullable=True))

    # 4. backfill from the old enum value (matches default key)
    op.execute(
        """
        UPDATE notes
        SET note_type_id = nt.id
        FROM note_types nt
        WHERE nt.scope = 'GLOBAL' AND nt.key = notes.type::text
        """
    )

    # 5. enforce NOT NULL + FK (RESTRICT)
    op.alter_column("notes", "note_type_id", nullable=False)
    op.create_foreign_key(
        "fk_notes_note_type_id", "notes", "note_types",
        ["note_type_id"], ["id"], ondelete="RESTRICT",
    )

    # 6. drop old column + enum type
    op.drop_column("notes", "type")
    op.execute("DROP TYPE note_type")


def downgrade() -> None:
    note_type_enum = sa.Enum(
        "REQUIREMENT", "CONSTRAINT", "DECISION", "QUESTION", "SNIPPET", "REFERENCE",
        name="note_type",
    )
    note_type_enum.create(op.get_bind(), checkfirst=True)
    op.add_column("notes", sa.Column("type", note_type_enum, nullable=True))
    op.execute(
        """
        UPDATE notes
        SET type = nt.key::note_type
        FROM note_types nt
        WHERE nt.id = notes.note_type_id
        """
    )
    op.alter_column("notes", "type", nullable=False)
    op.drop_constraint("fk_notes_note_type_id", "notes", type_="foreignkey")
    op.drop_column("notes", "note_type_id")
    op.drop_index(
        "uq_note_types_project_slug",
        table_name="note_types",
        postgresql_where=sa.text("project_id IS NOT NULL"),
    )
    op.drop_index(
        "uq_note_types_global_slug",
        table_name="note_types",
        postgresql_where=sa.text("project_id IS NULL"),
    )
    op.drop_table("note_types")
