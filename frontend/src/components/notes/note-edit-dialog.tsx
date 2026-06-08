"use client";

/**
 * Edit an existing note in a Dialog. On save, PATCHes via api.updateNote and
 * mutates the shared Notes SWR cache; rolls back the optimistic update on error.
 */

import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";
import type { DomainRead, NoteRead, NoteUpdate } from "@/lib/types";
import {
  NO_DOMAIN,
  NoteFormFields,
  type NoteFormValues,
  parseTags,
} from "./note-form-fields";

interface NoteEditDialogProps {
  note: NoteRead | null;
  domains: DomainRead[];
  notesKey: string;
  onClose: () => void;
}

function toFormValues(note: NoteRead): NoteFormValues {
  return {
    type: note.type,
    title: note.title ?? "",
    content: note.content,
    tagsInput: note.tags.join(" "),
    domainId: note.domain_id ?? NO_DOMAIN,
  };
}

export function NoteEditDialog({
  note,
  domains,
  notesKey,
  onClose,
}: NoteEditDialogProps) {
  const { mutate } = useSWRConfig();
  const [values, setValues] = useState<NoteFormValues>(() =>
    note ? toFormValues(note) : { type: "REQUIREMENT", title: "", content: "", tagsInput: "", domainId: NO_DOMAIN },
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (note) setValues(toFormValues(note));
  }, [note]);

  const canSave = Boolean(note) && values.content.trim().length > 0 && !saving;

  function patch(next: Partial<NoteFormValues>) {
    setValues((prev) => ({ ...prev, ...next }));
  }

  async function save() {
    if (!note || !canSave) return;
    setSaving(true);

    const tags = parseTags(values.tagsInput);
    const body: NoteUpdate = {
      type: values.type,
      content: values.content,
      title: values.title.trim() || null,
      tags,
      domain_id: values.domainId === NO_DOMAIN ? null : values.domainId,
    };
    const optimistic: NoteRead = {
      ...note,
      type: values.type,
      content: values.content,
      title: values.title.trim() || null,
      tags,
      domain_id: values.domainId === NO_DOMAIN ? null : values.domainId,
      updated_at: new Date().toISOString(),
    };

    mutate(
      notesKey,
      (current: NoteRead[] | undefined) =>
        (current ?? []).map((item) => (item.id === note.id ? optimistic : item)),
      { revalidate: false },
    );

    try {
      const updated = await api.updateNote(note.id, body);
      mutate(
        notesKey,
        (current: NoteRead[] | undefined) =>
          (current ?? []).map((item) => (item.id === note.id ? updated : item)),
        { revalidate: false },
      );
      mutate(notesKey);
      toast.success("Note updated");
      onClose();
    } catch (error) {
      mutate(
        notesKey,
        (current: NoteRead[] | undefined) =>
          (current ?? []).map((item) => (item.id === note.id ? note : item)),
        { revalidate: false },
      );
      toast.error(error instanceof ApiError ? error.message : "Could not update the note");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(note)} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit note</DialogTitle>
          <DialogDescription>Update the type, content, tags, or domain.</DialogDescription>
        </DialogHeader>

        <NoteFormFields
          values={values}
          onChange={patch}
          domains={domains}
          idPrefix="edit-note"
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void save()} disabled={!canSave}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            <span>{saving ? "Saving…" : "Save changes"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
