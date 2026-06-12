/**
 * TypeScript mirror of the ProjectNotes backend schemas.
 *
 * Source of truth is the backend OpenAPI (`/openapi.json`). Keep these in sync
 * when the API changes. Read models end in *Read; write payloads are the
 * *Create / *Update shapes.
 */

// -- enums -----------------------------------------------------------------

export type ProjectStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";
export type NoteType =
  | "REQUIREMENT"
  | "CONSTRAINT"
  | "DECISION"
  | "QUESTION"
  | "SNIPPET"
  | "REFERENCE";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
export type PhaseStatus = "PENDING" | "IN_PROGRESS" | "DONE";
export type ArtifactStatus = "DRAFT" | "APPROVED" | "ARCHIVED";
export type ScopeKind = "GLOBAL" | "PROJECT";
export type TechnologyKind = "LANGUAGE" | "FRAMEWORK" | "DATABASE" | "TOOL";
export type SearchMode = "lexical" | "semantic" | "hybrid";
export type SearchKind = "note" | "document" | "artifact_file";

export const NOTE_TYPES: NoteType[] = [
  "REQUIREMENT",
  "CONSTRAINT",
  "DECISION",
  "QUESTION",
  "SNIPPET",
  "REFERENCE",
];
export const TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
export const TASK_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];
export const PROJECT_STATUSES: ProjectStatus[] = ["ACTIVE", "PAUSED", "ARCHIVED"];
export const ARTIFACT_STATUSES: ArtifactStatus[] = ["DRAFT", "APPROVED", "ARCHIVED"];
export const TECHNOLOGY_KINDS: TechnologyKind[] = [
  "LANGUAGE",
  "FRAMEWORK",
  "DATABASE",
  "TOOL",
];

// -- technologies ----------------------------------------------------------

export interface TechnologyRead {
  id: string;
  kind: TechnologyKind;
  name: string;
  slug: string;
}

export interface ProjectTechnologyRead {
  id: string;
  kind: TechnologyKind;
  name: string;
  slug: string;
  version: string | null;
}

export interface TechnologyInput {
  kind: TechnologyKind;
  name: string;
  version?: string | null;
}

/** Create payload for a global technology (no per-project version). */
export interface TechnologyCreate {
  kind: TechnologyKind;
  name: string;
}

export interface TechnologyUpdate {
  kind?: TechnologyKind | null;
  name?: string | null;
}

// -- projects --------------------------------------------------------------

export interface ProjectRead {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ProjectStatus;
  repository_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  technologies: ProjectTechnologyRead[];
  note_count: number;
  task_count: number;
  artifact_count: number;
}

export interface ProjectCreate {
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  repository_url?: string | null;
  metadata?: Record<string, unknown> | null;
  technologies?: TechnologyInput[];
  template_slug?: string | null;
}

export interface ProjectUpdate {
  name?: string | null;
  description?: string | null;
  status?: ProjectStatus | null;
  repository_url?: string | null;
  metadata?: Record<string, unknown> | null;
}

// -- domains ---------------------------------------------------------------

