"""Phase 3: project templates (apply + save-as) and vector reindex."""

import uuid

from fastapi.testclient import TestClient


def test_create_project_from_template_materializes_structure(
    client: TestClient, make_project
) -> None:
    uid = uuid.uuid4().hex[:8]
    skill = client.post(
        "/skills",
        json={"scope": "GLOBAL", "name": f"Reviewer {uid}", "description": "d", "content": "c"},
    ).json()
    definition = {
        "domains": [{"name": "Payments", "description": "billing context"}],
        "technologies": [{"kind": "LANGUAGE", "name": "Python", "version": "3.12"}],
        "skill_ids": [skill["id"]],
        "notes": [{"type": "REQUIREMENT", "content": "must support refunds"}],
        "tasks": [{"title": "scaffold project"}],
    }
    template = client.post(
        "/templates", json={"name": f"DDD Starter {uid}", "definition": definition}
    ).json()

    project = make_project(f"From Template {uid}", template_slug=template["slug"])
    slug = project["slug"]

    domains = client.get(f"/projects/{slug}/domains").json()
    assert any(d["name"] == "Payments" for d in domains)
    techs = client.get(f"/projects/{slug}/technologies").json()
    assert any(t["name"] == "Python" and t["version"] == "3.12" for t in techs)
    assert len(client.get(f"/projects/{slug}/notes").json()) >= 1
    assert len(client.get(f"/projects/{slug}/tasks").json()) >= 1
    applicable = client.get(f"/projects/{slug}/skills").json()
    assert skill["id"] in {s["id"] for s in applicable}

    client.delete(f"/templates/{template['id']}")
    client.delete(f"/skills/{skill['id']}")


def test_save_as_template_round_trip(client: TestClient, make_project) -> None:
    uid = uuid.uuid4().hex[:8]
    source = make_project(
        f"Source {uid}", technologies=[{"kind": "LANGUAGE", "name": "Go"}]
    )["slug"]
    client.post(f"/projects/{source}/domains", json={"name": "Routing"})
    client.post(f"/projects/{source}/notes", json={"type": "DECISION", "content": "use rabbitmq"})

    template = client.post(
        f"/projects/{source}/save-as-template", json={"name": f"Snapshot {uid}"}
    ).json()
    assert any(d["name"] == "Routing" for d in template["definition"]["domains"])
    # Enum round-trip: technology kind must serialize as "LANGUAGE", not "TechnologyKind.LANGUAGE".
    assert any(
        t["kind"] == "LANGUAGE" and t["name"] == "Go"
        for t in template["definition"]["technologies"]
    )

    rebuilt = make_project(f"Rebuilt {uid}", template_slug=template["slug"])
    rebuilt_domains = client.get(f"/projects/{rebuilt['slug']}/domains").json()
    assert any(d["name"] == "Routing" for d in rebuilt_domains)
    rebuilt_techs = client.get(f"/projects/{rebuilt['slug']}/technologies").json()
    assert any(t["name"] == "Go" for t in rebuilt_techs)

    client.delete(f"/templates/{template['id']}")


def test_reindex_rebuilds_and_keeps_search_working(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    token = f"Reindexable{uuid.uuid4().hex[:8]}"
    note = client.post(
        f"/projects/{slug}/notes",
        json={"type": "REQUIREMENT", "content": f"{token} content for reindex"},
    ).json()

    counts = client.post("/admin/reindex").json()
    assert counts["notes"] >= 1

    hits = client.get(
        "/search", params={"q": token, "mode": "semantic", "project_slug": slug}
    ).json()
    assert note["id"] in {h["id"] for h in hits}
