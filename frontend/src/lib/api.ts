/**
 * Typed HTTP client for the ProjectNotes backend.
 *
 * - `apiFetch` / `swrFetcher` are the low-level primitives (use the latter as
 *   SWR's global fetcher; pass a path string as the SWR key).
 * - The grouped `api` object has one typed method per backend operation.
 *
 * Base URL comes from `NEXT_PUBLIC_API_URL` (default http://localhost:8088).
 */

import type {
  ArtifactDetailRead,
  ArtifactRead,
  ArtifactStatus,
  ArtifactTypeCreate,
  ArtifactTypeRead,
  ArtifactTypeUpdate,
  ArtifactUpdate,
  DocumentRead,
  DomainCreate,
  DomainRead,
  DomainUpdate,
  FileGroupRead,
  NoteCreate,
  NoteRead,
  NoteTypeCreate,
  NoteTypeRead,
  NoteTypeUpdate,
  NoteUpdate,
  PhaseStatus,
  ProjectCreate,
  ProjectRead,
  ProjectStatus,
  ProjectUpdate,
  SearchHitRead,
  SearchKind,
  SearchMode,
  SkillCreate,
  SkillRead,
  SkillUpdate,
  TaskCreate,
  TaskPriority,
  TaskRead,
  TaskStatus,
  TaskUpdate,
  TechnologyInput,
  TechnologyRead,
  TemplateCreate,
  TemplateRead,
  TemplateUpdate,
  VersionFilesRead,
  VersionRefRead,
} from "./types";

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8088"
).replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, message: string, detail: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

type Query = Record<string, string | number | boolean | string[] | null | undefined>;

