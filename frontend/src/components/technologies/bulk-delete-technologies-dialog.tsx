"use client";

import { useState } from "react";
import { toast } from "sonner";

import { api } from "@/lib/api";
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

interface BulkDeleteTechnologiesDialogProps {
  /** Technologies selected for deletion; when non-empty the dialog is open. */
  technologies: TechnologyRead[];
  onOpenChange: (open: boolean) => void;
  /** Called after the batch completes so the catalogue can refresh + selection clear. */
  onDeleted: () => void;
}

/**
 * Confirms and runs a client-side batch delete over the per-item DELETE endpoint.
 * Rejected items (mostly 409 in-use) are tallied as skipped, reported in one toast.
 */
export function BulkDeleteTechnologiesDialog({
  technologies,
  onOpenChange,
  onDeleted,
}: BulkDeleteTechnologiesDialogProps) {
  const t = useT();
  const [deleting, setDeleting] = useState(false);
  const count = technologies.length;

  async function handleDelete(): Promise<void> {
    if (count === 0 || deleting) return;
    setDeleting(true);
    try {
      const results = await Promise.allSettled(
        technologies.map((tech) => api.deleteTechnology(tech.id)),
      );
      const deleted = results.filter((r) => r.status === "fulfilled").length;
      const skipped = count - deleted;

      if (skipped === 0) {
        toast.success(t("technologies.bulk.resultDeleted", { count: deleted }));
      } else {
        toast.message(t("technologies.bulk.resultPartial", { deleted, skipped }));
      }

      onDeleted();
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={count > 0} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("technologies.bulk.confirmTitle", { count })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("technologies.bulk.confirmDescription")}
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
