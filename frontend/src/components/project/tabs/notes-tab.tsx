"use client";

/**
 * Notes tab for the project view. Lists notes (scoped to a domain when
 * `domainId` is set), grouped + labelled by note type, with a quick-note
 * composer at the top and an item→artifact preview on click.
 */

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { NotebookPen, StickyNote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/common";
import { NoteTypeBadge } from "@/components/status-badge";
import { AnimatedList, AnimatedItem, AnimatePresence } from "@/components/motion";
import { ItemArtifactPreview } from "@/components/project/item-artifact-preview";
import type { TabProps } from "@/components/project/types";
import type { NoteRead, NoteTypeRead } from "@/lib/types";
import { useT } from "@/i18n/locale-context";

import { QuickNoteComposer } from "@/components/notes/quick-note-composer";
import { NoteCard } from "@/components/notes/note-card";
import { NoteEditDialog } from "@/components/notes/note-edit-dialog";
import { NoteDeleteDialog } from "@/components/notes/note-delete-dialog";
import { NotesFilterBar } from "@/components/notes/notes-filter-bar";

/** Notes revealed per "Load more" step (filtering/grouping stays client-side). */
const PAGE_SIZE = 30;

function matchesQuery(note: NoteRead, query: string): boolean {
  if (!query) return true;
  const needle = query.toLowerCase();
  return (
    (note.title?.toLowerCase().includes(needle) ?? false) ||
    note.content.toLowerCase().includes(needle) ||
    note.tags.some((tag) => tag.toLowerCase().includes(needle))
  );
}

export function NotesTab({ project, domains, domainId }: TabProps) {
  const t = useT();
  // SWR key is the backend path string; the global fetcher resolves it.
  const notesKey = `/projects/${project.slug}/notes`;
  const { data, isLoading, error } = useSWR<NoteRead[]>(notesKey);

  const { data: noteTypes } = useSWR<NoteTypeRead[]>(
    `/projects/${project.slug}/note-types`,
  );
  const types = useMemo(() => {
    const list = noteTypes ?? [];
    return [...list].sort((a, b) => {
      if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [noteTypes]);

  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<string | "ALL">("ALL");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState<NoteRead | null>(null);
  const [deleteNote, setDeleteNote] = useState<NoteRead | null>(null);

  const domainById = useMemo(
    () => new Map(domains.map((domain) => [domain.id, domain])),
    [domains],
  );

  // Scope to the active domain (domain page), then apply search + type filters.
  const scoped = useMemo(
    () => (data ?? []).filter((note) => !domainId || note.domain_id === domainId),
    [data, domainId],
  );

  const counts = useMemo(() => {
    const next: Record<string, number> = {};
    for (const note of scoped) {
      next[note.type.slug] = (next[note.type.slug] ?? 0) + 1;
    }
    return next;
  }, [scoped]);

  const filtered = useMemo(
    () =>
      scoped.filter(
        (note) =>
          (activeType === "ALL" || note.type.slug === activeType) &&
          matchesQuery(note, query),
      ),
    [scoped, activeType, query],
  );

  // A narrower search/filter changes which notes match — start the page over.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, activeType]);

  // Paginate the FILTERED flat list before grouping so the count is global.
  const visible = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );
  const hasMore = filtered.length > visibleCount;

  const grouped = useMemo(
    () =>
      types
        .map((type) => ({
          type,
          notes: visible.filter((note) => note.type.slug === type.slug),
        }))
        .filter((group) => group.notes.length > 0),
    [types, visible],
  );

  const previewNote = previewId
    ? scoped.find((note) => note.id === previewId)
    : undefined;

  return (
    <div className="space-y-6">
      <QuickNoteComposer
        projectSlug={project.slug}
        domains={domains}
        fixedDomainId={domainId}
        notesKey={notesKey}
      />

      {error ? (
        <EmptyState
          icon={StickyNote}
          title={t("notes.emptyError.title")}
          description={t("notes.emptyError.description")}
        />
      ) : isLoading && !data ? (
        <NotesSkeleton />
      ) : scoped.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title={t("notes.empty.title")}
          description={t("notes.empty.description")}
        />
      ) : (
        <div className="space-y-5">
          <NotesFilterBar
            query={query}
            onQueryChange={setQuery}
            activeType={activeType}
            onTypeChange={setActiveType}
            types={types}
            counts={counts}
            total={scoped.length}
          />

          {filtered.length === 0 ? (
            <EmptyState
              icon={StickyNote}
              title={t("notes.emptyFiltered.title")}
              description={t("notes.emptyFiltered.description")}
            />
          ) : (
            <div className="space-y-6">
              {grouped.map((group) => (
                <section key={group.type.id} className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <NoteTypeBadge
                      type={{
                        id: group.type.id,
                        key: group.type.key,
                        slug: group.type.slug,
                        name: group.type.name,
                        color: group.type.color,
                      }}
                    />
                    <Separator className="flex-1" />
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {group.notes.length}
                    </span>
                  </div>
                  <AnimatedList className="space-y-2.5">
                    <AnimatePresence mode="popLayout" initial={false}>
                      {group.notes.map((note) => (
                        <AnimatedItem key={note.id} layout>
                          <NoteCard
                            note={note}
                            domain={
                              note.domain_id
                                ? domainById.get(note.domain_id)
                                : undefined
                            }
                            onOpen={() => setPreviewId(note.id)}
                            onEdit={() => setEditNote(note)}
                            onDelete={() => setDeleteNote(note)}
                          />
                        </AnimatedItem>
                      ))}
                    </AnimatePresence>
                  </AnimatedList>
                </section>
              ))}

              {hasMore ? (
                <div className="flex flex-col items-center gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                    {t("notes.pagination.loadMore")}
                  </Button>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {t("notes.pagination.showing", {
                      visible: visible.length,
                      total: filtered.length,
                    })}
                  </span>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      <ItemArtifactPreview
        kind="note"
        itemId={previewId}
        title={previewNote?.title || t("notes.previewFallback")}
        projectSlug={project.slug}
        onClose={() => setPreviewId(null)}
      />

      <NoteEditDialog
        note={editNote}
        domains={domains}
        projectSlug={project.slug}
        notesKey={notesKey}
        onClose={() => setEditNote(null)}
      />

      <NoteDeleteDialog
        note={deleteNote}
        notesKey={notesKey}
        onClose={() => setDeleteNote(null)}
      />
    </div>
  );
}

function NotesSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}
