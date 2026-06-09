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
    assert len(only_req) == 1 and only_req[0]["type"]["key"] == "REQUIREMENT"
    only_beta = client.get(f"/projects/{slug}/notes?tag=beta").json()
    assert len(only_beta) == 1 and only_beta[0]["type"]["key"] == "DECISION"


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
    detail = resp.json()["detail"]
    assert "cycle detected" in detail
    assert "t1" in detail and "t2" in detail  # names the offending tasks


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


def test_note_filtering_by_type_slug(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    client.post(f"/projects/{slug}/notes", json={"type": "requirement", "content": "r"})
    client.post(f"/projects/{slug}/notes", json={"type": "decision", "content": "d"})

    resp = client.get(f"/projects/{slug}/notes", params={"type": "decision"})
    assert resp.status_code == 200, resp.text
    rows = resp.json()
    assert len(rows) == 1
    assert rows[0]["type"]["slug"] == "decision"


def test_create_note_with_uppercase_key_backcompat(client: TestClient, make_project) -> None:
    # MCP / legacy clients send the uppercase enum value; resolution must accept it.
    slug = make_project()["slug"]
    resp = client.post(f"/projects/{slug}/notes", json={"type": "REQUIREMENT", "content": "x"})
    assert resp.status_code == 201, resp.text
    assert resp.json()["type"]["key"] == "REQUIREMENT"


# -- AI-processed flag + create-tasks-from-notes -----------------------------


def test_note_read_exposes_ai_processed_default_false(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    note = client.post(f"/projects/{slug}/notes", json={"type": "REQUIREMENT", "content": "x"}).json()
    assert note["ai_processed"] is False
    assert note["ai_processed_at"] is None


def test_mark_notes_ai_processed_sets_and_clears_flag(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    note = client.post(f"/projects/{slug}/notes", json={"type": "REQUIREMENT", "content": "x"}).json()

    marked = client.post(
        f"/projects/{slug}/notes/mark-ai-processed", json={"note_ids": [note["id"]]}
    )
    assert marked.status_code == 200, marked.text
    body = marked.json()[0]
    assert body["ai_processed"] is True and body["ai_processed_at"] is not None

    cleared = client.post(
        f"/projects/{slug}/notes/mark-ai-processed",
        json={"note_ids": [note["id"]], "processed": False},
    ).json()[0]
    assert cleared["ai_processed"] is False and cleared["ai_processed_at"] is None


def test_list_notes_filter_by_processed(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    handled = client.post(f"/projects/{slug}/notes", json={"type": "REQUIREMENT", "content": "h"}).json()
    client.post(f"/projects/{slug}/notes", json={"type": "DECISION", "content": "open"})
    client.post(f"/projects/{slug}/notes/mark-ai-processed", json={"note_ids": [handled["id"]]})

    unprocessed = client.get(f"/projects/{slug}/notes", params={"processed": "false"}).json()
    assert [n["content"] for n in unprocessed] == ["open"]
    processed = client.get(f"/projects/{slug}/notes", params={"processed": "true"}).json()
    assert [n["content"] for n in processed] == ["h"]
    all_notes = client.get(f"/projects/{slug}/notes").json()
    assert len(all_notes) == 2


def test_note_count_excludes_ai_processed(client: TestClient, make_project) -> None:
    project = make_project()
    slug = project["slug"]
    n1 = client.post(f"/projects/{slug}/notes", json={"type": "REQUIREMENT", "content": "a"}).json()
    client.post(f"/projects/{slug}/notes", json={"type": "DECISION", "content": "b"})
    assert client.get(f"/projects/{slug}").json()["note_count"] == 2

    client.post(f"/projects/{slug}/notes/mark-ai-processed", json={"note_ids": [n1["id"]]})
    assert client.get(f"/projects/{slug}").json()["note_count"] == 1


def test_create_tasks_from_notes_links_source_note(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    note = client.post(
        f"/projects/{slug}/notes", json={"type": "REQUIREMENT", "content": "ship login"}
    ).json()

    resp = client.post(
        f"/projects/{slug}/tasks/from-notes",
        json={"items": [{"source_note_id": note["id"], "title": "Build login", "priority": "HIGH"}]},
    )
    assert resp.status_code == 201, resp.text
    task = resp.json()[0]
    assert task["source_note_id"] == note["id"]
    assert task["title"] == "Build login" and task["priority"] == "HIGH"

    # Creating tasks does NOT consume the note: it stays unprocessed until a plan
    # is generated from it.
    refreshed = client.get(f"/notes/{note['id']}").json()
    assert refreshed["ai_processed"] is False
    assert len(client.get(f"/projects/{slug}/notes", params={"processed": "false"}).json()) == 1


def test_create_tasks_from_notes_is_atomic_on_bad_item(client: TestClient, make_project) -> None:
    project_a = make_project()
    project_b = make_project()
    good = client.post(
        f"/projects/{project_a['slug']}/notes", json={"type": "REQUIREMENT", "content": "g"}
    ).json()
    foreign = client.post(
        f"/projects/{project_b['slug']}/notes", json={"type": "REQUIREMENT", "content": "f"}
    ).json()

    # Second item references a note from another project -> whole batch rejected.
    resp = client.post(
        f"/projects/{project_a['slug']}/tasks/from-notes",
        json={
            "items": [
                {"source_note_id": good["id"], "title": "ok"},
                {"source_note_id": foreign["id"], "title": "bad"},
            ]
        },
    )
    assert resp.status_code == 422, resp.text
    # Nothing was written: no task created, the good note stays unprocessed.
    assert client.get(f"/projects/{project_a['slug']}/tasks").json() == []
    assert client.get(f"/notes/{good['id']}").json()["ai_processed"] is False