export interface DomainRead {
  id: string;
  project_id: string;
  name: string;
  slug: string;
  description: string | null;
  ubiquitous_language: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

export interface DomainCreate {
  name: string;
  description?: string | null;
  ubiquitous_language?: Record<string, string> | null;
}

export type DomainUpdate = Partial<DomainCreate>;

// -- note types ------------------------------------------------------------

export const NOTE_TYPE_COLORS = [
  "violet",
  "blue",
  "green",
  "amber",
  "red",
  "slate",
  "neutral",
] as const;
export type NoteTypeColor = (typeof NOTE_TYPE_COLORS)[number];

/** Compact note-type summary embedded in a note. */
export interface NoteTypeRef {
  id: string;
  key: string | null;
  slug: string;
  name: string;
  color: NoteTypeColor;
}

export interface NoteTypeRead {
  id: string;
  scope: ScopeKind;
  project_id: string | null;
  key: string | null;
  name: string;
  slug: string;
  color: NoteTypeColor;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface NoteTypeCreate {
  scope: ScopeKind;
  name: string;
  color: NoteTypeColor;
  description?: string | null;
  project_slug?: string | null;
}

export interface NoteTypeUpdate {
  name?: string | null;
  color?: NoteTypeColor | null;
  description?: string | null;
}

// -- notes -----------------------------------------------------------------

export interface NoteRead {
  id: string;
  project_id: string;
  domain_id: string | null;
  note_type_id: string;
  type: NoteTypeRef;
  title: string | null;
  content: string;
  tags: string[];
  /** True once the AI has folded the note into a plan/artifact. */
  ai_processed: boolean;
  ai_processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteCreate {
  type: string;
  content: string;
  title?: string | null;
  tags?: string[];
  domain_id?: string | null;
}

export interface NoteUpdate {
  type?: string | null;
  content?: string | null;
  title?: string | null;
  tags?: string[] | null;
  domain_id?: string | null;
}

// -- tasks -----------------------------------------------------------------

export interface TaskRead {
  id: string;
  project_id: string;
  domain_id: string | null;
  /** The note this task was distilled from, if created via create-tasks-from-notes. */
  source_note_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  depends_on: string[];
  tags: string[];
  blocked: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskCreate {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  depends_on?: string[];
  tags?: string[];
  domain_id?: string | null;
}

export interface TaskUpdate {
  title?: string | null;
  description?: string | null;
  status?: TaskStatus | null;
  priority?: TaskPriority | null;
  depends_on?: string[] | null;
  tags?: string[] | null;
  domain_id?: string | null;
}

// -- documents -------------------------------------------------------------

export interface DocumentRead {
  id: string;
  project_id: string;
  domain_id: string | null;
  title: string;
  filename: string;
  mime_type: string;
  extracted_text: string;
  tags: string[];
  indexed_at: string | null;
  created_at: string;
  updated_at: string;
}

// -- skills ----------------------------------------------------------------

export interface SkillRead {
  id: string;
  scope: ScopeKind;
  project_id: string | null;
  name: string;
  slug: string;
  description: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface SkillCreate {
  scope: ScopeKind;
  name: string;
  description: string;
  content: string;
  tags?: string[];
  project_slug?: string | null;
}

export interface SkillUpdate {
  name?: string | null;
  description?: string | null;
  content?: string | null;
  tags?: string[] | null;
}

// -- artifact types --------------------------------------------------------

export interface OutputFile {
  path: string;
  note?: string | null;
}

export interface ArtifactTypeRead {
  id: string;
  scope: ScopeKind;
  project_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  instructions: string;
  output_files: OutputFile[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ArtifactTypeCreate {
  scope: ScopeKind;
  name: string;
  instructions: string;
  description?: string | null;
  output_files?: OutputFile[];
  project_slug?: string | null;
}

export interface ArtifactTypeUpdate {
  name?: string | null;
  description?: string | null;
  instructions?: string | null;
  output_files?: OutputFile[] | null;
}

// -- artifacts -------------------------------------------------------------

export interface ArtifactRead {
  id: string;
  project_id: string;
  domain_id: string | null;
  artifact_type_id: string;
  title: string;
  slug: string;
  status: ArtifactStatus;
  current_version_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArtifactFileRead {
  id: string;
  artifact_version_id: string;
  path: string;
  content: string;
  note: string | null;
  order_index: number;
}

export interface PhaseRead {
  id: string;
  artifact_version_id: string;
  order_index: number;
  title: string;
  status: PhaseStatus;
  note: string | null;
  updated_at: string;
}

export interface VersionRefRead {
  version_number: number;
  id: string;
  created_at: string | null;
  change_note: string | null;
}

export interface VersionFilesRead {
  id: string;
  artifact_id: string;
  version_number: number;
  source_note_ids: string[];
  source_task_ids: string[];
  source_document_ids: string[];
  change_note: string | null;
  created_at: string;
  files: ArtifactFileRead[];
}

export interface ManifestCoverageRead {
  present: string[];
  missing: string[];
  extra: string[];
  is_complete: boolean;
}

export interface ArtifactDetailRead {
  artifact: ArtifactRead;
  artifact_type_slug: string;
  current_version_number: number;
  files: ArtifactFileRead[];
  phases: PhaseRead[];
  versions: VersionRefRead[];
  coverage: ManifestCoverageRead;
}

export interface ArtifactUpdate {
  title?: string | null;
  status?: ArtifactStatus | null;
  domain_id?: string | null;
}

// -- search & files --------------------------------------------------------

export interface SearchHitRead {
  kind: SearchKind;
  id: string;
  title: string;
  project_id: string;
  domain_id: string | null;
  snippet: string;
  score: number;
  path: string | null;
}

export interface FileEntryRead {
  kind: SearchKind;
  id: string;
  title: string;
  path: string | null;
  tags: string[];
  snippet: string | null;
}

export interface FileGroupRead {
  project_slug: string;
  project_name: string;
  files: FileEntryRead[];
}

// -- templates -------------------------------------------------------------

export interface TemplateRead {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  definition: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

export interface TemplateCreate {
  name: string;
  description?: string | null;
  definition?: Record<string, unknown>;
}

export interface TemplateUpdate {
  name?: string | null;
  description?: string | null;
  definition?: Record<string, unknown> | null;
}

// -- auth ------------------------------------------------------------------

export interface UserRead {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string | null;
}
