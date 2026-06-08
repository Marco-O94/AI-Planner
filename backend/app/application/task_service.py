"""Task service: domain invariant, dependency same-project check, cycle
rejection, and blocked-status computation."""

from __future__ import annotations

import uuid
from dataclasses import replace

from app.domain.entities import Task
from app.domain.enums import TaskPriority, TaskStatus
from app.domain.errors import NotFoundError, ValidationError
from app.domain.read_models import TaskWithStatus
from app.domain.repositories import DomainRepository, ProjectRepository, TaskRepository

_UPDATABLE = {"domain_id", "title", "description", "status", "priority", "depends_on", "tags"}


class TaskService:
    def __init__(
        self,
        repo: TaskRepository,
        project_repo: ProjectRepository,
        domain_repo: DomainRepository,
    ) -> None:
        self.repo = repo
        self.project_repo = project_repo
        self.domain_repo = domain_repo

    def _require_project_id(self, project_slug: str) -> uuid.UUID:
        project = self.project_repo.get_by_slug(project_slug)
        if project is None:
            raise NotFoundError(f"project '{project_slug}' not found")
        return project.id

    def _validate_domain(self, project_id: uuid.UUID, domain_id: uuid.UUID | None) -> None:
        if domain_id is None:
            return
        domain = self.domain_repo.get_by_id(domain_id)
        if domain is None or domain.project_id != project_id:
            raise ValidationError("domain does not belong to this project")

    def _validate_dependencies(
        self, project_id: uuid.UUID, task_id: uuid.UUID, depends_on: list[uuid.UUID]
    ) -> None:
        if not depends_on:
            return
        if task_id in depends_on:
            raise ValidationError("a task cannot depend on itself")
        found = {t.id: t for t in self.repo.get_many(depends_on)}
        for dep_id in depends_on:
            dep = found.get(dep_id)
            if dep is None:
                raise ValidationError("dependency task not found")
            if dep.project_id != project_id:
                raise ValidationError("dependencies must be in the same project")
        self._reject_cycle(project_id, task_id, depends_on)

    def _reject_cycle(
        self, project_id: uuid.UUID, task_id: uuid.UUID, depends_on: list[uuid.UUID]
    ) -> None:
        tasks = self.repo.list_all_for_project(project_id)
        adjacency = {t.id: list(t.depends_on) for t in tasks}
        adjacency[task_id] = list(depends_on)
        title_by_id = {t.id: t.title for t in tasks}

        visiting: set[uuid.UUID] = set()
        visited: set[uuid.UUID] = set()
        stack: list[uuid.UUID] = []

        def find_cycle(node: uuid.UUID) -> list[uuid.UUID] | None:
            visiting.add(node)
            stack.append(node)
            for nxt in adjacency.get(node, []):
                if nxt in visiting:  # back-edge to an ancestor -> cycle
                    return stack[stack.index(nxt):] + [nxt]
                if nxt not in visited:
                    found = find_cycle(nxt)
                    if found is not None:
                        return found
            visiting.discard(node)
            visited.add(node)
            stack.pop()
            return None

        cycle = find_cycle(task_id)
        if cycle is not None:
            # Report the cycle by task title so the agent can see what to break;
            # the task being created/updated has no persisted title yet.
            path = " -> ".join(
                title_by_id.get(n) or ("<this task>" if n == task_id else str(n))
                for n in cycle
            )
            raise ValidationError(f"dependency cycle detected: {path}")

    def create(
        self,
        project_slug: str,
        *,
        title: str,
        description: str | None = None,
        status: TaskStatus = TaskStatus.TODO,
        priority: TaskPriority = TaskPriority.MEDIUM,
        depends_on: list[uuid.UUID] | None = None,
        tags: list[str] | None = None,
        domain_id: uuid.UUID | None = None,
    ) -> TaskWithStatus:
        project_id = self._require_project_id(project_slug)
        self._validate_domain(project_id, domain_id)
        task_id = uuid.uuid4()
        self._validate_dependencies(project_id, task_id, depends_on or [])
        task = self.repo.add(
            Task(
                id=task_id,
                project_id=project_id,
                domain_id=domain_id,
                title=title,
                description=description,
                status=status,
                priority=priority,
                depends_on=depends_on or [],
                tags=tags or [],
            )
        )
        return TaskWithStatus(task=task, blocked=self._is_blocked(task))

    def get(self, task_id: uuid.UUID) -> TaskWithStatus:
        task = self._require(task_id)
        return TaskWithStatus(task=task, blocked=self._is_blocked(task))

    def _require(self, task_id: uuid.UUID) -> Task:
        task = self.repo.get_by_id(task_id)
        if task is None:
            raise NotFoundError("task not found")
        return task

    def list(
        self,
        project_slug: str,
        *,
        domain_id: uuid.UUID | None = None,
        status: TaskStatus | None = None,
        priority: TaskPriority | None = None,
        tag: str | None = None,
    ) -> list[TaskWithStatus]:
        project_id = self._require_project_id(project_slug)
        tasks = self.repo.list(
            project_id, domain_id=domain_id, status=status, priority=priority, tag=tag
        )
        dep_ids = {dep for t in tasks for dep in t.depends_on}
        status_by_id = {t.id: t.status for t in self.repo.get_many(list(dep_ids))}
        return [
            TaskWithStatus(
                task=t,
                blocked=any(status_by_id.get(d) != TaskStatus.DONE for d in t.depends_on),
            )
            for t in tasks
        ]

    def update(self, task_id: uuid.UUID, changes: dict) -> TaskWithStatus:
        task = self._require(task_id)
        applied = {k: v for k, v in changes.items() if k in _UPDATABLE}
        if "domain_id" in applied:
            self._validate_domain(task.project_id, applied["domain_id"])
        if "depends_on" in applied:
            self._validate_dependencies(task.project_id, task.id, applied["depends_on"] or [])
        updated = self.repo.update(replace(task, **applied))
        return TaskWithStatus(task=updated, blocked=self._is_blocked(updated))

    def delete(self, task_id: uuid.UUID) -> None:
        self.repo.delete(self._require(task_id).id)

    def _is_blocked(self, task: Task) -> bool:
        if not task.depends_on:
            return False
        deps = self.repo.get_many(task.depends_on)
        status_by_id = {d.id: d.status for d in deps}
        return any(status_by_id.get(d) != TaskStatus.DONE for d in task.depends_on)
