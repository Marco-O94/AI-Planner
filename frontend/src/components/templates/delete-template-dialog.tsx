"use client";

import { useState } from "react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { useT } from "@/i18n/locale-context";
import type { TemplateRead } from "@/lib/types";
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

interface DeleteTemplateDialogProps {
  template: TemplateRead | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeleteTemplateDialog({
  template,
  onOpenChange,
  onDeleted,
}: DeleteTemplateDialogProps) {
  const t = useT();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(): Promise<void> {
    if (!template || deleting) return;
    setDeleting(true);
    try {
      await api.deleteTemplate(template.id);
      toast.success(t("templates.toasts.deleted"));
      onDeleted();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t("templates.toasts.deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={Boolean(template)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("templates.deleteDialog.title", { name: template?.name ?? "" })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("templates.deleteDialog.description")}
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
