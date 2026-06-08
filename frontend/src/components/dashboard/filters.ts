import type { ProjectStatus } from "@/lib/types";

/** Sentinel used by the selects to represent "no filter on this dimension". */
export const ALL = "__all__";

/** Active dashboard filter state. Empty strings / ALL mean "unset". */
export interface DashboardFilters {
  q: string;
  status: ProjectStatus | typeof ALL;
  language: string | typeof ALL;
  framework: string | typeof ALL;
  database: string | typeof ALL;
}

export const EMPTY_FILTERS: DashboardFilters = {
  q: "",
  status: ALL,
  language: ALL,
  framework: ALL,
  database: ALL,
};

/** True when any dimension is narrowing the result set. */
export function hasActiveFilters(filters: DashboardFilters): boolean {
  return (
    filters.q.trim() !== "" ||
    filters.status !== ALL ||
    filters.language !== ALL ||
    filters.framework !== ALL ||
    filters.database !== ALL
  );
}

/** Map filter state to the `api.listProjects` query shape (omitting unset dimensions). */
export interface ProjectQuery {
  q?: string;
  status?: ProjectStatus;
  language?: string;
  framework?: string;
  database?: string;
}

export function toProjectQuery(filters: DashboardFilters): ProjectQuery {
  const query: ProjectQuery = {};
  const trimmed = filters.q.trim();
  if (trimmed) query.q = trimmed;
  if (filters.status !== ALL) query.status = filters.status;
  if (filters.language !== ALL) query.language = filters.language;
  if (filters.framework !== ALL) query.framework = filters.framework;
  if (filters.database !== ALL) query.database = filters.database;
  return query;
}

/** Stable SWR key string for a project query (drives the AND-combined fetch). */
export function projectsKey(query: ProjectQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.status) params.set("status", query.status);
  if (query.language) params.set("language", query.language);
  if (query.framework) params.set("framework", query.framework);
  if (query.database) params.set("database", query.database);
  const qs = params.toString();
  return qs ? `/projects?${qs}` : "/projects";
}
