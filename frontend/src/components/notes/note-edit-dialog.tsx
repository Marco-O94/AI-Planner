"use client";

/**
 * Edit an existing note in a Dialog. On save, PATCHes via api.updateNote and
 * mutates the shared Notes SWR cache; rolls back the optimistic update on error.
 */

import { useEffect, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
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
import type { DomainRead, NoteRead, NoteTypeRead, NoteUpdate } from "@/lib/types";
import { useT } from "@/i18n/locale-context";
import {
  NO_DOMAIN,
  NoteFormFields,
  type NoteFormValues,
  parseTags,
} from "./note-form-fields";

interface NoteEditDialogProps {
  note: NoteRead | null;
  domains: DomainRead[];
  projectSlug: string;
  notesKey: string;
  onClose: () => void;
}

function toFormValues(note: NoteRead): NoteFormValues {
  return {
    type: note.type.slug,
    title: note.title ?? "",
    content: note.content,
    tagsInput: note.tags.join(" "),
    domainId: note.domain_id ?? NO_DOMAIN,
  };
}

export function NoteEditDialog({
  note,
  domains,
  projectSlug,
  notesKey,
  onClose,
}: NoteEditDialogProps) {
  const t = useT();
  const { mutate } = useSWRConfig();
  const [values, setValues] = useState<NoteFormValues>(() =>
    note
      ? toFormValues(note)
      : { type: "", title: "", content: "", tagsInput: "", domainId: NO_DOMAIN },
  );
  const [saving, setSaving] = useState(false);

  const { data: noteTypes } = useSWR<NoteTypeRead[]>(
    `/projects/${projectSlug}/note-types`,
  );

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
    // Build the embedded type ref from the loaded list; keep the current one
    // when the chosen slug isn't loaded yet (badge reconciles on revalidate).
    const chosen = (noteTypes ?? []).find((type) => type.slug === values.type);
    const optimistic: NoteRead = {
      ...note,
      note_type_id: chosen ? chosen.id : note.note_type_id,
      type: chosen
        ? {
            id: chosen.id,
            key: chosen.key,
            slug: chosen.slug,
            name: chosen.name,
            color: chosen.color,
          }
        : note.type,
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
      toast.success(t("notes.toasts.updated"));
      onClose();
    } catch (error) {
      mutate(
        notesKey,
        (current: NoteRead[] | undefined) =>
          (current ?? []).map((item) => (item.id === note.id ? note : item)),
        { revalidate: false },
      );
      toast.error(error instanceof ApiError ? error.message : t("notes.toasts.updateFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(note)} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("notes.edit.title")}</DialogTitle>
          <DialogDescription>{t("notes.edit.description")}</DialogDescription>
        </DialogHeader>

        <NoteFormFields
          values={values}
          onChange={patch}
          domains={domains}
          projectSlug={projectSlug}
          idPrefix="edit-note"
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={() => void save()} disabled={!canSave}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            <span>{saving ? t("common.saving") : t("common.saveChanges")}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
