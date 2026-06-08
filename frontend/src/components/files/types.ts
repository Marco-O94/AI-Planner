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
  /** i18n key under `files.search.modes.<value>.label`. */
  labelKey: string;
  /** i18n key under `files.search.modes.<value>.hint`. */
  hintKey: string;
}

export const SEARCH_MODE_OPTIONS: SearchModeOption[] = [
  { value: "lexical", labelKey: "files.search.modes.lexical.label", hintKey: "files.search.modes.lexical.hint" },
  { value: "semantic", labelKey: "files.search.modes.semantic.label", hintKey: "files.search.modes.semantic.hint" },
  { value: "hybrid", labelKey: "files.search.modes.hybrid.label", hintKey: "files.search.modes.hybrid.hint" },
];

export interface FileKindOption {
  value: SearchKind;
  /** i18n key under `files.kinds.<*>` for the plural filter label. */
  labelKey: string;
}

export const FILE_KIND_OPTIONS: FileKindOption[] = [
  { value: "document", labelKey: "files.kinds.documents" },
  { value: "artifact_file", labelKey: "files.kinds.artifactFiles" },
  { value: "note", labelKey: "files.kinds.notes" },
];

/** i18n key for the singular human label of a kind value. */
export function kindLabelKey(kind: SearchKind): string {
  switch (kind) {
    case "document":
      return "files.kinds.document";
    case "artifact_file":
      return "files.kinds.artifactFile";
    case "note":
      return "files.kinds.note";
    default:
      return kind;
  }
}
