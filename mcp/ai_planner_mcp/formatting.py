"""Pure functions that assemble backend JSON into agent-ready markdown.

No I/O, no httpx — every function takes already-fetched dicts and returns a
string. That keeps them trivially unit-testable and keeps the markdown shape
in one place, shared by ``get_project_context`` and ``prepare_generation``.
"""

from __future__ import annotations

from typing import Any

JSON = dict[str, Any]

_TASK_STATUS_ORDER = ["IN_PROGRESS", "TODO", "DONE"]
_PRIORITY_RANK = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}


def order_tasks_by_dependency(tasks: list[JSON]) -> list[JSON]:
    """Topologically order tasks so a task follows everything in ``depends_on``.

    Uses Kahn's algorithm. Dependencies pointing outside the given set are
    ignored (they impose no local ordering). Ties break by priority then by the
    original input order, and any cycle's remaining tasks are appended in input
    order so the function never drops a task or loops.
    """
    by_id = {t["id"]: t for t in tasks}
    index = {t["id"]: i for i, t in enumerate(tasks)}

    # In-set dependency edges only.
    deps = {
        t["id"]: {d for d in (t.get("depends_on") or []) if d in by_id} for t in tasks
    }
    indegree = {tid: len(d) for tid, d in deps.items()}
    dependents: dict[str, list[str]] = {tid: [] for tid in by_id}
    for tid, ds in deps.items():
        for d in ds:
            dependents[d].append(tid)

    def sort_key(tid: str) -> tuple[int, int]:
        task = by_id[tid]
        return (_PRIORITY_RANK.get(task.get("priority"), 1), index[tid])

    ready = sorted([tid for tid, deg in indegree.items() if deg == 0], key=sort_key)
    ordered: list[JSON] = []
    while ready:
        tid = ready.pop(0)
        ordered.append(by_id[tid])
        for dep in dependents[tid]:
            indegree[dep] -= 1
            if indegree[dep] == 0:
                ready.append(dep)
        ready.sort(key=sort_key)

    if len(ordered) < len(tasks):  # cycle — append leftovers deterministically
        seen = {t["id"] for t in ordered}
        ordered.extend(t for t in tasks if t["id"] not in seen)
    return ordered


def render_project_context(
    *,
    project: JSON,
    domains: list[JSON],
    notes: list[JSON],
    tasks: list[JSON],
    documents: list[JSON],
    skills: list[JSON],
    domain_slug: str | None = None,
) -> str:
    """Assemble the full project picture as markdown.

    Notes grouped by domain then type (with each domain's ubiquitous-language
    table), tasks grouped by status and dependency-ordered, then the available
    documents and applicable skills.
    """
    domains_by_id = {d["id"]: d for d in domains}
    selected = _resolve_domain(domains, domain_slug)
    scope_id = selected["id"] if selected else None

    if scope_id is not None:
        notes = [n for n in notes if n.get("domain_id") == scope_id]
        tasks = [t for t in tasks if t.get("domain_id") == scope_id]

    lines: list[str] = []
    title = f"# Project context: {project['name']}"
    if selected:
        title += f" — domain: {selected['name']}"
    lines.append(title)
    lines.append("")
    lines.append(_project_summary(project))
    lines.append("")
    lines.append(_notes_section(notes, domains_by_id, selected))
    lines.append("")
    lines.append(_tasks_section(tasks))
    lines.append("")
    lines.append(_documents_section(documents))
    lines.append("")
    lines.append(_skills_section(skills))
    return "\n".join(lines).rstrip() + "\n"


