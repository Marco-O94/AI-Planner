"use client";

import { useState } from "react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { useT } from "@/i18n/locale-context";
import type { NoteTypeRead } from "@/lib/types";
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

interface DeleteNoteTypeDialogProps {
  type: NoteTypeRead | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeleteNoteTypeDialog({
  type,
  onOpenChange,
  onDeleted,
}: DeleteNoteTypeDialogProps) {
  const t = useT();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(): Promise<void> {
    if (!type || deleting) return;
    setDeleting(true);
    try {
      await api.deleteNoteType(type.id);
      toast.success(t("noteTypes.toasts.deleted"));
      onDeleted();
      onOpenChange(false);
    } catch (e) {
      // 409 when notes still use this type — show the server message.
      toast.error(e instanceof ApiError ? e.message : t("noteTypes.toasts.deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={Boolean(type)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("noteTypes.deleteDialog.title", { name: type?.name ?? "" })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("noteTypes.deleteDialog.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleDelete();
            }}
            disabled={deleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {deleting ? t("common.deleting") : t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
