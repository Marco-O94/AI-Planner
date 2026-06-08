"""Phase 3: lexical / semantic / hybrid search, scoping, and file explorer.

These exercise the real FastEmbed model + Qdrant; semantic tests are scoped to a
fresh project so the inserted entity is the only in-scope candidate.
"""

import uuid

from fastapi.testclient import TestClient


def _token(prefix: str) -> str:
    return f"{prefix}{uuid.uuid4().hex[:8]}"


def test_lexical_finds_exact_word_in_note(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    token = _token("Quxxar")
    note = client.post(
        f"/projects/{slug}/notes",
        json={"type": "REQUIREMENT", "content": f"The system must {token} all records."},
    ).json()
    hits = client.get(
        "/search", params={"q": token, "mode": "lexical", "project_slug": slug}
    ).json()
    assert note["id"] in {h["id"] for h in hits}


def test_semantic_finds_by_meaning(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    note = client.post(
        f"/projects/{slug}/notes",
        json={
            "type": "REQUIREMENT",
            "content": "Customers must be able to get their money back after a purchase.",
        },
    ).json()
    hits = client.get(
        "/search",
        params={"q": "refund policy for buyers", "mode": "semantic", "project_slug": slug},
    ).json()
    assert note["id"] in {h["id"] for h in hits}


def test_hybrid_returns_the_item(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    token = _token("Vortis")
    note = client.post(
        f"/projects/{slug}/notes",
        json={"type": "DECISION", "content": f"Adopt {token} for the caching layer."},
    ).json()
    hits = client.get(
        "/search", params={"q": token, "mode": "hybrid", "project_slug": slug}
    ).json()
    assert note["id"] in {h["id"] for h in hits}


def test_search_is_scoped_by_project(client: TestClient, make_project) -> None:
    owner = make_project()["slug"]
    other = make_project()["slug"]
    token = _token("Solune")
    client.post(
        f"/projects/{owner}/notes",
        json={"type": "REQUIREMENT", "content": f"{token} only lives here"},
    )
    in_other = client.get(
        "/search", params={"q": token, "mode": "lexical", "project_slug": other}
    ).json()
    assert in_other == []


def test_file_explorer_groups_by_project_and_searches_contents(
    client: TestClient, make_project
) -> None:
    slug = make_project()["slug"]
    token = _token("Brixol")
    client.post(
        f"/projects/{slug}/documents",
        files={"file": ("notes.md", f"doc mentions {token} clearly".encode(), "text/markdown")},
        data={"title": "Notes"},
    )
    client.post(
        f"/projects/{slug}/artifacts",
        json={
            "artifact_type_slug": "development-plan",
            "title": _token("Plan"),
            "files": [{"path": "IMPLEMENTATION_PLAN.md", "content": f"{token} appears in plan"}],
        },
    )

    groups = client.get("/files", params={"project_slug": slug, "q": token}).json()
    mine = [g for g in groups if g["project_slug"] == slug]
    assert len(mine) == 1
    kinds = {f["kind"] for f in mine[0]["files"]}
    assert {"document", "artifact_file"} <= kinds
