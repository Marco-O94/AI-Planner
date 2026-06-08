"""Phase 1: the migrated schema matches the plan (§1).

Verifies all 15 tables, FK cascade rules, the circular artifact FK, full-text
GIN indexes / generated tsvector columns, the scope CHECK constraints, the
partial unique indexes, and the seed data.
"""

import pytest
from sqlalchemy import Connection, Engine, inspect, text
from sqlalchemy.exc import IntegrityError

# confdeltype codes in pg_constraint: a=NO ACTION, r=RESTRICT, c=CASCADE, n=SET NULL
CASCADE = "c"
SET_NULL = "n"
RESTRICT = "r"

EXPECTED_TABLES = {
    "technologies",
    "projects",
    "project_technologies",
    "domains",
    "notes",
    "tasks",
    "artifact_types",
    "artifacts",
    "artifact_versions",
    "artifact_files",
    "artifact_phases",
    "skills",
    "project_skills",
    "documents",
    "project_templates",
}


def _fk_delete_rules(conn: Connection, table: str) -> dict[str, str]:
    rows = conn.execute(
        text(
            "SELECT confrelid::regclass::text AS ref, confdeltype "
            "FROM pg_constraint WHERE conrelid = to_regclass(:t) AND contype = 'f'"
        ),
        {"t": table},
    ).all()
    return {ref.split(".")[-1]: deltype for ref, deltype in rows}


def test_all_15_tables_exist(engine: Engine) -> None:
    tables = set(inspect(engine).get_table_names())
    assert EXPECTED_TABLES <= tables, f"missing: {EXPECTED_TABLES - tables}"


def test_project_delete_cascades_to_children(conn: Connection) -> None:
    for child in ("notes", "tasks", "domains", "artifacts", "documents", "skills"):
        assert _fk_delete_rules(conn, child)["projects"] == CASCADE, child


def test_domain_delete_sets_null_on_items(conn: Connection) -> None:
    for child in ("notes", "tasks", "artifacts", "documents"):
        assert _fk_delete_rules(conn, child)["domains"] == SET_NULL, child


def test_artifact_references_type_with_restrict(conn: Connection) -> None:
    assert _fk_delete_rules(conn, "artifacts")["artifact_types"] == RESTRICT


def test_circular_current_version_fk_exists(conn: Connection) -> None:
    present = conn.execute(
        text(
            "SELECT EXISTS(SELECT 1 FROM pg_constraint "
            "WHERE conname = 'fk_artifacts_current_version')"
        )
    ).scalar()
    assert present is True


def test_generated_tsvector_columns(conn: Connection) -> None:
    cols = set(
        conn.execute(
            text(
                "SELECT table_name || '.' || column_name FROM information_schema.columns "
                "WHERE data_type = 'tsvector'"
            )
        ).scalars()
    )
    assert cols == {
        "notes.search_tsv",
        "documents.search_tsv",
        "artifact_files.search_tsv",
    }


def test_fulltext_columns_are_gin_indexed(conn: Connection) -> None:
    for table in ("notes", "documents", "artifact_files"):
        is_gin = conn.execute(
            text(
                "SELECT EXISTS (SELECT 1 FROM pg_indexes i "
                "JOIN pg_class c ON c.relname = i.indexname "
                "JOIN pg_am am ON am.oid = c.relam "
                "WHERE am.amname = 'gin' AND i.tablename = :t "
                "AND i.indexdef LIKE '%search_tsv%')"
            ),
            {"t": table},
        ).scalar()
        assert is_gin is True, f"{table}.search_tsv not GIN-indexed"


def test_array_columns_are_gin_indexed(conn: Connection) -> None:
    # tasks.depends_on and tags arrays must be GIN-indexed for containment queries.
    total_gin = conn.execute(
        text(
            "SELECT count(*) FROM pg_indexes i "
            "JOIN pg_class c ON c.relname = i.indexname "
            "JOIN pg_am am ON am.oid = c.relam "
            "WHERE am.amname = 'gin' AND i.schemaname = 'public'"
        )
    ).scalar()
    # 3 tsvector + tags(notes, tasks, documents, skills) + depends_on + source_note/task = 10
    assert total_gin >= 10


def test_seed_technologies_present(conn: Connection) -> None:
    count = conn.execute(text("SELECT count(*) FROM technologies")).scalar()
    assert count >= 30
    kinds = set(conn.execute(text("SELECT DISTINCT kind FROM technologies")).scalars())
    assert kinds == {"LANGUAGE", "FRAMEWORK", "DATABASE", "TOOL"}


def test_seed_default_artifact_type(conn: Connection) -> None:
    row = conn.execute(
        text(
            "SELECT scope, is_default, project_id, output_files "
            "FROM artifact_types WHERE slug = 'development-plan'"
        )
    ).one()
    assert row.scope == "GLOBAL"
    assert row.is_default is True
    assert row.project_id is None
    assert isinstance(row.output_files, list) and len(row.output_files) >= 1


def test_scope_check_rejects_global_with_project(engine: Engine) -> None:
    with engine.connect() as c:
        outer = c.begin()
        try:
            pid = c.execute(
                text("INSERT INTO projects (name, slug) VALUES ('chk', 'chk-proj') RETURNING id")
            ).scalar()
            sp = c.begin_nested()
            with pytest.raises(IntegrityError):
                c.execute(
                    text(
                        "INSERT INTO artifact_types (scope, project_id, name, slug, instructions) "
                        "VALUES ('GLOBAL', :pid, 'Bad', 'bad-global', 'x')"
                    ),
                    {"pid": pid},
                )
            sp.rollback()
        finally:
            outer.rollback()


def test_scope_check_rejects_project_without_project_id(engine: Engine) -> None:
    with engine.connect() as c:
        sp = c.begin()
        with pytest.raises(IntegrityError):
            c.execute(
                text(
                    "INSERT INTO skills (scope, project_id, name, slug, description, content) "
                    "VALUES ('PROJECT', NULL, 'Bad', 'bad-proj', 'd', 'c')"
                )
            )
        sp.rollback()


def test_global_artifact_type_slug_is_unique(engine: Engine) -> None:
    # The partial unique index forbids a second GLOBAL type with the same slug.
    with engine.connect() as c:
        sp = c.begin()
        with pytest.raises(IntegrityError):
            c.execute(
                text(
                    "INSERT INTO artifact_types (scope, project_id, name, slug, instructions) "
                    "VALUES ('GLOBAL', NULL, 'Dup', 'development-plan', 'x')"
                )
            )
        sp.rollback()
