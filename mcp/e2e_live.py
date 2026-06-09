"""Live end-to-end smoke against a running backend, via the real MCP runtime.

Spawns `python -m ai_planner_mcp` over stdio and drives the Phase 4 flow:
discover -> context -> prepare_generation -> save_artifact (v1) ->
save again (v2) -> versions -> update_phase_status -> search.

Run: BACKEND_URL=http://localhost:8088 uv run python e2e_live.py
NOT part of the pytest suite (needs a live backend); a manual done-criteria check.
"""

import asyncio
import json
import os

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

SLUG = "acme-billing"


def _payload(result):
    if result.structuredContent is not None:
        sc = result.structuredContent
        return sc.get("result", sc) if isinstance(sc, dict) else sc
    text = result.content[0].text if result.content else ""
    try:
        return json.loads(text)
    except (ValueError, TypeError):
        return text


async def main() -> None:
    env = dict(os.environ)
    env["BACKEND_URL"] = env.get("BACKEND_URL", "http://localhost:8088")
    params = StdioServerParameters(
        command="uv", args=["run", "python", "-m", "ai_planner_mcp"], env=env
    )

    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            tools = await session.list_tools()
            print(f"[tools] {len(tools.tools)} discovered")
            assert len(tools.tools) == 20, len(tools.tools)

            async def call(name, args):
                return _payload(await session.call_tool(name, args))

            projects = await call("list_projects", {})
            assert any(p["slug"] == SLUG for p in projects), projects
            print(f"[list_projects] {[p['slug'] for p in projects]}")

            ctx = await call("get_project_context", {"project_slug": SLUG})
            assert "Charge monthly" in ctx and "Design invoice schema" in ctx
            assert ctx.index("Design invoice schema") < ctx.index("Build invoice UI")
            print("[get_project_context] sections + dependency order OK")

            types = await call("list_artifact_types", {"project_slug": SLUG})
            assert any(t["slug"] == "development-plan" for t in types)
            print(f"[list_artifact_types] {[t['slug'] for t in types]}")

            bundle = await call(
                "prepare_generation",
                {"project_slug": SLUG, "artifact_type_slug": "development-plan"},
            )
            assert "# Generate: Development Plan" in bundle
            print("[prepare_generation] bundle assembled")

            # Idempotent across re-runs: assert version increments, not absolutes.
            files = [{"path": "DEVELOPMENT_PLAN.md",
                      "content": "# Plan\n## Phase 1\nSchema.\n## Phase 2\nUI."}]
            saved = await call("save_artifact", {
                "project_slug": SLUG, "artifact_type_slug": "development-plan",
                "title": "Acme Dev Plan", "files": files,
            })
            artifact_id = saved["artifact"]["id"]
            v1 = saved["current_version_number"]
            print(f"[save_artifact] v{v1} id={artifact_id} "
                  f"coverage_complete={saved['coverage']['is_complete']}")
            assert v1 >= 1

            saved2 = await call("save_artifact", {
                "project_slug": SLUG, "artifact_type_slug": "development-plan",
                "title": "Acme Dev Plan",
                "files": [{"path": "DEVELOPMENT_PLAN.md",
                           "content": "# Plan v2\n## Phase 1\nRevised."}],
            })
            v2 = saved2["current_version_number"]
            assert v2 == v1 + 1, (v1, v2)
            print(f"[save_artifact] same title -> v{v2} (was v{v1})")

            versions = await call("list_artifact_versions", {"artifact_id": artifact_id})
            assert len(versions) == v2  # one version row per save
            print(f"[list_artifact_versions] {[v['version_number'] for v in versions]}")

            phase_id = saved2["phases"][0]["id"]
            phase = await call("update_phase_status", {
                "artifact_id": artifact_id, "phase_id": phase_id,
                "status": "DONE", "note": "shipped",
            })
            assert phase["status"] == "DONE"
            print(f"[update_phase_status] phase -> {phase['status']}")

            hits = await call("search_knowledge", {
                "query": "invoice", "project_slug": SLUG, "mode": "hybrid",
            })
            print(f"[search_knowledge] {len(hits)} hits; "
                  f"kinds={sorted({h['kind'] for h in hits})}")
            assert hits, "expected at least one hit"

    print("\nE2E OK — all Phase 4 done-criteria exercised live.")


if __name__ == "__main__":
    asyncio.run(main())
