"""Technology lookup CRUD: create/list, rename re-slug, collision 409,
kind change, delete-unused 204, delete-in-use 409, missing-id 404."""

import uuid

from fastapi.testclient import TestClient


def _name() -> str:
    return f"Tech-{uuid.uuid4().hex[:8]}"


def test_create_and_list_smoke(client: TestClient) -> None:
    name = _name()
    created = client.post("/technologies", json={"kind": "LANGUAGE", "name": name})
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["kind"] == "LANGUAGE"
    assert body["name"] == name
    assert body["slug"]

    listed = client.get("/technologies").json()
    assert any(t["id"] == body["id"] for t in listed)


def test_rename_reslugs(client: TestClient) -> None:
    created = client.post("/technologies", json={"kind": "FRAMEWORK", "name": _name()}).json()
    new_name = _name()
    resp = client.patch(f"/technologies/{created['id']}", json={"name": new_name})
    assert resp.status_code == 200, resp.text
    renamed = resp.json()
    assert renamed["name"] == new_name
    assert renamed["slug"] != created["slug"]


def test_rename_onto_existing_name_conflicts(client: TestClient) -> None:
    existing_name = _name()
    client.post("/technologies", json={"kind": "DATABASE", "name": existing_name})
    other = client.post("/technologies", json={"kind": "DATABASE", "name": _name()}).json()

    resp = client.patch(f"/technologies/{other['id']}", json={"name": existing_name})
    assert resp.status_code == 409, resp.text
    assert resp.json()["detail"] == "a technology with that name already exists"


def test_change_kind(client: TestClient) -> None:
    created = client.post("/technologies", json={"kind": "TOOL", "name": _name()}).json()
    resp = client.patch(f"/technologies/{created['id']}", json={"kind": "LANGUAGE"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["kind"] == "LANGUAGE"
    assert resp.json()["name"] == created["name"]


def test_delete_unused_returns_204(client: TestClient) -> None:
    created = client.post("/technologies", json={"kind": "TOOL", "name": _name()}).json()
    assert client.delete(f"/technologies/{created['id']}").status_code == 204
    assert client.patch(f"/technologies/{created['id']}", json={"name": _name()}).status_code == 404


def test_delete_attached_to_project_conflicts(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    name = _name()
    attached = client.post(
        f"/projects/{slug}/technologies", json={"kind": "LANGUAGE", "name": name}
    )
    assert attached.status_code == 200, attached.text
    techs = client.get(f"/projects/{slug}/technologies").json()
    tech_id = next(t["id"] for t in techs if t["name"] == name)

    resp = client.delete(f"/technologies/{tech_id}")
    assert resp.status_code == 409, resp.text


def test_patch_missing_id_returns_404(client: TestClient) -> None:
    resp = client.patch(f"/technologies/{uuid.uuid4()}", json={"name": _name()})
    assert resp.status_code == 404, resp.text
