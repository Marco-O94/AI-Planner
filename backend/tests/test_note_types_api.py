"""Configurable note types: CRUD, color validation, delete-in-use guard."""

from fastapi.testclient import TestClient


def test_builtin_types_seeded_global(client: TestClient) -> None:
    resp = client.get("/note-types", params={"scope": "GLOBAL"})
    assert resp.status_code == 200, resp.text
    keys = {t["key"] for t in resp.json()}
    assert {"REQUIREMENT", "CONSTRAINT", "DECISION", "QUESTION", "SNIPPET", "REFERENCE"} <= keys


def test_create_project_type_and_list_applicable(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    resp = client.post(
        "/note-types",
        json={"scope": "PROJECT", "name": "Risk", "color": "amber", "project_slug": slug},
    )
    assert resp.status_code == 201, resp.text
    created = resp.json()
    assert created["slug"] == "risk"
    assert created["color"] == "amber"

    applicable = client.get(f"/projects/{slug}/note-types").json()
    names = {t["name"] for t in applicable}
    assert "Risk" in names and "Requirement" in names  # project + global


def test_create_rejects_bad_color(client: TestClient) -> None:
    resp = client.post("/note-types", json={"scope": "GLOBAL", "name": "Weird", "color": "hotpink"})
    assert resp.status_code == 422, resp.text


def test_update_label_and_color(client: TestClient) -> None:
    created = client.post(
        "/note-types", json={"scope": "GLOBAL", "name": "Spike", "color": "blue"}
    ).json()
    resp = client.patch(f"/note-types/{created['id']}", json={"name": "Spike!", "color": "green"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["name"] == "Spike!" and resp.json()["color"] == "green"


def test_delete_unused_type(client: TestClient) -> None:
    created = client.post(
        "/note-types", json={"scope": "GLOBAL", "name": "Temp", "color": "slate"}
    ).json()
    assert client.delete(f"/note-types/{created['id']}").status_code == 204


def test_delete_in_use_type_blocked(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    nt = client.post(
        "/note-types",
        json={"scope": "PROJECT", "name": "InUse", "color": "red", "project_slug": slug},
    ).json()
    note = client.post(f"/projects/{slug}/notes", json={"type": nt["slug"], "content": "x"})
    assert note.status_code == 201, note.text
    resp = client.delete(f"/note-types/{nt['id']}")
    assert resp.status_code == 409, resp.text
