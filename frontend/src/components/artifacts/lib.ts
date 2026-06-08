import { apiUrl } from "@/lib/api";
import type {
  ArtifactFileRead,
  ArtifactRead,
  ArtifactTypeRead,
} from "@/lib/types";

/** SWR key for a project's artifacts list (optionally scoped to one type). */
export function artifactsKey(slug: string, artifactType?: string): string {
  const qs = artifactType ? `?artifact_type=${encodeURIComponent(artifactType)}` : "";
  return `/projects/${slug}/artifacts${qs}`;
}

/** SWR key for a single artifact's full detail. */
export function artifactDetailKey(artifactId: string): string {
  return `/artifacts/${artifactId}`;
}

/** SWR key for a single version's file set. */
export function versionFilesKey(artifactId: string, versionNumber: number): string {
  return `/artifacts/${artifactId}/versions/${versionNumber}`;
}

/** Group artifacts by their type id, preserving a stable display order. */
export interface ArtifactGroup {
  typeId: string;
  typeName: string;
  artifacts: ArtifactRead[];
}

export function groupArtifactsByType(
  artifacts: ArtifactRead[],
  types: ArtifactTypeRead[],
): ArtifactGroup[] {
  const typeName = new Map(types.map((t) => [t.id, t.name]));
  const buckets = new Map<string, ArtifactRead[]>();
  for (const artifact of artifacts) {
    const existing = buckets.get(artifact.artifact_type_id) ?? [];
    buckets.set(artifact.artifact_type_id, [...existing, artifact]);
  }
  return Array.from(buckets.entries())
    .map(([typeId, items]) => ({
      typeId,
      typeName: typeName.get(typeId) ?? "Untitled type",
      artifacts: [...items].sort((a, b) => a.title.localeCompare(b.title)),
    }))
    .sort((a, b) => a.typeName.localeCompare(b.typeName));
}

/** Artifact types that ship an execution checklist (plan-like). */
const PLAN_LIKE_HINTS = ["plan", "roadmap", "phase", "task"];

export function isPlanLikeType(slug: string | undefined): boolean {
  if (!slug) return false;
  const lower = slug.toLowerCase();
  return PLAN_LIKE_HINTS.some((hint) => lower.includes(hint));
}

/** Derive a short display label for a file (last path segment). */
export function fileLabel(path: string): string {
  const segments = path.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? path;
}

/** Sort a file set by its declared order then path for deterministic display. */
export function sortedFiles(files: ArtifactFileRead[]): ArtifactFileRead[] {
  return [...files].sort(
    (a, b) => a.order_index - b.order_index || a.path.localeCompare(b.path),
  );
}

/** Download URL for a single artifact file by path within the export. */
export function singleFileExportUrl(artifactId: string, path: string): string {
  return apiUrl(
    `/artifacts/${artifactId}/export?path=${encodeURIComponent(path)}`,
  );
}

/** Trigger a browser download via a transient anchor element. */
export function triggerDownload(url: string, filename?: string): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  if (filename) anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
