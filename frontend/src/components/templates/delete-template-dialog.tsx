"use client";

import { useState } from "react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
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
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(): Promise<void> {
    if (!template || deleting) return;
    setDeleting(true);
    try {
      await api.deleteTemplate(template.id);
      toast.success("Template deleted");
      onDeleted();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not delete template");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={Boolean(template)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &ldquo;{template?.name}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the template. Projects already created from it are not
            affected. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleDelete();
            }}
            disabled={deleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {deleting ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
