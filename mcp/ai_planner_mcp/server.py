"""FastMCP server wiring.

Thin layer: every ``@mcp.tool()`` delegates to a function in ``tools`` bound to
a shared :class:`BackendClient`. The docstrings here are what the AI agent
reads to decide which tool to call — keep them precise and task-oriented.
"""

from __future__ import annotations

from typing import Any

from mcp.server.fastmcp import FastMCP

from . import tools
from .client import BackendClient

JSON = dict[str, Any]

SERVER_INSTRUCTIONS = (
    "AI Planner: per-project notes/tasks/documents organized by DDD domain, which "
    "the AI turns into typed, versioned artifacts (e.g. a Development Plan). This "
    "server is the system of record — when the user's request is about the planner "
    "or a project here, act through these tools, not ad-hoc files or memory.\n\n"
    "USE THIS SERVER WHENEVER the user asks to:\n"
    "- create / add / file a TASK on the planner or in a project -> create_task "
    "(or create_tasks_from_notes to distill several tasks from existing notes).\n"
    "- create / add / capture a NOTE on the planner (a requirement, constraint, "
    "decision, question, snippet, or reference) -> create_note.\n"
    "- build / generate / draft / write a PLAN (or any artifact) for project X from "
    "its notes and tasks -> list_artifact_types(project) -> prepare_generation("
    "project, type) -> produce the declared files -> save_artifact(...). When you "
    "only have a project name, resolve it to a slug first with list_projects.\n\n"
    "ALWAYS know the target project before any write. Every create_note / "
    "create_task / create_tasks_from_notes / save_artifact needs a project. If the "
    "user did NOT say which project to put the note or task in, ASK them first — do "
    "not guess, do not pick a default or the most recent one. Call list_projects "
    "and present the options so they can choose, then proceed.\n\n"
    "Notes -> tasks/plan: list_notes(project, processed=false) surfaces notes not "
    "yet handled; create_tasks_from_notes turns a batch of them into linked tasks. "
    "A note only counts as handled once a plan/artifact is saved from it "
    "(save_artifact marks its source_note_ids AI-processed); processed notes then "
    "drop out of context/generation and the open-notes count. mark_notes_processed "
    "is the manual override.\n\n"
    "Full generate flow: list_projects -> list_artifact_types(project) -> "
    "prepare_generation(project, type) -> produce the declared files -> "
    "save_artifact(..., source_note_ids=[...], source_task_ids=[...]). Use "
    "search_knowledge to pull only relevant material on large projects, and "
    "update_phase_status to track execution of plan-like artifacts."
)


