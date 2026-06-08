"""BackendClient transport behaviour: error mapping and param cleaning."""

import httpx
import pytest

from project_notes_mcp.client import BackendClient, BackendError


def test_non_2xx_raises_backend_error_with_detail():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(422, json={"detail": "domain is cross-project"})

    http = httpx.Client(transport=httpx.MockTransport(handler), base_url="http://b.test")
    client = BackendClient(http_client=http)

    with pytest.raises(BackendError) as exc:
        client.get_project("acme")

    assert exc.value.status_code == 422
    assert "domain is cross-project" in str(exc.value)


def test_network_failure_raises_backend_error():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("refused")

    http = httpx.Client(transport=httpx.MockTransport(handler), base_url="http://b.test")
    client = BackendClient(http_client=http)

    with pytest.raises(BackendError, match="unreachable"):
        client.list_projects()


def test_none_query_params_are_dropped():
    seen: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen.update(request.url.params)
        return httpx.Response(200, json=[])

    http = httpx.Client(transport=httpx.MockTransport(handler), base_url="http://b.test")
    client = BackendClient(http_client=http)

    client.list_tasks("acme", status="TODO", priority=None)

    assert seen == {"status": "TODO"}  # priority=None omitted


def test_list_query_params_repeat():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params.get_list("kinds") == ["note", "document"]
        return httpx.Response(200, json=[])

    http = httpx.Client(transport=httpx.MockTransport(handler), base_url="http://b.test")
    client = BackendClient(http_client=http)

    client.search("x", kinds=["note", "document"])
