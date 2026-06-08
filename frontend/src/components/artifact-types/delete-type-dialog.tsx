"use client";

import { useState } from "react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
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
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(): Promise<void> {
    if (!type || deleting) return;
    setDeleting(true);
    try {
      await api.deleteArtifactType(type.id);
      toast.success("Artifact type deleted");
      onDeleted();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not delete artifact type");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={Boolean(type)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &ldquo;{type?.name}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the artifact type. Existing artifacts already generated
            from it are not affected. This action cannot be undone.
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
