"use client";

import useSWR from "swr";

import type { FileGroupRead, SearchKind, SearchMode } from "@/lib/types";

import { ALL_KINDS, ALL_PROJECTS } from "./types";

export interface FilesQueryInput {
  projectSlug: string;
  q: string;
  mode: SearchMode;
  kind: SearchKind | typeof ALL_KINDS;
  tag: string;
}

/**
 * Build the `/files` request path (with query string) used as the SWR key, so
 * the global fetcher resolves it. The backend ignores `mode` (lexical-only), but
 * we still include it so the cache key reflects the user's choice and the UI is
 * forward-compatible once semantic ranking lands.
 */
export function buildFilesKey({
  projectSlug,
  q,
  mode,
  kind,
  tag,
}: FilesQueryInput): string {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (q.trim()) params.set("mode", mode);
  if (kind !== ALL_KINDS) params.set("kind", kind);
  if (tag) params.set("tag", tag);

  const base =
    projectSlug === ALL_PROJECTS
      ? "/files"
      : `/projects/${encodeURIComponent(projectSlug)}/files`;
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export interface FilesQueryResult {
  groups: FileGroupRead[] | undefined;
  isLoading: boolean;
  error: unknown;
}

/** Fetch grouped saved files for the current filter/search state. */
export function useFilesQuery(input: FilesQueryInput): FilesQueryResult {
  const key = buildFilesKey(input);
  const { data, isLoading, error } = useSWR<FileGroupRead[]>(key, {
    keepPreviousData: true,
  });

  return { groups: data, isLoading, error };
}
