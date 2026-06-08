import type { TaskRead } from "@/lib/types";

import { ALL_VALUE } from "./constants";

/** Editable shape backing the task create/edit dialog. */
export interface TaskFormState {
  title: string;
  description: string;
  status: TaskRead["status"];
  priority: TaskRead["priority"];
  tags: string;
  /** Domain id, or ALL_VALUE for project-level. */
  domainId: string;
  dependsOn: string[];
}

export function emptyTaskForm(defaultDomainId?: string): TaskFormState {
  return {
    title: "",
    description: "",
    status: "TODO",
    priority: "MEDIUM",
    tags: "",
    domainId: defaultDomainId ?? ALL_VALUE,
    dependsOn: [],
  };
}

export function taskFormFromTask(task: TaskRead): TaskFormState {
  return {
    title: task.title,
    description: task.description ?? "",
    status: task.status,
    priority: task.priority,
    tags: task.tags.join(", "),
    domainId: task.domain_id ?? ALL_VALUE,
    dependsOn: task.depends_on,
  };
}

/** Parse a comma-separated tag string into a de-duplicated, trimmed list. */
export function parseTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}
