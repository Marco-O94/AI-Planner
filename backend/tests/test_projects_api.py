"""Phase 2: projects, slugs, filtering, technology resolve-or-create/attach."""

import uuid

from fastapi.testclient import TestClient


def test_slug_collision_generates_distinct_slugs(make_project) -> None:
    name = f"Acme {uuid.uuid4().hex[:6]}"
    first = make_project(name)
    second = make_project(name)
    assert first["slug"] != second["slug"]
    assert second["slug"].startswith(first["slug"])


def test_create_with_technologies_and_combined_filter(
    client: TestClient, make_project
) -> None:
    uid = uuid.uuid4().hex[:8]
    language = f"Lang-{uid}"
    framework = f"Fw-{uid}"
    full = make_project(
        technologies=[
            {"kind": "LANGUAGE", "name": language},
            {"kind": "FRAMEWORK", "name": framework, "version": "15"},
        ]
    )
    # A second project that has only the language, not the framework.
    make_project(technologies=[{"kind": "LANGUAGE", "name": language}])

    matched = client.get(f"/projects?language={language}&framework={framework}").json()
    slugs = {p["slug"] for p in matched}
    assert slugs == {full["slug"]}


def test_filter_by_status(client: TestClient, make_project) -> None:
    uid = uuid.uuid4().hex[:8]
    paused = make_project(f"Paused {uid}", status="PAUSED")
    results = client.get("/projects?status=PAUSED").json()
    assert paused["slug"] in {p["slug"] for p in results}
    assert all(p["status"] == "PAUSED" for p in results)


def test_technology_resolve_or_create_is_idempotent(client: TestClient) -> None:
    name = f"Esoterica-{uuid.uuid4().hex[:8]}"
    first = client.post("/technologies", json={"kind": "LANGUAGE", "name": name})
    second = client.post("/technologies", json={"kind": "LANGUAGE", "name": name})
    assert first.status_code == 201
    assert first.json()["id"] == second.json()["id"]


def test_attach_and_detach_technology(client: TestClient, make_project) -> None:
    project = make_project()
    slug = project["slug"]
    name = f"Tool-{uuid.uuid4().hex[:8]}"
    attached = client.post(
        f"/projects/{slug}/technologies",
        json={"kind": "TOOL", "name": name, "version": "2.0"},
    )
    assert attached.status_code == 200
    techs = client.get(f"/projects/{slug}/technologies").json()
    match = [t for t in techs if t["name"] == name]
    assert match and match[0]["version"] == "2.0"

    tech_id = match[0]["id"]
    client.delete(f"/projects/{slug}/technologies/{tech_id}")
    remaining = client.get(f"/projects/{slug}/technologies").json()
    assert all(t["name"] != name for t in remaining)


def test_delete_project_cascades_to_domains(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    domain = client.post(f"/projects/{slug}/domains", json={"name": "Billing"})
    assert domain.status_code == 201
    domain_id = domain.json()["id"]
    # The domain exists while the project does.
    assert client.get(f"/domains/{domain_id}").status_code == 200

    assert client.delete(f"/projects/{slug}").status_code == 204

    # Project gone, and its bounded context was cascade-deleted with it.
    assert client.get(f"/projects/{slug}").status_code == 404
    assert client.get(f"/domains/{domain_id}").status_code == 404


def test_get_unknown_project_returns_404(client: TestClient) -> None:
    assert client.get("/projects/does-not-exist-xyz").status_code == 404
