"use client";

/**
 * Destructive project deletion with a type-to-confirm guard.
 *
 * The confirm button stays disabled until the typed text matches the project
 * name exactly. Deleting a project cascades at the DB level to every bounded
 * context (domain), note, task, document and artifact it owns. On success we
 * revalidate the dashboard project-list cache and navigate home.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api } from "@/lib/api";
import type { ProjectRead } from "@/lib/types";
import { useT } from "@/i18n/locale-context";

interface DeleteProjectDialogProps {
  project: ProjectRead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Revalidate every dashboard/files project-list cache entry after a delete. */
function isProjectListKey(key: unknown): boolean {
  return typeof key === "string" && (key === "/projects" || key.startsWith("/projects?"));
}

export function DeleteProjectDialog({ project, open, onOpenChange }: DeleteProjectDialogProps) {
  const t = useT();
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const matches = confirmText.trim() === project.name;

  function handleOpenChange(next: boolean): void {
    if (deleting) return; // don't let the dialog close mid-request
    if (!next) setConfirmText(""); // reset the guard each time it closes
    onOpenChange(next);
  }

  async function confirm(): Promise<void> {
    if (!matches || deleting) return;
    setDeleting(true);
    try {
      await api.deleteProject(project.slug);
      await mutate(isProjectListKey, undefined, { revalidate: true });
      toast.success(t("project.deleteDialog.toastDeleted", { name: project.name }));
      onOpenChange(false);
      setConfirmText("");
      router.push("/");
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : t("project.deleteDialog.toastError"),
      );
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("project.deleteDialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("project.deleteDialog.description", { name: project.name })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="delete-project-confirm">
            {t("project.deleteDialog.confirmPrompt")}
          </Label>
          <p className="rounded-md bg-muted px-2.5 py-1.5 font-mono text-sm font-medium text-foreground">
            {project.name}
          </p>
          <Input
            id="delete-project-confirm"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder={t("project.deleteDialog.placeholder")}
            autoComplete="off"
            autoFocus
            disabled={deleting}
            aria-label={t("project.deleteDialog.confirmPrompt")}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!matches || deleting}
            onClick={(event) => {
              event.preventDefault();
              void confirm();
            }}
          >
            {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
            <span>{deleting ? t("common.deleting") : t("project.deleteDialog.confirm")}</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
