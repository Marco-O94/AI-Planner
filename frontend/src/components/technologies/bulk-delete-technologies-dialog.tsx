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

interface BulkDeleteTechnologiesDialogProps {
  /** Technologies selected for deletion; when non-empty the dialog is open. */
  technologies: TechnologyRead[];
  onOpenChange: (open: boolean) => void;
  /** Called after the batch completes so the catalogue can refresh + selection clear. */
  onDeleted: () => void;
}

/** HTTP status the API returns when a technology is still used by a project. */
const STATUS_IN_USE = 409;

/** True when a rejected delete is the expected "still in use" skip, not a real error. */
function isInUseRejection(reason: unknown): boolean {
  return reason instanceof ApiError && reason.status === STATUS_IN_USE;
}

/**
 * Confirms and runs a client-side batch delete over the per-item DELETE endpoint.
 * In-use items (409) are tallied as skipped; any other rejection (network, 401,
 * 500, timeout) is surfaced as a genuine failure so real outages are not hidden.
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
      const rejections = results.filter((r) => r.status === "rejected");
      const skipped = rejections.filter((r) => isInUseRejection(r.reason)).length;
      const failed = rejections.length - skipped;

      if (skipped > 0) {
        toast.message(t("technologies.bulk.resultPartial", { deleted, skipped }));
      } else if (deleted > 0) {
        toast.success(t("technologies.bulk.resultDeleted", { count: deleted }));
      }

      // Genuine failures (network, 401, 500, timeout) must not be hidden as "in use".
      if (failed > 0) {
        toast.error(t("technologies.bulk.resultFailed", { failed }));
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
