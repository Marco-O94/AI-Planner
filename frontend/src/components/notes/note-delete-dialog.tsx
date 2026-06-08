"use client";

/**
 * Confirm + perform note deletion. Optimistically removes the note from the
 * shared Notes SWR cache and restores it if the request fails.
 */

import { useState } from "react";
import { useSWRConfig } from "swr";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ApiError, api } from "@/lib/api";
import type { NoteRead } from "@/lib/types";
import { useT } from "@/i18n/locale-context";

interface NoteDeleteDialogProps {
  note: NoteRead | null;
  notesKey: string;
  onClose: () => void;
}

export function NoteDeleteDialog({ note, notesKey, onClose }: NoteDeleteDialogProps) {
  const t = useT();
  const { mutate } = useSWRConfig();
  const [deleting, setDeleting] = useState(false);

  async function confirm() {
    if (!note) return;
    setDeleting(true);

    mutate(
      notesKey,
      (current: NoteRead[] | undefined) =>
        (current ?? []).filter((item) => item.id !== note.id),
      { revalidate: false },
    );

    try {
      await api.deleteNote(note.id);
      mutate(notesKey);
      toast.success(t("notes.toasts.deleted"));
      onClose();
    } catch (error) {
      // Restore the removed note on failure.
      mutate(
        notesKey,
        (current: NoteRead[] | undefined) => [note, ...(current ?? [])],
        { revalidate: false },
      );
      mutate(notesKey);
      toast.error(error instanceof ApiError ? error.message : t("notes.toasts.deleteFailed"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={Boolean(note)} onOpenChange={(open) => (open ? null : onClose())}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("notes.remove.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {note?.title
              ? t("notes.remove.descriptionNamed", { title: note.title })
              : t("notes.remove.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleting}
            onClick={(event) => {
              event.preventDefault();
              void confirm();
            }}
          >
            {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
            <span>{deleting ? t("common.deleting") : t("notes.remove.deleteNote")}</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
