"use client";

import { useState } from "react";
import useSWR from "swr";
import { FileText, Layers, Search, StickyNote } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/common";
import { useT } from "@/i18n/locale-context";
import { HighlightedSnippet } from "@/components/markdown";
import { AnimatedItem, AnimatedList } from "@/components/motion";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import type { SearchHitRead, SearchKind, SearchMode } from "@/lib/types";

const MODES: { value: SearchMode; labelKey: string }[] = [
  { value: "lexical", labelKey: "project.search.modeExact" },
  { value: "semantic", labelKey: "project.search.modeMeaning" },
  { value: "hybrid", labelKey: "project.search.modeHybrid" },
];

const KIND_META: Record<
  SearchKind,
  { labelKey: string; icon: React.ComponentType<{ className?: string }> }
> = {
  note: { labelKey: "project.search.kindNote", icon: StickyNote },
  document: { labelKey: "project.search.kindDocument", icon: FileText },
  artifact_file: { labelKey: "project.search.kindArtifactFile", icon: Layers },
};

interface ProjectSearchButtonProps {
  projectSlug: string;
}

/**
 * Slim search trigger for the project header. Opens project-scoped full-text
 * search (lexical / semantic / hybrid) in a Sheet so the results never crowd
 * the working surface.
 */
export function ProjectSearchButton({ projectSlug }: ProjectSearchButtonProps) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={t("project.search.triggerAria")}
          className="gap-1.5"
        >
          <Search className="size-3.5" />
          <span className="hidden sm:inline">{t("common.search")}</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full gap-0 sm:max-w-lg"
        aria-describedby={undefined}
      >
        <SheetHeader className="gap-1">
          <SheetTitle>{t("project.search.title")}</SheetTitle>
        </SheetHeader>
        {open ? <ProjectSearchPanel projectSlug={projectSlug} /> : null}
      </SheetContent>
    </Sheet>
  );
}

interface ProjectSearchPanelProps {
  projectSlug: string;
}

/**
 * Project-scoped full-text search with a lexical / semantic / hybrid mode
 * toggle. Renders matching notes, documents and artifact files with highlighted
 * snippets. Debounced; only queries once at least two characters are entered.
 */
function ProjectSearchPanel({ projectSlug }: ProjectSearchPanelProps) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("hybrid");
  const debounced = useDebounce(query.trim(), 300);
  const active = debounced.length >= 2;

  const key = active
    ? `/search?q=${encodeURIComponent(debounced)}&mode=${mode}&project_slug=${projectSlug}`
    : null;
  const { data, isLoading } = useSWR<SearchHitRead[]>(key);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4">
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("project.search.inputPlaceholder")}
            className="h-9 pl-9"
            aria-label={t("project.search.triggerAria")}
            autoFocus
          />
        </div>
        <div
          role="tablist"
          aria-label={t("project.search.modeAria")}
          className="inline-flex w-full rounded-lg border border-border bg-muted/50 p-0.5"
        >
          {MODES.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={mode === option.value}
              onClick={() => setMode(option.value)}
              className={cn(
                "flex-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                mode === option.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {active ? (
        <ScrollArea className="-mx-1 flex-1 px-1">
          <SearchResults projectSlug={projectSlug} hits={data} isLoading={isLoading} />
        </ScrollArea>
      ) : (
        <p className="text-sm text-muted-foreground">{t("project.search.hint")}</p>
      )}
    </div>
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
  const t = useT();
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
        title={t("project.search.noMatchesTitle")}
        description={t("project.search.noMatchesDescription")}
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
  const t = useT();
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
          {t(meta.labelKey)}
        </span>
        <span className="truncate text-sm font-medium text-foreground">
          {hit.title || t("project.search.untitled")}
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
