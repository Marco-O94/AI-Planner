"use client";

/**
 * Notes tab for the project view. Lists notes (scoped to a domain when
 * `domainId` is set), grouped + labelled by note type, with a quick-note
 * composer at the top and an item→artifact preview on click.
 */

import { useMemo, useState } from "react";
import useSWR from "swr";
import { NotebookPen, StickyNote } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/common";
import { NoteTypeBadge } from "@/components/status-badge";
import { AnimatedList, AnimatedItem, AnimatePresence } from "@/components/motion";
import { ItemArtifactPreview } from "@/components/project/item-artifact-preview";
import type { TabProps } from "@/components/project/types";
import { NOTE_TYPES, type NoteRead, type NoteType } from "@/lib/types";
import { useT } from "@/i18n/locale-context";

import { QuickNoteComposer } from "@/components/notes/quick-note-composer";
import { NoteCard } from "@/components/notes/note-card";
import { NoteEditDialog } from "@/components/notes/note-edit-dialog";
import { NoteDeleteDialog } from "@/components/notes/note-delete-dialog";
import { NotesFilterBar } from "@/components/notes/notes-filter-bar";

function emptyCounts(): Record<NoteType, number> {
  return {
    REQUIREMENT: 0,
    CONSTRAINT: 0,
    DECISION: 0,
    QUESTION: 0,
    SNIPPET: 0,
    REFERENCE: 0,
  };
}

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

  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<NoteType | "ALL">("ALL");
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
    const next = emptyCounts();
    for (const note of scoped) next[note.type] += 1;
    return next;
  }, [scoped]);

  const filtered = useMemo(
    () =>
      scoped.filter(
        (note) =>
          (activeType === "ALL" || note.type === activeType) &&
          matchesQuery(note, query),
      ),
    [scoped, activeType, query],
  );

  const grouped = useMemo(() => {
    return NOTE_TYPES.map((type) => ({
      type,
      notes: filtered.filter((note) => note.type === type),
    })).filter((group) => group.notes.length > 0);
  }, [filtered]);

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
                <section key={group.type} className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <NoteTypeBadge type={group.type} />
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