def render_generation_bundle(
    *,
    project: JSON,
    artifact_type: JSON,
    domains: list[JSON],
    notes: list[JSON],
    tasks: list[JSON],
    documents: list[JSON],
    skills: list[JSON],
    domain_slug: str | None = None,
    focused: bool = False,
) -> str:
    """Assemble the unified generation bundle for ``prepare_generation``.

    The chosen type's instructions + output-file manifest come first (what to
    produce), followed by the relevant context (notes/tasks, dependency-ordered),
    applicable skills, and available documents.
    """
    domains_by_id = {d["id"]: d for d in domains}
    selected = _resolve_domain(domains, domain_slug)

    lines: list[str] = []
    lines.append(f"# Generate: {artifact_type['name']} — for {project['name']}")
    lines.append("")
    scope = "focused (only the supplied notes/tasks)" if focused else "complete project build"
    lines.append(f"_Scope: {scope}._")
    lines.append("")
    lines.append("## Instructions")
    lines.append((artifact_type.get("instructions") or "").strip() or "_None provided._")
    lines.append("")
    lines.append(_manifest_section(artifact_type.get("output_files") or []))
    lines.append("")
    lines.append("## Context")
    lines.append("")
    lines.append(_notes_section(notes, domains_by_id, selected))
    lines.append("")
    lines.append(_tasks_section(tasks))
    lines.append("")
    lines.append(_skills_section(skills))
    lines.append("")
    lines.append(_documents_section(documents))
    return "\n".join(lines).rstrip() + "\n"


# -- sections --------------------------------------------------------------


def _project_summary(project: JSON) -> str:
    techs = project.get("technologies") or []
    tech_names = ", ".join(t["name"] for t in techs) or "—"
    parts = [
        f"- **Slug:** {project['slug']}",
        f"- **Status:** {project.get('status', '—')}",
        f"- **Tech stack:** {tech_names}",
    ]
    if project.get("description"):
        parts.insert(0, project["description"].strip())
        parts.insert(1, "")
    return "\n".join(parts)


def _notes_section(
    notes: list[JSON], domains_by_id: dict[str, JSON], selected: JSON | None
) -> str:
    lines = ["## Notes"]
    if not notes:
        lines.append("")
        lines.append("_No notes._")
        return "\n".join(lines)

    grouped: dict[str | None, list[JSON]] = {}
    for note in notes:
        grouped.setdefault(note.get("domain_id"), []).append(note)

    # Stable domain ordering: named domains alpha, then the unscoped bucket.
    def domain_name(domain_id: str | None) -> str:
        if domain_id is None:
            return "General (no domain)"
        return domains_by_id.get(domain_id, {}).get("name", "Unknown domain")

    for domain_id in sorted(grouped, key=lambda d: (d is None, domain_name(d).lower())):
        lines.append("")
        lines.append(f"### {domain_name(domain_id)}")
        domain = domains_by_id.get(domain_id) if domain_id else None
        if domain:
            table = _ubiquitous_language_table(domain.get("ubiquitous_language"))
            if table:
                lines.append("")
                lines.append("**Ubiquitous language**")
                lines.append("")
                lines.append(table)
        for note_type, items in _group_by_type(grouped[domain_id]).items():
            lines.append("")
            lines.append(f"**{note_type.title()}**")
            for note in items:
                title = (note.get("title") or "").strip() or "(untitled note)"
                lines.append("")
                lines.append(f"- **{title}**{_tags(note.get('tags'))}")
                body = (note.get("content") or "").strip()
                if body:
                    lines.append(_indent(body))
    return "\n".join(lines)