function buildQuery(query?: Query): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, String(item));
    } else {
      params.append(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function parseError(response: Response): Promise<never> {
  let detail: unknown = null;
  let message = `${response.status} ${response.statusText}`;
  try {
    const body = await response.json();
    detail = body?.detail ?? body;
    if (typeof body?.detail === "string") message = body.detail;
  } catch {
    /* non-JSON error body */
  }
  throw new ApiError(response.status, message, detail);
}

export interface RequestOptions {
  method?: string;
  query?: Query;
  body?: unknown;
  /** Send `body` as multipart FormData instead of JSON. */
  formData?: FormData;
  signal?: AbortSignal;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", query, body, formData, signal } = options;
  const init: RequestInit = { method, signal, headers: {} };

  if (formData) {
    init.body = formData;
  } else if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${path}${buildQuery(query)}`, init);
  if (!response.ok) await parseError(response);
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** SWR global fetcher: the key is the path (optionally with query string). */
export const swrFetcher = <T>(path: string): Promise<T> => apiFetch<T>(path);

/** Absolute URL for a backend resource (e.g. for download links / image src). */
export const apiUrl = (path: string): string => `${API_URL}${path}`;

// -- grouped, typed operations --------------------------------------------

export const api = {
  // technologies
  listTechnologies: () => apiFetch<TechnologyRead[]>("/technologies"),

  // projects
  listProjects: (query?: {
    q?: string;
    status?: ProjectStatus;
    language?: string;
    framework?: string;
    database?: string;
  }) => apiFetch<ProjectRead[]>("/projects", { query }),
  getProject: (slug: string) => apiFetch<ProjectRead>(`/projects/${slug}`),
  createProject: (body: ProjectCreate) =>
    apiFetch<ProjectRead>("/projects", { method: "POST", body }),
  updateProject: (slug: string, body: ProjectUpdate) =>
    apiFetch<ProjectRead>(`/projects/${slug}`, { method: "PATCH", body }),
  deleteProject: (slug: string) =>
    apiFetch<void>(`/projects/${slug}`, { method: "DELETE" }),
  attachTechnology: (slug: string, body: TechnologyInput) =>
    apiFetch<ProjectRead>(`/projects/${slug}/technologies`, { method: "POST", body }),
  detachTechnology: (slug: string, technologyId: string) =>
    apiFetch<ProjectRead>(`/projects/${slug}/technologies/${technologyId}`, {
      method: "DELETE",
    }),
  applyTemplate: (slug: string, templateSlug: string) =>
    apiFetch<ProjectRead>(`/projects/${slug}/apply-template`, {
      method: "POST",
      body: { template_slug: templateSlug },
    }),
  saveAsTemplate: (slug: string, body: { name: string; description?: string | null }) =>
    apiFetch<TemplateRead>(`/projects/${slug}/save-as-template`, { method: "POST", body }),

  // domains
  listDomains: (slug: string) => apiFetch<DomainRead[]>(`/projects/${slug}/domains`),
  createDomain: (slug: string, body: DomainCreate) =>
    apiFetch<DomainRead>(`/projects/${slug}/domains`, { method: "POST", body }),
  getDomain: (domainId: string) => apiFetch<DomainRead>(`/domains/${domainId}`),
  updateDomain: (domainId: string, body: DomainUpdate) =>
    apiFetch<DomainRead>(`/domains/${domainId}`, { method: "PATCH", body }),
  deleteDomain: (domainId: string) =>
    apiFetch<void>(`/domains/${domainId}`, { method: "DELETE" }),

  // notes
  listNotes: (slug: string) => apiFetch<NoteRead[]>(`/projects/${slug}/notes`),
  createNote: (slug: string, body: NoteCreate) =>
    apiFetch<NoteRead>(`/projects/${slug}/notes`, { method: "POST", body }),
  getNote: (noteId: string) => apiFetch<NoteRead>(`/notes/${noteId}`),
  updateNote: (noteId: string, body: NoteUpdate) =>
    apiFetch<NoteRead>(`/notes/${noteId}`, { method: "PATCH", body }),
  deleteNote: (noteId: string) => apiFetch<void>(`/notes/${noteId}`, { method: "DELETE" }),
  noteArtifacts: (noteId: string) =>
    apiFetch<ArtifactRead[]>(`/notes/${noteId}/artifacts`),

  // tasks
  listTasks: (slug: string, query?: { status?: TaskStatus; priority?: TaskPriority }) =>
    apiFetch<TaskRead[]>(`/projects/${slug}/tasks`, { query }),
  createTask: (slug: string, body: TaskCreate) =>
    apiFetch<TaskRead>(`/projects/${slug}/tasks`, { method: "POST", body }),
  getTask: (taskId: string) => apiFetch<TaskRead>(`/tasks/${taskId}`),
  updateTask: (taskId: string, body: TaskUpdate) =>
    apiFetch<TaskRead>(`/tasks/${taskId}`, { method: "PATCH", body }),
  deleteTask: (taskId: string) => apiFetch<void>(`/tasks/${taskId}`, { method: "DELETE" }),
  taskArtifacts: (taskId: string) =>
    apiFetch<ArtifactRead[]>(`/tasks/${taskId}/artifacts`),

  // documents
  listDocuments: (slug: string) => apiFetch<DocumentRead[]>(`/projects/${slug}/documents`),
  uploadDocument: (
    slug: string,
    file: File,
    extra?: { title?: string; domain_id?: string; tags?: string },
  ) => {
    const fd = new FormData();
    fd.append("file", file);
    if (extra?.title) fd.append("title", extra.title);
    if (extra?.domain_id) fd.append("domain_id", extra.domain_id);
    if (extra?.tags) fd.append("tags", extra.tags);
    return apiFetch<DocumentRead>(`/projects/${slug}/documents`, {
      method: "POST",
      formData: fd,
    });
  },
  getDocument: (documentId: string) => apiFetch<DocumentRead>(`/documents/${documentId}`),
  deleteDocument: (documentId: string) =>
    apiFetch<void>(`/documents/${documentId}`, { method: "DELETE" }),
  documentDownloadUrl: (documentId: string) => apiUrl(`/documents/${documentId}/download`),

  // skills
  listGlobalSkills: () => apiFetch<SkillRead[]>("/skills"),
  createSkill: (body: SkillCreate) =>
    apiFetch<SkillRead>("/skills", { method: "POST", body }),
  getSkill: (skillId: string) => apiFetch<SkillRead>(`/skills/${skillId}`),
  updateSkill: (skillId: string, body: SkillUpdate) =>
    apiFetch<SkillRead>(`/skills/${skillId}`, { method: "PATCH", body }),
  deleteSkill: (skillId: string) =>
    apiFetch<void>(`/skills/${skillId}`, { method: "DELETE" }),
  skillExportUrl: (skillId: string) => apiUrl(`/skills/${skillId}/export`),
  listProjectSkills: (slug: string) => apiFetch<SkillRead[]>(`/projects/${slug}/skills`),
  attachSkill: (slug: string, skillId: string) =>
    apiFetch<SkillRead>(`/projects/${slug}/skills/${skillId}`, { method: "POST" }),
  detachSkill: (slug: string, skillId: string) =>
    apiFetch<void>(`/projects/${slug}/skills/${skillId}`, { method: "DELETE" }),

  // artifact types
  listArtifactTypes: () => apiFetch<ArtifactTypeRead[]>("/artifact-types"),
  listProjectArtifactTypes: (slug: string) =>
    apiFetch<ArtifactTypeRead[]>(`/projects/${slug}/artifact-types`),
  createArtifactType: (body: ArtifactTypeCreate) =>
    apiFetch<ArtifactTypeRead>("/artifact-types", { method: "POST", body }),
  getArtifactType: (typeId: string) =>
    apiFetch<ArtifactTypeRead>(`/artifact-types/${typeId}`),
  updateArtifactType: (typeId: string, body: ArtifactTypeUpdate) =>
    apiFetch<ArtifactTypeRead>(`/artifact-types/${typeId}`, { method: "PATCH", body }),
  deleteArtifactType: (typeId: string) =>
    apiFetch<void>(`/artifact-types/${typeId}`, { method: "DELETE" }),

  // note types
  listNoteTypes: (scope?: "GLOBAL" | "PROJECT") =>
    apiFetch<NoteTypeRead[]>("/note-types", { query: scope ? { scope } : undefined }),
  listProjectNoteTypes: (slug: string) =>
    apiFetch<NoteTypeRead[]>(`/projects/${slug}/note-types`),
  createNoteType: (body: NoteTypeCreate) =>
    apiFetch<NoteTypeRead>("/note-types", { method: "POST", body }),
  updateNoteType: (typeId: string, body: NoteTypeUpdate) =>
    apiFetch<NoteTypeRead>(`/note-types/${typeId}`, { method: "PATCH", body }),
  deleteNoteType: (typeId: string) =>
    apiFetch<void>(`/note-types/${typeId}`, { method: "DELETE" }),

  // artifacts
  listArtifacts: (slug: string, query?: { artifact_type?: string }) =>
    apiFetch<ArtifactRead[]>(`/projects/${slug}/artifacts`, { query }),
  getArtifact: (artifactId: string) =>
    apiFetch<ArtifactDetailRead>(`/artifacts/${artifactId}`),
  updateArtifact: (artifactId: string, body: ArtifactUpdate) =>
    apiFetch<ArtifactRead>(`/artifacts/${artifactId}`, { method: "PATCH", body }),
  deleteArtifact: (artifactId: string) =>
    apiFetch<void>(`/artifacts/${artifactId}`, { method: "DELETE" }),
  listVersions: (artifactId: string) =>
    apiFetch<VersionRefRead[]>(`/artifacts/${artifactId}/versions`),
  getVersion: (artifactId: string, versionNumber: number) =>
    apiFetch<VersionFilesRead>(`/artifacts/${artifactId}/versions/${versionNumber}`),
  updatePhase: (
    artifactId: string,
    phaseId: string,
    body: { status: PhaseStatus; note?: string | null },
  ) =>
    apiFetch(`/artifacts/${artifactId}/phases/${phaseId}`, { method: "PATCH", body }),
  artifactExportUrl: (artifactId: string) => apiUrl(`/artifacts/${artifactId}/export`),
  artifactDiffUrl: (artifactId: string) => apiUrl(`/artifacts/${artifactId}/diff`),

  // search & files
  search: (query: {
    q: string;
    mode?: SearchMode;
    project_slug?: string;
    domain_slug?: string;
    kinds?: SearchKind[];
    tag?: string;
    limit?: number;
  }) => apiFetch<SearchHitRead[]>("/search", { query }),
  files: (query?: { q?: string; mode?: SearchMode; kind?: SearchKind; tag?: string }) =>
    apiFetch<FileGroupRead[]>("/files", { query }),
  projectFiles: (
    slug: string,
    query?: { q?: string; mode?: SearchMode; kind?: SearchKind; tag?: string },
  ) => apiFetch<FileGroupRead[]>(`/projects/${slug}/files`, { query }),

  // templates
  listTemplates: () => apiFetch<TemplateRead[]>("/templates"),
  createTemplate: (body: TemplateCreate) =>
    apiFetch<TemplateRead>("/templates", { method: "POST", body }),
  getTemplate: (templateId: string) => apiFetch<TemplateRead>(`/templates/${templateId}`),
  updateTemplate: (templateId: string, body: TemplateUpdate) =>
    apiFetch<TemplateRead>(`/templates/${templateId}`, { method: "PATCH", body }),
  deleteTemplate: (templateId: string) =>
    apiFetch<void>(`/templates/${templateId}`, { method: "DELETE" }),

  // admin
  reindex: () => apiFetch<{ status: string } | unknown>("/admin/reindex", { method: "POST" }),
};
