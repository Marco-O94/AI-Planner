"""notes ai_processed_at + tasks source_note_id

Revision ID: c1f2a3b4d5e6
Revises: 356ad93ee877
Create Date: 2026-06-09 13:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c1f2a3b4d5e6'
down_revision: Union[str, Sequence[str], None] = '356ad93ee877'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Flag for notes the AI has distilled into tasks (or reviewed): NULL = not done.
    op.add_column(
        "notes",
        sa.Column("ai_processed_at", sa.DateTime(timezone=True), nullable=True),
    )
    # Back-link a task to the note it was distilled from.
    op.add_column(
        "tasks",
        sa.Column(
            "source_note_id",
            sa.UUID(as_uuid=True),
            sa.ForeignKey("notes.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_tasks_source_note_id", "tasks", ["source_note_id"])


def downgrade() -> None:
    op.drop_index("ix_tasks_source_note_id", table_name="tasks")
    op.drop_column("tasks", "source_note_id")
    op.drop_column("notes", "ai_processed_at")
