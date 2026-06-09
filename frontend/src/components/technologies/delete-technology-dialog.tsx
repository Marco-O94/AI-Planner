"use client";

import { useState } from "react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { useT } from "@/i18n/locale-context";
import type { TechnologyRead } from "@/lib/types";
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

interface DeleteTechnologyDialogProps {
  technology: TechnologyRead | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeleteTechnologyDialog({
  technology,
  onOpenChange,
  onDeleted,
}: DeleteTechnologyDialogProps) {
  const t = useT();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(): Promise<void> {
    if (!technology || deleting) return;
    setDeleting(true);
    try {
      await api.deleteTechnology(technology.id);
      toast.success(t("technologies.toasts.deleted"));
      onDeleted();
      onOpenChange(false);
    } catch (e) {
      // 409 when projects still use this technology — show the server message.
      toast.error(
        e instanceof ApiError ? e.message : t("technologies.toasts.deleteError"),
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={Boolean(technology)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("technologies.deleteDialog.title", { name: technology?.name ?? "" })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("technologies.deleteDialog.description")}
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
