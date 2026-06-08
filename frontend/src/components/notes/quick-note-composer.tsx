"use client";

/**
 * Fast-capture composer shown at the top of the Notes tab. Optimistically
 * inserts the new note into the SWR cache, then reconciles with the server
 * response. Built for speed: type → jot → hit save (or Cmd/Ctrl+Enter).
 */

import { useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApiError, api } from "@/lib/api";
import type { DomainRead, NoteCreate, NoteRead } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  EMPTY_NOTE_FORM,
  NO_DOMAIN,
  NoteFormFields,
  type NoteFormValues,
  noteTypeLabel,
  parseTags,
} from "./note-form-fields";

interface QuickNoteComposerProps {
  projectSlug: string;
  domains: DomainRead[];
  /** When set, notes are forced into this domain and the picker is hidden. */
  fixedDomainId?: string;
  /** SWR key the Notes tab uses so this composer can mutate the same cache. */
  notesKey: string;
}

function makeOptimisticNote(
  values: NoteFormValues,
  projectSlug: string,
  fixedDomainId: string | undefined,
  tags: string[],
): NoteRead {
  const now = new Date().toISOString();
  const domainId =
    fixedDomainId ?? (values.domainId === NO_DOMAIN ? null : values.domainId);
  return {
    id: `optimistic-${now}-${Math.random().toString(36).slice(2)}`,
    project_id: projectSlug,
    domain_id: domainId,
    type: values.type,
    title: values.title.trim() || null,
    content: values.content,
    tags,
    created_at: now,
    updated_at: now,
  };
}

export function QuickNoteComposer({
  projectSlug,
  domains,
  fixedDomainId,
  notesKey,
}: QuickNoteComposerProps) {
  const { mutate } = useSWRConfig();
  const [values, setValues] = useState<NoteFormValues>(EMPTY_NOTE_FORM);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSubmit = values.content.trim().length > 0 && !submitting;

  function patch(next: Partial<NoteFormValues>) {
    setValues((prev) => ({ ...prev, ...next }));
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);

    const tags = parseTags(values.tagsInput);
    const optimistic = makeOptimisticNote(values, projectSlug, fixedDomainId, tags);
    const body: NoteCreate = {
      type: values.type,
      content: values.content,
      title: values.title.trim() || null,
      tags,
      domain_id: fixedDomainId ?? (values.domainId === NO_DOMAIN ? null : values.domainId),
    };

    // Optimistic insert at the top of the list.
    mutate(
      notesKey,
      (current: NoteRead[] | undefined) => [optimistic, ...(current ?? [])],
      { revalidate: false },
    );

    try {
      const created = await api.createNote(projectSlug, body);
      // Swap the optimistic entry for the server one, then revalidate.
      mutate(
        notesKey,
        (current: NoteRead[] | undefined) =>
          (current ?? []).map((note) => (note.id === optimistic.id ? created : note)),
        { revalidate: false },
      );
      mutate(notesKey);
      toast.success(`${noteTypeLabel(values.type)} note captured`);
      setValues((prev) => ({
        ...EMPTY_NOTE_FORM,
        // Keep type + domain so rapid same-context capture stays fast.
        type: prev.type,
        domainId: prev.domainId,
      }));
      textareaRef.current?.focus();
    } catch (error) {
      // Roll back the optimistic insert.
      mutate(
        notesKey,
        (current: NoteRead[] | undefined) =>
          (current ?? []).filter((note) => note.id !== optimistic.id),
        { revalidate: false },
      );
      toast.error(
        error instanceof ApiError ? error.message : "Could not save the note",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <Card
      className="gap-0 bg-card/60 px-4 shadow-sm ring-primary/15"
      onKeyDown={onKeyDown}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary">
          <Plus className="size-4" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-medium">Quick note</p>
          <p className="text-xs text-muted-foreground">
            Capture fast — <kbd className="rounded bg-muted px-1 text-[0.7rem]">⌘/Ctrl</kbd>{" "}
            + <kbd className="rounded bg-muted px-1 text-[0.7rem]">Enter</kbd> to save
          </p>
        </div>
      </div>

      <NoteFormFields
        values={values}
        onChange={patch}
        domains={domains}
        lockDomain={Boolean(fixedDomainId)}
        idPrefix="quick-note"
        textareaRef={textareaRef}
      />

      <div className="mt-3 flex items-center justify-end">
        <Button
          type="button"
          size="sm"
          disabled={!canSubmit}
          onClick={() => void submit()}
          className={cn(submitting && "pointer-events-none")}
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          <span>{submitting ? "Saving…" : "Add note"}</span>
        </Button>
      </div>
    </Card>
  );
}
