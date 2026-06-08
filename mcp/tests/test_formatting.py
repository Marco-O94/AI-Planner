"""Pure markdown-assembly tests — no client involved."""

from project_notes_mcp.formatting import (
    order_tasks_by_dependency,
    render_generation_bundle,
    render_project_context,
)

_DOMAIN = {
    "id": "d1", "name": "Billing", "slug": "billing",
    "ubiquitous_language": {"Invoice": "A request for payment"},
}
_PROJECT = {"name": "Acme", "slug": "acme", "status": "ACTIVE",
            "description": "Demo.", "technologies": [{"name": "Python"}]}


def _task(tid, deps, status="TODO", priority="MEDIUM"):
    return {"id": tid, "title": tid, "depends_on": deps, "status": status,
            "priority": priority, "blocked": False, "domain_id": None}


def test_dependency_order_places_prerequisites_first():
    tasks = [_task("a", ["b"]), _task("b", []), _task("c", ["a"])]

    ordered = [t["id"] for t in order_tasks_by_dependency(tasks)]

    assert ordered.index("b") < ordered.index("a") < ordered.index("c")


def test_dependency_order_breaks_ties_by_priority():
    tasks = [_task("low", [], priority="LOW"), _task("high", [], priority="HIGH")]

    ordered = [t["id"] for t in order_tasks_by_dependency(tasks)]

    assert ordered == ["high", "low"]


def test_dependency_order_tolerates_cycles_without_dropping_tasks():
    tasks = [_task("a", ["b"]), _task("b", ["a"])]

    ordered = order_tasks_by_dependency(tasks)

    assert {t["id"] for t in ordered} == {"a", "b"}


def test_dependency_order_ignores_out_of_set_dependencies():
    tasks = [_task("a", ["external-id"])]

    ordered = order_tasks_by_dependency(tasks)

    assert [t["id"] for t in ordered] == ["a"]


def test_project_context_has_all_sections_and_ubiquitous_language():
    notes = [{"id": "n1", "domain_id": "d1", "type": "REQUIREMENT",
              "title": "Charge monthly", "content": "Bill on the 1st.", "tags": ["mvp"]}]
    tasks = [_task("t-a", ["t-b"]), _task("t-b", [])]
    docs = [{"id": "doc1", "title": "Pricing", "filename": "p.pdf", "mime_type": "application/pdf"}]
    skills = [{"name": "Billing Rules", "slug": "billing-rules",
               "description": "How we bill.", "content": "Prorate."}]

    md = render_project_context(
        project=_PROJECT, domains=[_DOMAIN], notes=notes, tasks=tasks,
        documents=docs, skills=skills,
    )

    assert "# Project context: Acme" in md
    assert "## Notes" in md and "## Tasks" in md
    assert "## Documents" in md and "## Applicable skills" in md
    assert "Ubiquitous language" in md and "| Invoice |" in md
    assert "Charge monthly" in md
    # t-b (prerequisite) appears before t-a in the rendered tasks
    assert md.index("t-b") < md.index("t-a")


def test_project_context_renders_untitled_note_without_literal_none():
    notes = [{"id": "n1", "domain_id": None, "type": "SNIPPET",
              "title": None, "content": "orphan snippet", "tags": []}]

    md = render_project_context(
        project=_PROJECT, domains=[], notes=notes, tasks=[],
        documents=[], skills=[],
    )

    assert "**None**" not in md
    assert "(untitled note)" in md


def test_project_context_scopes_to_a_domain():
    notes = [
        {"id": "n1", "domain_id": "d1", "type": "REQUIREMENT",
         "title": "InDomain", "content": "", "tags": []},
        {"id": "n2", "domain_id": None, "type": "DECISION",
         "title": "OutOfDomain", "content": "", "tags": []},
    ]

    md = render_project_context(
        project=_PROJECT, domains=[_DOMAIN], notes=notes, tasks=[],
        documents=[], skills=[], domain_slug="billing",
    )

    assert "InDomain" in md
    assert "OutOfDomain" not in md


def test_generation_bundle_leads_with_instructions_and_manifest():
    artifact_type = {
        "name": "Development Plan", "slug": "development-plan",
        "instructions": "Produce a phased plan.",
        "output_files": [{"path": "PLAN.md", "note": "The main plan"}],
    }

    md = render_generation_bundle(
        project=_PROJECT, artifact_type=artifact_type, domains=[_DOMAIN],
        notes=[], tasks=[], documents=[], skills=[],
    )

    assert "# Generate: Development Plan" in md
    assert "## Instructions" in md
    assert "Produce a phased plan." in md
    assert "`PLAN.md`" in md
    # Instructions/manifest precede the context section.
    assert md.index("## Instructions") < md.index("## Context")