def build_server(
    client: BackendClient, *, host: str = "127.0.0.1", port: int = 8050
) -> FastMCP:
    """Construct a FastMCP server whose tools call ``client``."""
    mcp = FastMCP("ai-planner", instructions=SERVER_INSTRUCTIONS, host=host, port=port)

    # -- read: discovery ---------------------------------------------------

    @mcp.tool()
    def list_projects() -> list[JSON]:
        """List all projects (id, name, slug, status, tech_stack).

        Start here to discover what you can work on.
        """
        return tools.list_projects(client)

    @mcp.tool()
    def list_domains(project_slug: str) -> list[JSON]:
        """List a project's DDD bounded contexts (domains)."""
        return tools.list_domains(client, project_slug)

    @mcp.tool()
    def get_project_context(
        project_slug: str,
        domain_slug: str | None = None,
        include_processed: bool = False,
    ) -> str:
        """Return the full project picture as ready-to-read markdown.

        Notes grouped by domain and type (with ubiquitous-language tables),
        tasks grouped by status and ordered to respect their dependencies, the
        list of available documents, and the applicable skills. Pass
        ``domain_slug`` to scope everything to a single bounded context.

        Notes already marked AI-processed are omitted by default so you don't
        re-handle them; pass ``include_processed=True`` to see every note.

        This is the main context-gathering tool before building an artifact.
        """
        return tools.get_project_context(
            client, project_slug, domain_slug, include_processed
        )

    # -- read: artifact types ---------------------------------------------

    @mcp.tool()
    def list_artifact_types(project_slug: str | None = None) -> list[JSON]:
        """List output types you can generate (the default "Development Plan"
        plus user-defined types), each with its description and output-file
        manifest. Pass ``project_slug`` to include that project's own types.
        """
        return tools.list_artifact_types(client, project_slug)

    @mcp.tool()
    def get_artifact_type(type_slug: str, project_slug: str | None = None) -> JSON:
        """Get one artifact type's full ``instructions`` and file manifest.

        This tells you EXACTLY what to produce and which files to write.
        """
        return tools.get_artifact_type(client, type_slug, project_slug)

    # -- read: artifacts ---------------------------------------------------

    @mcp.tool()
    def list_artifacts(project_slug: str, artifact_type: str | None = None) -> list[JSON]:
        """List a project's existing artifacts, optionally filtered by type slug."""
        return tools.list_artifacts(client, project_slug, artifact_type)

    @mcp.tool()
    def get_artifact(artifact_id: str) -> JSON:
        """Get one artifact with its current files, phases, versions and manifest coverage."""
        return tools.get_artifact(client, artifact_id)

    @mcp.tool()
    def list_artifact_versions(artifact_id: str) -> list[JSON]:
        """List an artifact's version history (for diffing/iterating)."""
        return tools.list_artifact_versions(client, artifact_id)

    @mcp.tool()
    def get_artifact_version(artifact_id: str, version_number: int) -> JSON:
        """Get the files of a specific artifact version."""
        return tools.get_artifact_version(client, artifact_id, version_number)

    # -- read: notes / tasks / documents ----------------------------------

    @mcp.tool()
    def list_tasks(
        project_slug: str, status: str | None = None, priority: str | None = None
    ) -> list[JSON]:
        """List a project's tasks. Filter by ``status`` (TODO/IN_PROGRESS/DONE)
        or ``priority`` (LOW/MEDIUM/HIGH).
        """
        return tools.list_tasks(client, project_slug, status, priority)

    @mcp.tool()
    def get_task(task_id: str) -> JSON:
        """Get a single task (description, status, priority, dependencies, blocked flag)."""
        return tools.get_task(client, task_id)

    @mcp.tool()
    def get_note(note_id: str) -> JSON:
        """Get a single note (type, title, content, tags)."""
        return tools.get_note(client, note_id)

    @mcp.tool()
    def list_notes(project_slug: str, processed: bool | None = None) -> list[JSON]:
        """List a project's notes (id, type, title, content, tags, ai_processed).

        ``processed=false`` returns only notes the AI hasn't handled yet — the
        default candidate set for create_tasks_from_notes. ``processed=true``
        returns only handled ones; omit it to list all. Each note carries an
        ``ai_processed`` boolean and ``ai_processed_at`` timestamp.
        """
        return tools.list_notes(client, project_slug, processed)

    @mcp.tool()
    def list_documents(project_slug: str) -> list[JSON]:
        """List a project's uploaded reference documents (metadata only)."""
        return tools.list_documents(client, project_slug)

    @mcp.tool()
    def get_document(document_id: str) -> JSON:
        """Get a document's metadata and full extracted text."""
        return tools.get_document(client, document_id)

    # -- read: skills ------------------------------------------------------

    @mcp.tool()
    def get_project_skills(project_slug: str) -> list[JSON]:
        """List the skills applicable to a project (name, slug, description)."""
        return tools.get_project_skills(client, project_slug)

    @mcp.tool()
    def get_skill(skill_slug: str, project_slug: str | None = None) -> str:
        """Get a skill's full body (markdown). Pass ``project_slug`` to resolve
        a project-attached skill before global ones.
        """
        return tools.get_skill(client, skill_slug, project_slug)

    # -- read: search ------------------------------------------------------

    @mcp.tool()
    def search_knowledge(
        query: str,
        mode: str = "hybrid",
        project_slug: str | None = None,
        domain_slug: str | None = None,
        kinds: list[str] | None = None,
        limit: int | None = None,
    ) -> list[JSON]:
        """Search notes, documents and artifact files; returns ranked hits with
        snippets and source refs.

        ``mode``: ``lexical`` (exact words inside files), ``semantic`` (by
        meaning, via embeddings), or ``hybrid`` (fused, the default). Scope with
        ``project_slug``/``domain_slug``; restrict with ``kinds`` (e.g.
        ``["note","document","artifact_file"]``). Use this to pull only the
        relevant material on a large project before generating.
        """
        return tools.search_knowledge(
            client, query, mode, project_slug, domain_slug, kinds, limit
        )

    # -- read: generation bundle ------------------------------------------

    @mcp.tool()
    def prepare_generation(
        project_slug: str,
        artifact_type_slug: str,
        domain_slug: str | None = None,
        note_ids: list[str] | None = None,
        task_ids: list[str] | None = None,
        include_processed: bool = False,
    ) -> str:
        """Assemble the unified generation bundle for one artifact type.

        Start here whenever the user asks to build / generate / draft / write a
        plan (or any artifact) for a project from its notes and tasks: call this,
        read the returned bundle, produce the files, then call save_artifact.

        Returns a single markdown payload: the type's instructions + output-file
        manifest, the relevant context (all project notes+tasks for a complete
        build, or just the given ``note_ids``/``task_ids`` for a focused one,
        dependency-ordered), applicable skills, and available documents. Read it,
        then produce the declared files and call ``save_artifact``.

        On a full (non-focused) build, AI-processed notes are omitted by default;
        pass ``include_processed=True`` to fold them back in. Explicit ``note_ids``
        are always honored regardless of their processed state.
        """
        return tools.prepare_generation(
            client,
            project_slug,
            artifact_type_slug,
            domain_slug,
            note_ids,
            task_ids,
            include_processed,
        )

    # -- write -------------------------------------------------------------

    @mcp.tool()
    def create_note(
        project_slug: str,
        type: str,
        content: str,
        title: str | None = None,
        tags: list[str] | None = None,
        domain_slug: str | None = None,
    ) -> JSON:
        """Create a new note in a project and return it (with its new ``id``).

        Use this whenever the user asks to add / create / capture / jot / save a
        note (a requirement, constraint, decision, question, snippet, or reference)
        on the planner or in a project — write it here, not to a local file.

        ``project_slug`` (required): if the user didn't say which project the note
        goes in, ASK them before calling — don't guess or default. list_projects
        shows the choices.

        ``type`` (required) is exactly one of REQUIREMENT, CONSTRAINT, DECISION,
        QUESTION, SNIPPET, REFERENCE — case-sensitive (pass "DECISION", not
        "decision"); an unknown value is rejected with a backend 422 error.
        ``content`` (required) is markdown. Optional ``title``, ``tags`` (list of
        strings), and ``domain_slug`` to scope the note to one DDD bounded
        context (omit for a project-level note). ``domain_slug`` is validated by
        this tool: an unknown slug raises ValueError before any write. Find valid
        slugs with list_domains(project_slug).

        The note is indexed for semantic search synchronously, before this tool
        returns — a following search_knowledge call will already find it.

        Use this to write knowledge back — e.g. record a DECISION you reached
        while planning (scoped to a domain via ``domain_slug``, or project-level
        if omitted), or capture a new REQUIREMENT.
        """
        return tools.create_note(
            client, project_slug, type, content, title, tags, domain_slug
        )

    @mcp.tool()
    def create_task(
        project_slug: str,
        title: str,
        description: str | None = None,
        status: str | None = None,
        priority: str | None = None,
        depends_on: list[str] | None = None,
        tags: list[str] | None = None,
        domain_slug: str | None = None,
    ) -> JSON:
        """Create a new task in a project and return it (with its new ``id`` and
        computed ``blocked`` flag).

        Use this whenever the user asks to add / create / file / open a task (a
        to-do, follow-up, or action item) on the planner or in a project. To turn
        several existing notes into tasks at once, use create_tasks_from_notes.

        ``project_slug`` (required): if the user didn't say which project the task
        goes in, ASK them before calling — don't guess or default. list_projects
        shows the choices.

        ``title`` (required). Optional ``description`` (markdown). ``status``
        (TODO [default] / IN_PROGRESS / DONE) and ``priority`` (LOW / MEDIUM
        [default] / HIGH) are case-sensitive enums — a wrong-case or unknown
        value is rejected with a backend 422 error. Optional ``tags`` and
        ``domain_slug`` (validated by this tool: an unknown slug raises
        ValueError before any write; find valid slugs with list_domains).

        ``depends_on`` is a list of existing task ids (UUID strings) in the SAME
        project — get them from list_tasks(project_slug). The backend rejects ids
        that don't exist, ids from another project, self-dependencies, and
        dependency cycles (e.g. A->B->A), each with a 422 error. The returned
        ``blocked`` flag is True when any listed dependency is not yet DONE,
        meaning the task cannot start until its prerequisites finish.

        Use this to file follow-up work surfaced while planning.
        """
        return tools.create_task(
            client,
            project_slug,
            title,
            description,
            status,
            priority,
            depends_on,
            tags,
            domain_slug,
        )

    @mcp.tool()
    def create_tasks_from_notes(project_slug: str, items: list[JSON]) -> list[JSON]:
        """Create tasks distilled from notes in one atomic call.

        ``project_slug`` (required): if the user didn't say which project, ASK them
        first — don't guess or default. list_projects shows the choices.

        ``items`` is a list of ``{note_id, title, description?, priority?,
        status?, tags?, domain_slug?}``. ``note_id`` (required) is the note the
        task came from — get candidates from ``list_notes(project_slug,
        processed=false)``; it must belong to ``project_slug`` (else a backend 422).
        ``title`` (required). ``status`` (TODO [default]/IN_PROGRESS/DONE) and
        ``priority`` (LOW/MEDIUM [default]/HIGH) are case-sensitive enums.
        ``domain_slug`` is validated per item (unknown slug raises ValueError
        before any write; find slugs with list_domains).

        Each created task stores ``source_note_id`` linking back to its note; if
        any item is rejected, nothing is written. Returns the created tasks (each
        with its new ``id`` and computed ``blocked`` flag).

        This does NOT mark the notes AI-processed — a note only counts as handled
        once a plan/artifact is saved from it (save_artifact) or you call
        mark_notes_processed explicitly. So tasks can be filed from a note now and
        the note still surfaces until the plan is produced.
        """
        return tools.create_tasks_from_notes(client, project_slug, items)

    @mcp.tool()
    def mark_notes_processed(
        project_slug: str, note_ids: list[str], processed: bool = True
    ) -> list[JSON]:
        """Manually mark notes as processed by the AI (or clear the flag).

        Stamps the given notes AI-processed so they stop being re-counted and are
        omitted from later get_project_context / prepare_generation passes. Saving
        a plan/artifact already marks its source notes automatically; use this for
        the rare case of flagging a note outside that flow, or pass
        ``processed=false`` to bring notes back into play. Returns the updated notes.
        """
        return tools.mark_notes_processed(client, project_slug, note_ids, processed)

    @mcp.tool()
    def save_artifact(
        project_slug: str,
        artifact_type_slug: str,
        title: str,
        files: list[JSON],
        domain_slug: str | None = None,
        source_note_ids: list[str] | None = None,
        source_task_ids: list[str] | None = None,
        source_document_ids: list[str] | None = None,
    ) -> JSON:
        """Persist a typed artifact from the files you produced.

        ``files`` is a list of ``{path, content, note?}``. If an artifact with
        the same title already exists it becomes a NEW version (history kept);
        otherwise artifact + version 1 are created. Files are validated against
        the type's manifest (the returned ``coverage`` reports missing/extra),
        and phases are parsed from a primary file when applicable. Pass the
        ``source_*_ids`` so the artifact links back to its sources for UI previews.

        Producing the plan is what consumes the notes: every note in
        ``source_note_ids`` is marked AI-processed here, so it stops being counted
        and drops out of later context/generation passes. Always pass the notes
        you actually used so the project's open-notes count stays accurate.
        """
        return tools.save_artifact(
            client,
            project_slug,
            artifact_type_slug,
            title,
            files,
            domain_slug,
            source_note_ids,
            source_task_ids,
            source_document_ids,
        )

    @mcp.tool()
    def update_phase_status(
        artifact_id: str, phase_id: str, status: str, note: str | None = None
    ) -> JSON:
        """Flip an artifact phase's status (PENDING/IN_PROGRESS/DONE) as you
        implement it, turning a plan-like artifact into a live tracker. Optional
        ``note`` records why.
        """
        return tools.update_phase_status(client, artifact_id, phase_id, status, note)

    return mcp
