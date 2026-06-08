"""Phase 3: document upload, extraction, dual indexing, download, delete."""

import uuid

from fastapi.testclient import TestClient


def test_upload_extracts_indexes_and_is_searchable(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    token = f"Zentauri{uuid.uuid4().hex[:8]}"
    body = f"# Spec\n\nThe {token} subsystem handles refunds and chargebacks.".encode()

    resp = client.post(
        f"/projects/{slug}/documents",
        files={"file": ("spec.md", body, "text/markdown")},
        data={"title": "Spec", "tags": "spec,arch"},
    )
    assert resp.status_code == 201, resp.text
    doc = resp.json()
    assert token in (doc["extracted_text"] or "")
    assert doc["indexed_at"] is not None
    assert doc["tags"] == ["spec", "arch"]

    # Lexical search finds the exact word inside the document, scoped to project.
    hits = client.get(
        f"/projects/{slug}/search", params={"q": token, "mode": "lexical"}
    ).json()
    assert any(h["kind"] == "document" and h["id"] == doc["id"] for h in hits)


def test_list_download_and_delete(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    token = f"Payload{uuid.uuid4().hex[:8]}"
    resp = client.post(
        f"/projects/{slug}/documents",
        files={"file": ("readme.txt", f"plain {token} text".encode(), "text/plain")},
        data={"title": "Readme"},
    )
    doc = resp.json()

    listing = client.get(f"/projects/{slug}/documents").json()
    assert doc["id"] in {d["id"] for d in listing}

    download = client.get(f"/documents/{doc['id']}/download")
    assert download.status_code == 200
    assert token.encode() in download.content

    assert client.delete(f"/documents/{doc['id']}").status_code == 204
    assert client.get(f"/documents/{doc['id']}").status_code == 404


def test_document_with_foreign_domain_rejected(client: TestClient, make_project) -> None:
    project_a = make_project()["slug"]
    project_b = make_project()["slug"]
    domain = client.post(f"/projects/{project_a}/domains", json={"name": "Billing"}).json()

    resp = client.post(
        f"/projects/{project_b}/documents",
        files={"file": ("x.txt", b"data", "text/plain")},
        data={"title": "X", "domain_id": domain["id"]},
    )
    assert resp.status_code == 422
