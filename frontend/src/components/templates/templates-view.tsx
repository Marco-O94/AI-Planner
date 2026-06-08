"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { FolderGit2, Plus } from "lucide-react";

import type { TemplateRead } from "@/lib/types";
import { useT } from "@/i18n/locale-context";
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
  const t = useT();
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
        title={t("templates.header.title")}
        description={t("templates.header.description")}
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            {t("templates.header.newTemplate")}
          </Button>
        }
      />

      {isLoading ? (
        <LoadingGrid />
      ) : error ? (
        <EmptyState
          icon={FolderGit2}
          title={t("templates.errors.loadTitle")}
          description={t("templates.errors.loadDescription")}
          action={
            <Button variant="outline" onClick={() => void mutate()}>
              {t("common.retry")}
            </Button>
          }
        />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={FolderGit2}
          title={t("templates.empty.title")}
          description={t("templates.empty.description")}
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              {t("templates.header.newTemplate")}
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
