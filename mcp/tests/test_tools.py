"""Tool logic against the fake backend (conftest)."""

import httpx
import pytest

from ai_planner_mcp import tools
from ai_planner_mcp.client import BackendClient, BackendError
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


def test_get_skill_short_circuits_on_project_match_without_fetching_global():
    seen: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request.url.path)
        if request.url.path.endswith("/skills"):
            return httpx.Response(200, json=[
                {"slug": "billing-rules", "content": "Always prorate."},
            ])
        return httpx.Response(404, json={"detail": "unexpected"})

    http = httpx.Client(transport=httpx.MockTransport(handler), base_url="http://b.test")
    spy = BackendClient(http_client=http)

    body = tools.get_skill(spy, "billing-rules", PROJECT_SLUG)

    assert "Always prorate." in body
    assert seen == [f"/projects/{PROJECT_SLUG}/skills"]  # global /skills never hit


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


def test_create_note_posts_body_and_returns_created(
    client: BackendClient, fake_backend: FakeBackend
):
    result = tools.create_note(
        client, PROJECT_SLUG, type="DECISION", content="Use Stripe.",
        title="Payments", tags=["mvp"], domain_slug="billing",
    )

    assert result["id"] == "new-note"
    assert result["type"] == "DECISION"
    path, body = fake_backend.posts[-1]
    assert path == f"/projects/{PROJECT_SLUG}/notes"
    assert body["domain_id"] == "d1"  # slug resolved to id
    assert body["type"] == "DECISION"
    assert body["content"] == "Use Stripe."
    assert body["tags"] == ["mvp"]


def test_create_note_drops_unset_optionals(client: BackendClient, fake_backend: FakeBackend):
    tools.create_note(client, PROJECT_SLUG, type="QUESTION", content="Why?")

    _, body = fake_backend.posts[-1]
    # only the two required fields are sent; backend applies its own defaults
    assert body == {"type": "QUESTION", "content": "Why?"}
    assert "domain_id" not in body and "tags" not in body and "title" not in body


def test_create_note_unknown_domain_raises(client: BackendClient):
    with pytest.raises(ValueError, match="domain"):
        tools.create_note(
            client, PROJECT_SLUG, type="DECISION", content="x", domain_slug="ghost",
        )


def test_create_task_posts_body_and_returns_created(
    client: BackendClient, fake_backend: FakeBackend
):
    result = tools.create_task(
        client, PROJECT_SLUG, title="Wire up webhooks",
        description="Stripe events.", status="IN_PROGRESS", priority="HIGH",
        depends_on=["t-b"], tags=["billing"], domain_slug="billing",
    )

    assert result["id"] == "new-task"
    assert result["blocked"] is False
    path, body = fake_backend.posts[-1]
    assert path == f"/projects/{PROJECT_SLUG}/tasks"
    assert body["domain_id"] == "d1"  # slug resolved to id
    assert body["title"] == "Wire up webhooks"
    assert body["status"] == "IN_PROGRESS"
    assert body["priority"] == "HIGH"
    assert body["depends_on"] == ["t-b"]


def test_create_task_minimal_drops_optionals_backend_defaults(
    client: BackendClient, fake_backend: FakeBackend
):
    result = tools.create_task(client, PROJECT_SLUG, title="Just a title")

    _, body = fake_backend.posts[-1]
    assert body == {"title": "Just a title"}  # status/priority defaulted by backend
    assert result["status"] == "TODO"
    assert result["priority"] == "MEDIUM"


def test_create_task_unknown_domain_raises(client: BackendClient):
    with pytest.raises(ValueError, match="domain"):
        tools.create_task(client, PROJECT_SLUG, title="x", domain_slug="ghost")


def test_create_task_explicit_empty_lists_are_sent(
    client: BackendClient, fake_backend: FakeBackend
):
    # Empty lists are NOT None, so they are kept and sent (backend would also default them).
    tools.create_task(client, PROJECT_SLUG, title="x", tags=[], depends_on=[])

    _, body = fake_backend.posts[-1]
    assert body["tags"] == []
    assert body["depends_on"] == []


def test_create_note_invalid_enum_surfaces_backend_error(client: BackendClient):
    with pytest.raises(BackendError) as exc:
        tools.create_note(client, PROJECT_SLUG, type="INVALID", content="x")

    assert exc.value.status_code == 422


def test_create_task_invalid_enum_surfaces_backend_error(client: BackendClient):
    with pytest.raises(BackendError) as exc:
        tools.create_task(client, PROJECT_SLUG, title="x", status="PENDING")

    assert exc.value.status_code == 422


def test_create_note_unknown_project_raises_clear_value_error(client: BackendClient):
    # domain_slug triggers the list_domains lookup, which 404s on a bad project;
    # _resolve_domain_slug turns that into a clear ValueError.
    with pytest.raises(ValueError, match="project 'ghost-project' not found"):
        tools.create_note(
            client, "ghost-project", type="DECISION", content="x", domain_slug="billing",
        )


def test_create_task_unknown_project_raises_clear_value_error(client: BackendClient):
    with pytest.raises(ValueError, match="project 'ghost-project' not found"):
        tools.create_task(
            client, "ghost-project", title="x", domain_slug="billing",
        )


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
