# AI Planner MCP server

Exposes the AI Planner backend to an AI agent (Claude Code) over MCP so it can
discover projects, pull structured context, choose an artifact type, and write
typed, versioned artifacts back.

The server talks to the backend **over HTTP only** (`BACKEND_URL`) — it never
imports backend code, keeping the two services decoupled.

## Layout

```
ai_planner_mcp/
  config.py       # env-driven Settings (BACKEND_URL, MCP_TRANSPORT, host/port)
  client.py       # BackendClient — thin httpx wrapper, one method per endpoint
  formatting.py   # pure markdown assembly (context + generation bundle, dep-ordered)
  tools.py        # tool logic (testable; takes a BackendClient)
  server.py       # FastMCP wiring — docstrings are the agent's instructions
  __main__.py     # entry point; runs stdio (default) or sse / streamable-http
```

## Tools

Read: `list_projects`, `list_domains`, `get_project_context`,
`list_artifact_types`, `get_artifact_type`, `list_artifacts`, `get_artifact`,
`list_artifact_versions`, `get_artifact_version`, `list_tasks`, `get_task`,
`get_note`, `list_documents`, `get_document`, `get_project_skills`, `get_skill`,
`search_knowledge`, `prepare_generation`.

Write: `create_note`, `create_task`, `save_artifact`, `update_phase_status`.

### Capture knowledge back into a project

The agent isn't read-only: it can write new notes and tasks straight into a
project (e.g. record a decision it reached, or file follow-up work surfaced
while planning). Domains are addressed by **slug** — the tool resolves it to the
backend id and validates it belongs to the project.

```
create_note(project, type="DECISION", content="Use Stripe for cards.",
            tags=["billing"], domain_slug="billing")
#   type ∈ REQUIREMENT | CONSTRAINT | DECISION | QUESTION | SNIPPET | REFERENCE
#   notes are indexed for semantic search on creation

create_task(project, title="Wire up webhooks", priority="HIGH",
            depends_on=["<task-id>"], domain_slug="billing")
#   status ∈ TODO (default) | IN_PROGRESS | DONE
#   priority ∈ LOW | MEDIUM (default) | HIGH
#   depends_on: same-project task ids — backend rejects self-deps, cross-project
#   deps and cycles, and marks the task `blocked` until every dep is DONE
```

### Typical flow

```
list_artifact_types(project)            # pick "Development Plan" or a user type
prepare_generation(project, type)       # one bundle: instructions + manifest + context + skills + docs
# ...the agent produces the declared files...
save_artifact(project, type, title, files=[...])   # new artifact, or version N+1 on same title
update_phase_status(artifact_id, phase_id, "DONE") # live execution tracking
```

`search_knowledge(query, mode="lexical|semantic|hybrid", ...)` pulls only the
relevant material first on large projects.

## Run locally

```bash
uv sync
# stdio (for local Claude Code) — talks to the dev backend on :8088
BACKEND_URL=http://localhost:8088 uv run python -m ai_planner_mcp
# sse (containerized / shared)
MCP_TRANSPORT=sse MCP_PORT=8050 BACKEND_URL=http://localhost:8088 \
  uv run python -m ai_planner_mcp        # SSE endpoint at /sse
```

Configuration (all optional, localhost defaults): `BACKEND_URL`,
`MCP_TRANSPORT` (`stdio|sse|streamable-http`), `MCP_HOST`, `MCP_PORT`,
`BACKEND_TIMEOUT`. See `.env.example`.

## Register with Claude Code (`.mcp.json`)

**stdio** — simplest for local use; Claude Code launches the process and speaks
over stdin/stdout. Copy [`.mcp.stdio.json`](./.mcp.stdio.json) (adjust `cwd` /
`BACKEND_URL`):

```json
{
  "mcpServers": {
    "ai-planner": {
      "command": "uv",
      "args": ["run", "python", "-m", "ai_planner_mcp"],
      "cwd": "/home/marco-oliveri/pvt/AI-Planner/mcp",
      "env": { "BACKEND_URL": "http://localhost:8088" }
    }
  }
}
```

**SSE** — for an always-on / shared deployment (the `mcp` compose service);
Claude Code connects to a running URL. Copy [`.mcp.sse.json`](./.mcp.sse.json):

```json
{
  "mcpServers": {
    "ai-planner": { "type": "sse", "url": "http://localhost:8050/sse" }
  }
}
```

**Which to use:** stdio when the server runs on your machine alongside Claude
Code (no port, lifecycle managed for you). SSE when the server runs as a
long-lived service (e.g. `docker compose up mcp`) that one or more clients reach
over the network.

## docker-compose

```bash
docker compose up -d --build mcp   # starts SSE on :8050, depends on a healthy backend
```

The compose `mcp` service sets `BACKEND_URL=http://backend:8000` (in-network)
and `MCP_TRANSPORT=sse`.

## Tests

```bash
uv run pytest        # 45 tests — mock-backed, no live backend or network
uv run ruff check .
```

`e2e_live.py` is a manual end-to-end smoke against a running backend (not part
of the pytest suite):

```bash
BACKEND_URL=http://localhost:8088 uv run python e2e_live.py
```
