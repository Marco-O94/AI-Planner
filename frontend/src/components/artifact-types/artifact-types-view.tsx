"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Layers, Plus } from "lucide-react";

import type { ArtifactTypeRead } from "@/lib/types";
import { PageHeader, EmptyState } from "@/components/common";
import { AnimatedList, AnimatedItem } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArtifactTypeCard } from "@/components/artifact-types/artifact-type-card";
import { ArtifactTypeDialog } from "@/components/artifact-types/artifact-type-dialog";
import { DeleteTypeDialog } from "@/components/artifact-types/delete-type-dialog";

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

function LoadingGrid() {
  return (
    <div className={GRID}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-52 rounded-xl" />
      ))}
    </div>
  );
}

export function ArtifactTypesView() {
  const { data, error, isLoading, mutate } = useSWR<ArtifactTypeRead[]>("/artifact-types");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ArtifactTypeRead | null>(null);
  const [deleting, setDeleting] = useState<ArtifactTypeRead | null>(null);

  // Defaults first, then user types alphabetically — stable, predictable order.
  const types = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [data]);

  function openCreate(): void {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(type: ArtifactTypeRead): void {
    setEditing(type);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Artifact types"
        description="Define reusable artifact blueprints — generation instructions and a declared file manifest. The built-in default is read-only."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            New type
          </Button>
        }
      />

      {isLoading ? (
        <LoadingGrid />
      ) : error ? (
        <EmptyState
          icon={Layers}
          title="Couldn't load artifact types"
          description="The backend may be unavailable. Try again in a moment."
          action={
            <Button variant="outline" onClick={() => void mutate()}>
              Retry
            </Button>
          }
        />
      ) : types.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No artifact types yet"
          description="Create your first artifact type to tell the agent how to generate it and which files to produce."
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              New type
            </Button>
          }
        />
      ) : (
        <AnimatedList className={GRID}>
          {types.map((type) => (
            <AnimatedItem key={type.id} className="h-full">
              <ArtifactTypeCard type={type} onEdit={openEdit} onDelete={setDeleting} />
            </AnimatedItem>
          ))}
        </AnimatedList>
      )}

      <ArtifactTypeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        type={editing}
        onSaved={() => void mutate()}
      />

      <DeleteTypeDialog
        type={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onDeleted={() => void mutate()}
      />
    </div>
  );
}
