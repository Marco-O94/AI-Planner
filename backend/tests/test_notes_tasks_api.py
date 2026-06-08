"""Phase 2: note/task domain invariant, filtering, dependencies, blocked."""

from fastapi.testclient import TestClient


def _new_domain(client: TestClient, slug: str, name: str) -> dict:
    resp = client.post(f"/projects/{slug}/domains", json={"name": name})
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_note_with_foreign_domain_is_rejected(client: TestClient, make_project) -> None:
    project_a = make_project()
    project_b = make_project()
    foreign_domain = _new_domain(client, project_a["slug"], "Payments")

    resp = client.post(
        f"/projects/{project_b['slug']}/notes",
        json={"type": "REQUIREMENT", "content": "x", "domain_id": foreign_domain["id"]},
    )
    assert resp.status_code == 422


def test_task_with_foreign_domain_is_rejected(client: TestClient, make_project) -> None:
    project_a = make_project()
    project_b = make_project()
    foreign_domain = _new_domain(client, project_a["slug"], "Routing")

    resp = client.post(
        f"/projects/{project_b['slug']}/tasks",
        json={"title": "t", "domain_id": foreign_domain["id"]},
    )
    assert resp.status_code == 422


def test_note_filtering_by_type_and_tag(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    client.post(
        f"/projects/{slug}/notes",
        json={"type": "REQUIREMENT", "content": "r", "tags": ["alpha"]},
    )
    client.post(
        f"/projects/{slug}/notes",
        json={"type": "DECISION", "content": "d", "tags": ["beta"]},
    )
    only_req = client.get(f"/projects/{slug}/notes?type=REQUIREMENT").json()
    assert len(only_req) == 1 and only_req[0]["type"] == "REQUIREMENT"
    only_beta = client.get(f"/projects/{slug}/notes?tag=beta").json()
    assert len(only_beta) == 1 and only_beta[0]["type"] == "DECISION"


def test_task_filtering_by_status_and_priority(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    client.post(
        f"/projects/{slug}/tasks",
        json={"title": "hi", "status": "TODO", "priority": "HIGH"},
    )
    client.post(
        f"/projects/{slug}/tasks",
        json={"title": "lo", "status": "DONE", "priority": "LOW"},
    )
    filtered = client.get(f"/projects/{slug}/tasks?status=TODO&priority=HIGH").json()
    assert len(filtered) == 1 and filtered[0]["title"] == "hi"


def test_dependency_must_be_same_project(client: TestClient, make_project) -> None:
    slug_a = make_project()["slug"]
    slug_b = make_project()["slug"]
    task_b = client.post(f"/projects/{slug_b}/tasks", json={"title": "b"}).json()

    resp = client.post(
        f"/projects/{slug_a}/tasks",
        json={"title": "a", "depends_on": [task_b["id"]]},
    )
    assert resp.status_code == 422


def test_dependency_cycle_is_rejected(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    t1 = client.post(f"/projects/{slug}/tasks", json={"title": "t1"}).json()
    t2 = client.post(
        f"/projects/{slug}/tasks", json={"title": "t2", "depends_on": [t1["id"]]}
    ).json()
    # t1 -> t2 would close the cycle t1 -> t2 -> t1.
    resp = client.patch(f"/tasks/{t1['id']}", json={"depends_on": [t2["id"]]})
    assert resp.status_code == 422


def test_blocked_flag_tracks_dependency_status(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    t1 = client.post(f"/projects/{slug}/tasks", json={"title": "dep"}).json()
    t2 = client.post(
        f"/projects/{slug}/tasks", json={"title": "blocked", "depends_on": [t1["id"]]}
    ).json()
    assert t2["blocked"] is True

    client.patch(f"/tasks/{t1['id']}", json={"status": "DONE"})
    refreshed = client.get(f"/tasks/{t2['id']}").json()
    assert refreshed["blocked"] is False
