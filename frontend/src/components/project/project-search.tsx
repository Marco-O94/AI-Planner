"use client";

import { useState } from "react";
import useSWR from "swr";
import { FileText, Layers, Search, StickyNote } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/common";
import { HighlightedSnippet } from "@/components/markdown";
import { AnimatedItem, AnimatedList } from "@/components/motion";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import type { SearchHitRead, SearchKind, SearchMode } from "@/lib/types";

const MODES: { value: SearchMode; label: string }[] = [
  { value: "lexical", label: "Exact words" },
  { value: "semantic", label: "By meaning" },
  { value: "hybrid", label: "Hybrid" },
];

const KIND_META: Record<
  SearchKind,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  note: { label: "Note", icon: StickyNote },
  document: { label: "Document", icon: FileText },
  artifact_file: { label: "Artifact file", icon: Layers },
};

interface ProjectSearchProps {
  projectSlug: string;
}

/**
 * Project-scoped full-text search with a lexical / semantic / hybrid mode
 * toggle. Renders matching notes, documents and artifact files with highlighted
 * snippets. Debounced; only queries once at least two characters are entered.
 */
export function ProjectSearch({ projectSlug }: ProjectSearchProps) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("hybrid");
  const debounced = useDebounce(query.trim(), 300);
  const active = debounced.length >= 2;

  const key = active
    ? `/search?q=${encodeURIComponent(debounced)}&mode=${mode}&project_slug=${projectSlug}`
    : null;
  const { data, isLoading } = useSWR<SearchHitRead[]>(key);

  return (
    <Card className="gap-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes, documents and artifact files…"
            className="h-9 pl-9"
            aria-label="Search this project"
          />
        </div>
        <div
          role="tablist"
          aria-label="Search mode"
          className="inline-flex shrink-0 rounded-lg border border-border bg-muted/50 p-0.5"
        >
          {MODES.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={mode === option.value}
              onClick={() => setMode(option.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                mode === option.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {active ? (
        <SearchResults
          projectSlug={projectSlug}
          hits={data}
          isLoading={isLoading}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Type at least two characters to search this project.
        </p>
      )}
    </Card>
  );
}

function SearchResults({
  projectSlug,
  hits,
  isLoading,
}: {
  projectSlug: string;
  hits: SearchHitRead[] | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!hits?.length) {
    return (
      <EmptyState
        icon={Search}
        title="No matches"
        description="Try a different query or switch the search mode."
        className="py-10"
      />
    );
  }

  return (
    <AnimatedList className="space-y-2">
      {hits.map((hit) => (
        <AnimatedItem key={`${hit.kind}-${hit.id}`}>
          <SearchHit projectSlug={projectSlug} hit={hit} />
        </AnimatedItem>
      ))}
    </AnimatedList>
  );
}

function hitHref(projectSlug: string, hit: SearchHitRead): string {
  const tab =
    hit.kind === "note" ? "notes" : hit.kind === "document" ? "documents" : "artifacts";
  return `/projects/${projectSlug}?tab=${tab}`;
}

function SearchHit({
  projectSlug,
  hit,
}: {
  projectSlug: string;
  hit: SearchHitRead;
}) {
  const meta = KIND_META[hit.kind];
  const Icon = meta.icon;
  return (
    <a
      href={hitHref(projectSlug, hit)}
      className={cn(
        "block rounded-lg border border-border bg-background p-3 transition-colors",
        "hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {meta.label}
        </span>
        <span className="truncate text-sm font-medium text-foreground">
          {hit.title || "Untitled"}
        </span>
        {hit.path ? (
          <span className="ml-auto truncate font-mono text-xs text-muted-foreground">
            {hit.path}
          </span>
        ) : null}
      </div>
      {hit.snippet ? (
        <HighlightedSnippet snippet={hit.snippet} className="mt-1.5 line-clamp-2" />
      ) : null}
    </a>
  );
}