def _tasks_section(tasks: list[JSON]) -> str:
    lines = ["## Tasks"]
    if not tasks:
        lines.append("")
        lines.append("_No tasks._")
        return "\n".join(lines)

    ordered = order_tasks_by_dependency(tasks)
    titles = {t["id"]: t["title"] for t in ordered}
    by_status: dict[str, list[JSON]] = {}
    for task in ordered:
        by_status.setdefault(task.get("status", "TODO"), []).append(task)

    statuses = [s for s in _TASK_STATUS_ORDER if s in by_status]
    statuses += [s for s in by_status if s not in _TASK_STATUS_ORDER]
    for status in statuses:
        lines.append("")
        lines.append(f"### {status}")
        for task in by_status[status]:
            flags = []
            if task.get("priority"):
                flags.append(task["priority"])
            if task.get("blocked"):
                flags.append("BLOCKED")
            suffix = f" _({', '.join(flags)})_" if flags else ""
            lines.append("")
            lines.append(f"- **{task['title']}**{suffix}{_tags(task.get('tags'))}")
            desc = (task.get("description") or "").strip()
            if desc:
                lines.append(_indent(desc))
            dep_names = [
                titles[d] for d in (task.get("depends_on") or []) if d in titles
            ]
            if dep_names:
                lines.append(_indent("depends on: " + "; ".join(dep_names)))
    return "\n".join(lines)


def _documents_section(documents: list[JSON]) -> str:
    lines = ["## Documents"]
    if not documents:
        lines.append("")
        lines.append("_No documents._")
        return "\n".join(lines)
    lines.append("")
    for doc in documents:
        meta = doc.get("mime_type") or doc.get("filename") or ""
        meta_suffix = f" ({meta})" if meta else ""
        lines.append(f"- **{doc['title']}**{meta_suffix} — id `{doc['id']}`")
    lines.append("")
    lines.append("_Use `get_document(id)` for the full extracted text._")
    return "\n".join(lines)


def _skills_section(skills: list[JSON]) -> str:
    lines = ["## Applicable skills"]
    if not skills:
        lines.append("")
        lines.append("_No applicable skills._")
        return "\n".join(lines)
    for skill in skills:
        lines.append("")
        lines.append(f"### {skill['name']} (`{skill['slug']}`)")
        if skill.get("description"):
            lines.append(skill["description"].strip())
        body = (skill.get("content") or "").strip()
        if body:
            lines.append("")
            lines.append(body)
    return "\n".join(lines)


def _manifest_section(output_files: list[JSON]) -> str:
    lines = ["## Output files (produce exactly these)"]
    if not output_files:
        lines.append("")
        lines.append("_The type declares no file manifest; produce a sensible default file._")
        return "\n".join(lines)
    lines.append("")
    for entry in output_files:
        note = f" — {entry['note']}" if entry.get("note") else ""
        lines.append(f"- `{entry['path']}`{note}")
    return "\n".join(lines)


# -- small helpers ---------------------------------------------------------


def _resolve_domain(domains: list[JSON], domain_slug: str | None) -> JSON | None:
    if not domain_slug:
        return None
    for domain in domains:
        if domain.get("slug") == domain_slug:
            return domain
    raise ValueError(f"domain {domain_slug!r} not found in project")


def _group_by_type(notes: list[JSON]) -> dict[str, list[JSON]]:
    grouped: dict[str, list[JSON]] = {}
    for note in notes:
        # `type` is now a nested object {id,key,slug,name,color}; fall back to a
        # plain string for legacy/test payloads.
        note_type = note.get("type")
        label = note_type.get("name") if isinstance(note_type, dict) else (note_type or "NOTE")
        grouped.setdefault(label, []).append(note)
    return dict(sorted(grouped.items()))


def _ubiquitous_language_table(ubiquitous_language: Any) -> str:
    if not isinstance(ubiquitous_language, dict) or not ubiquitous_language:
        return ""
    rows = ["| Term | Definition |", "| --- | --- |"]
    for term, definition in ubiquitous_language.items():
        rows.append(f"| {term} | {_cell(definition)} |")
    return "\n".join(rows)


def _cell(value: Any) -> str:
    return str(value).replace("\n", " ").replace("|", "\\|").strip()


def _tags(tags: Any) -> str:
    if not tags:
        return ""
    return "  " + " ".join(f"`#{t}`" for t in tags)


def _indent(text: str, prefix: str = "  ") -> str:
    return "\n".join(prefix + line for line in text.splitlines())
