"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { FolderGit2, Plus } from "lucide-react";

import type { TemplateRead } from "@/lib/types";
import { PageHeader, EmptyState } from "@/components/common";
import { AnimatedList, AnimatedItem } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TemplateCard } from "@/components/templates/template-card";
import { TemplateDialog } from "@/components/templates/template-dialog";
import { DeleteTemplateDialog } from "@/components/templates/delete-template-dialog";

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

function LoadingGrid() {
  return (
    <div className={GRID}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-48 rounded-xl" />
      ))}
    </div>
  );
}

export function TemplatesView() {
  const { data, error, isLoading, mutate } = useSWR<TemplateRead[]>("/templates");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateRead | null>(null);
  const [deleting, setDeleting] = useState<TemplateRead | null>(null);

  const templates = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  function openCreate(): void {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(template: TemplateRead): void {
    setEditing(template);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Templates"
        description="Reusable project blueprints. Start a new project from a template, or save an existing project as one from its overview."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            New template
          </Button>
        }
      />

      {isLoading ? (
        <LoadingGrid />
      ) : error ? (
        <EmptyState
          icon={FolderGit2}
          title="Couldn't load templates"
          description="The backend may be unavailable. Try again in a moment."
          action={
            <Button variant="outline" onClick={() => void mutate()}>
              Retry
            </Button>
          }
        />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={FolderGit2}
          title="No templates yet"
          description="Create a template here, or use “Save as template” on a project to capture its full setup."
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              New template
            </Button>
          }
        />
      ) : (
        <AnimatedList className={GRID}>
          {templates.map((template) => (
            <AnimatedItem key={template.id} className="h-full">
              <TemplateCard
                template={template}
                onEdit={openEdit}
                onDelete={setDeleting}
              />
            </AnimatedItem>
          ))}
        </AnimatedList>
      )}

      <TemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        template={editing}
        onSaved={() => void mutate()}
      />

      <DeleteTemplateDialog
        template={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onDeleted={() => void mutate()}
      />
    </div>
  );
}
