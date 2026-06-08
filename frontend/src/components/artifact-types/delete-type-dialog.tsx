"use client";

import { useState } from "react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { useT } from "@/i18n/locale-context";
import type { ArtifactTypeRead } from "@/lib/types";
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

interface DeleteTypeDialogProps {
  type: ArtifactTypeRead | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeleteTypeDialog({ type, onOpenChange, onDeleted }: DeleteTypeDialogProps) {
  const t = useT();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(): Promise<void> {
    if (!type || deleting) return;
    setDeleting(true);
    try {
      await api.deleteArtifactType(type.id);
      toast.success(t("artifactTypes.toasts.deleted"));
      onDeleted();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t("artifactTypes.toasts.deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={Boolean(type)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("artifactTypes.deleteDialog.title", { name: type?.name ?? "" })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("artifactTypes.deleteDialog.description")}
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
