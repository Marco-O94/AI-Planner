"use client";

import useSWR from "swr";

import { api, ApiError } from "@/lib/api";
import { useT } from "@/i18n/locale-context";
import type { FileEntryRead } from "@/lib/types";

export interface FileContentResult {
  /** Markdown / plain text body to render, when resolvable. */
  content: string | null;
  /** Language hint for code-ish files (derived from the path extension). */
  language: string | null;
  isLoading: boolean;
  /** A user-facing reason the full content could not be loaded, if any. */
  unavailableReason: string | null;
}

function extFromPath(path: string | null): string | null {
  if (!path) return null;
  const match = /\.([a-z0-9]+)$/i.exec(path);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Resolve the underlying content for a saved-file entry.
 *
 * - documents: fetched via `api.getDocument(id).extracted_text`.
 * - notes: the search id is the note id → `api.getNote` content.
 * - artifact_file: there is no endpoint to fetch a single artifact file by its
 *   id, so we surface the snippet + path and explain the limitation. (The full
 *   file set lives in the artifact detail view.)
 *
 * `null` entry disables fetching (used while the sheet is closed).
 */
export function useFileContent(entry: FileEntryRead | null): FileContentResult {
  const t = useT();
  const shouldFetch = Boolean(entry) && entry?.kind !== "artifact_file";
  const key = shouldFetch && entry ? `/files-content/${entry.kind}/${entry.id}` : null;

  const { data, error, isLoading } = useSWR<string>(
    key,
    async () => {
      if (!entry) return "";
      if (entry.kind === "document") {
        const doc = await api.getDocument(entry.id);
        return doc.extracted_text ?? "";
      }
      if (entry.kind === "note") {
        const note = await api.getNote(entry.id);
        return note.content ?? "";
      }
      return "";
    },
    { revalidateOnFocus: false },
  );

  const language = extFromPath(entry?.path ?? null);

  if (!entry) {
    return { content: null, language: null, isLoading: false, unavailableReason: null };
  }

  if (entry.kind === "artifact_file") {
    return {
      content: null,
      language,
      isLoading: false,
      unavailableReason: t("files.viewer.artifactUnavailable"),
    };
  }

  if (error) {
    return {
      content: null,
      language,
      isLoading: false,
      unavailableReason:
        error instanceof ApiError ? error.message : t("files.viewer.loadFailed"),
    };
  }

  return {
    content: data ?? null,
    language,
    isLoading,
    unavailableReason: null,
  };
}
