"""Server wiring: the FastMCP server builds and exposes every declared tool."""

import asyncio

from ai_planner_mcp.client import BackendClient
from ai_planner_mcp.server import build_server

EXPECTED_TOOLS = {
    "list_projects", "list_domains", "get_project_context",
    "list_artifact_types", "get_artifact_type",
    "list_artifacts", "get_artifact", "list_artifact_versions", "get_artifact_version",
    "list_tasks", "get_task", "get_note", "list_notes",
    "list_documents", "get_document",
    "get_project_skills", "get_skill",
    "search_knowledge", "prepare_generation",
    "create_note", "create_task",
    "create_tasks_from_notes", "mark_notes_processed",
    "save_artifact", "update_phase_status",
}


def test_server_registers_all_expected_tools(client: BackendClient):
    server = build_server(client)

    tools = asyncio.run(server.list_tools())
    names = {t.name for t in tools}

    assert EXPECTED_TOOLS <= names


def test_every_tool_has_a_docstring(client: BackendClient):
    server = build_server(client)

    tools = asyncio.run(server.list_tools())

    missing = [t.name for t in tools if not (t.description or "").strip()]
    assert not missing, f"tools without descriptions: {missing}"
