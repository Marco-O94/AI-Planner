"""Tool logic against the fake backend (conftest)."""

import pytest

from project_notes_mcp import tools
from project_notes_mcp.client import BackendClient
from tests.conftest import PROJECT_SLUG, FakeBackend


def test_list_projects_projects_tech_stack(client: BackendClient):
    projects = tools.list_projects(client)

    assert projects[0]["slug"] == PROJECT_SLUG
    assert projects[0]["tech_stack"] == ["Python", "FastAPI"]


def test_get_project_context_assembles_markdown(client: BackendClient):
    md = tools.get_project_context(client, PROJECT_SLUG)

    assert "# Project context: Acme" in md
    assert "Charge monthly" in md  # a note
    assert "Design invoice schema" in md  # a task
    assert "Pricing PDF" in md  # a document
    assert "Billing Rules" in md  # a skill
    # prerequisite task ordered before its dependent
    assert md.index("Design invoice schema") < md.index("Build invoice UI")


def test_get_project_context_scoped_to_domain_excludes_general(client: BackendClient):
    md = tools.get_project_context(client, PROJECT_SLUG, domain_slug="billing")

    assert "Charge monthly" in md  # billing note
    assert "Use Stripe" not in md  # general (no-domain) note excluded


def test_list_artifact_types_includes_manifest(client: BackendClient):
    types = tools.list_artifact_types(client, PROJECT_SLUG)

    dev_plan = next(t for t in types if t["slug"] == "development-plan")
    assert dev_plan["is_default"] is True
    assert dev_plan["output_files"] == [{"path": "PLAN.md", "note": "The main plan"}]


def test_get_artifact_type_resolves_by_slug(client: BackendClient):
    artifact_type = tools.get_artifact_type(client, "development-plan", PROJECT_SLUG)

    assert artifact_type["instructions"] == "Produce a phased plan."


def test_get_artifact_type_unknown_slug_raises(client: BackendClient):
    with pytest.raises(ValueError, match="not found"):
        tools.get_artifact_type(client, "nope", PROJECT_SLUG)


def test_list_tasks_filter_passes_through(client: BackendClient):
    done = tools.list_tasks(client, PROJECT_SLUG, status="DONE")

    assert [t["id"] for t in done] == ["t-c"]


def test_get_skill_returns_body_resolving_project_first(client: BackendClient):
    body = tools.get_skill(client, "billing-rules", PROJECT_SLUG)

    assert "Always prorate." in body


def test_get_skill_falls_back_to_global(client: BackendClient):
    body = tools.get_skill(client, "clean-code", PROJECT_SLUG)

    assert "KISS." in body


def test_get_skill_unknown_raises(client: BackendClient):
    with pytest.raises(ValueError, match="not found"):
        tools.get_skill(client, "ghost", PROJECT_SLUG)


def test_search_knowledge_returns_hits(client: BackendClient):
    hits = tools.search_knowledge(client, "invoice", project_slug=PROJECT_SLUG)

    assert hits[0]["kind"] == "note"
    assert "1st" in hits[0]["snippet"]


def test_prepare_generation_complete_build(client: BackendClient):
    md = tools.prepare_generation(client, PROJECT_SLUG, "development-plan")

    assert "# Generate: Development Plan" in md
    assert "Produce a phased plan." in md
    assert "`PLAN.md`" in md
    assert "Charge monthly" in md  # full context included


def test_prepare_generation_focused_uses_only_given_ids(client: BackendClient):
    md = tools.prepare_generation(
        client, PROJECT_SLUG, "development-plan", note_ids=["n2"]
    )

    assert "focused" in md
    assert "Use Stripe" in md  # n2
    assert "Charge monthly" not in md  # n1 not requested


def test_save_artifact_resolves_domain_slug_to_id(client: BackendClient, fake_backend: FakeBackend):
    result = tools.save_artifact(
        client, PROJECT_SLUG, "development-plan", "Acme Plan",
        files=[{"path": "PLAN.md", "content": "# Plan"}],
        domain_slug="billing",
        source_note_ids=["n1"],
    )

    assert result["coverage"]["is_complete"] is True
    path, body = fake_backend.posts[-1]
    assert path == f"/projects/{PROJECT_SLUG}/artifacts"
    assert body["domain_id"] == "d1"  # slug resolved to id
    assert body["artifact_type_slug"] == "development-plan"
    assert body["files"] == [{"path": "PLAN.md", "content": "# Plan", "note": None}]
    assert body["source_note_ids"] == ["n1"]


def test_save_artifact_unknown_domain_raises(client: BackendClient):
    with pytest.raises(ValueError, match="domain"):
        tools.save_artifact(
            client, PROJECT_SLUG, "development-plan", "X",
            files=[{"path": "a.md", "content": "x"}], domain_slug="ghost",
        )


def test_update_phase_status_patches_backend(client: BackendClient, fake_backend: FakeBackend):
    result = tools.update_phase_status(client, "a1", "ph1", "DONE", note="shipped")

    assert result["status"] == "DONE"
    path, body = fake_backend.patches[-1]
    assert path == "/artifacts/a1/phases/ph1"
    assert body == {"status": "DONE", "note": "shipped"}
