"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { FileText, SearchX } from "lucide-react";

import { EmptyState } from "@/components/common";
import { AnimatedItem, AnimatedList, FadeIn } from "@/components/motion";
import { Accordion } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import type {
  FileEntryRead,
  FileGroupRead,
  ProjectRead,
  SearchKind,
  SearchMode,
} from "@/lib/types";

import { FileFilters } from "./file-filters";
import { FileGroupSection } from "./file-group-section";
import { FileRow } from "./file-row";
import { FileSearchBar } from "./file-search-bar";
import { FileViewerSheet } from "./file-viewer-sheet";
import { ALL_KINDS, ALL_PROJECTS } from "./types";
import { useFilesQuery } from "./use-files-query";

/** Collect a sorted, de-duplicated tag list from the loaded file groups. */
function deriveTags(groups: FileGroupRead[] | undefined): string[] {
  if (!groups) return [];
  const set = new Set<string>();
  for (const group of groups) {
    for (const file of group.files) {
      for (const tag of file.tags) set.add(tag);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function countFiles(groups: FileGroupRead[] | undefined): number {
  if (!groups) return 0;
  return groups.reduce((total, group) => total + group.files.length, 0);
}

export function FilesExplorer() {
  const [rawQuery, setRawQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("hybrid");
  const [projectSlug, setProjectSlug] = useState<string>(ALL_PROJECTS);
  const [kind, setKind] = useState<SearchKind | typeof ALL_KINDS>(ALL_KINDS);
  const [tag, setTag] = useState("");
  const [activeEntry, setActiveEntry] = useState<FileEntryRead | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const query = useDebounce(rawQuery, 300);
  const isSearching = rawQuery !== query;
  const hasQuery = Boolean(query.trim());

  const { data: projects } = useSWR<ProjectRead[]>("/projects");
  const { groups, isLoading, error } = useFilesQuery({
    projectSlug,
    q: query,
    mode,
    kind,
    tag,
  });

  const availableTags = useMemo(() => deriveTags(groups), [groups]);
  const total = countFiles(groups);

  const projectNameBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of groups ?? []) map.set(group.project_slug, group.project_name);
    return map;
  }, [groups]);

  function openEntry(entry: FileEntryRead) {
    setActiveEntry(entry);
    setViewerOpen(true);
  }

  const activeProjectName = activeEntry
    ? findProjectNameForEntry(groups, activeEntry)
    : undefined;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <FileSearchBar
          query={rawQuery}
          onQueryChange={setRawQuery}
          mode={mode}
          onModeChange={setMode}
          isSearching={isSearching}
        />
        <FileFilters
          projects={projects ?? []}
          projectSlug={projectSlug}
          onProjectChange={setProjectSlug}
          kind={kind}
          onKindChange={setKind}
          tag={tag}
          onTagChange={setTag}
          availableTags={availableTags}
        />
        {!isLoading && groups ? (
          <p className="text-xs text-muted-foreground">
            {total} {total === 1 ? "file" : "files"}
            {hasQuery ? " matching your search" : null}
            {groups.length > 1 ? ` across ${groups.length} projects` : null}
          </p>
        ) : null}
      </div>

      <FilesBody
        isLoading={isLoading}
        error={error}
        groups={groups}
        hasQuery={hasQuery}
        onOpen={openEntry}
        projectNameBySlug={projectNameBySlug}
      />

      <FileViewerSheet
        entry={activeEntry}
        projectName={activeProjectName}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    </div>
  );
}

function findProjectNameForEntry(
  groups: FileGroupRead[] | undefined,
  entry: FileEntryRead,
): string | undefined {
  for (const group of groups ?? []) {
    if (group.files.some((file) => file.id === entry.id && file.kind === entry.kind)) {
      return group.project_name;
    }
  }
  return undefined;
}

interface FilesBodyProps {
  isLoading: boolean;
  error: unknown;
  groups: FileGroupRead[] | undefined;
  hasQuery: boolean;
  onOpen: (entry: FileEntryRead) => void;
  projectNameBySlug: Map<string, string>;
}

function FilesBody({
  isLoading,
  error,
  groups,
  hasQuery,
  onOpen,
  projectNameBySlug,
}: FilesBodyProps) {
  if (isLoading && !groups) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={SearchX}
        title="Couldn't load files"
        description="Something went wrong while fetching saved files. Try again in a moment."
      />
    );
  }

  if (!groups || groups.length === 0) {
    return hasQuery ? (
      <EmptyState
        icon={SearchX}
        title="No matches"
        description="No file contents match your search. Try a different query or switch the search mode."
      />
    ) : (
      <EmptyState
        icon={FileText}
        title="No saved files yet"
        description="Upload documents or generate artifacts in a project and they'll show up here, grouped by project."
      />
    );
  }

  // Search view: flat, relevance-ordered results with project context.
  if (hasQuery) {
    const entries = groups.flatMap((group) =>
      group.files.map((file) => ({ file, projectSlug: group.project_slug })),
    );
    return (
      <FadeIn>
        <AnimatedList className="flex flex-col gap-2">
          {entries.map(({ file, projectSlug }) => (
            <AnimatedItem key={`${file.kind}-${file.id}`}>
              <FileRow
                entry={file}
                projectName={projectNameBySlug.get(projectSlug)}
                onOpen={onOpen}
              />
            </AnimatedItem>
          ))}
        </AnimatedList>
      </FadeIn>
    );
  }

  // Browse view: collapsible per-project sections.
  return (
    <FadeIn>
      <Accordion
        type="multiple"
        defaultValue={groups.slice(0, 4).map((group) => group.project_slug)}
        className="gap-3"
      >
        {groups.map((group) => (
          <FileGroupSection key={group.project_slug} group={group} onOpen={onOpen} />
        ))}
      </Accordion>
    </FadeIn>
  );
}
