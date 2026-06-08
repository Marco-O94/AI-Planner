import type { SearchKind, SearchMode } from "@/lib/types";

/**
 * Shared constants + small helpers for the File Explorer surface.
 *
 * NOTE on search modes: the backend `/files` endpoint (see
 * `backend/app/api/routers/search.py`) accepts `q`, `project_slug`, `kind`,
 * `tag`, `limit` — it does NOT honour a `mode` parameter; its full-text match is
 * always lexical. We still expose the mode toggle (exact / by meaning / hybrid)
 * and pass it through `api.files`, so the UI is ready the moment the backend
 * starts ranking semantically. Until then the toggle is documented as a known
 * limitation (see TODOs in the returned summary).
 */

/** The "scope to a project" sentinel meaning "all projects". */
export const ALL_PROJECTS = "__all__";

/** The "any kind" sentinel for the kind filter. */
export const ALL_KINDS = "__all__";

export interface SearchModeOption {
  value: SearchMode;
  label: string;
  hint: string;
}

export const SEARCH_MODE_OPTIONS: SearchModeOption[] = [
  { value: "lexical", label: "Exact", hint: "Match the words inside file contents" },
  { value: "semantic", label: "By meaning", hint: "Find conceptually related content" },
  { value: "hybrid", label: "Hybrid", hint: "Fuse exact + semantic ranking" },
];

export interface FileKindOption {
  value: SearchKind;
  label: string;
}

export const FILE_KIND_OPTIONS: FileKindOption[] = [
  { value: "document", label: "Documents" },
  { value: "artifact_file", label: "Artifact files" },
  { value: "note", label: "Notes" },
];

/** Human label for a kind value. */
export function kindLabel(kind: SearchKind): string {
  switch (kind) {
    case "document":
      return "Document";
    case "artifact_file":
      return "Artifact file";
    case "note":
      return "Note";
    default:
      return kind;
  }
}
