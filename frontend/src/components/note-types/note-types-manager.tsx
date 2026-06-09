"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";

import type { NoteTypeRead, ScopeKind } from "@/lib/types";
import { useT } from "@/i18n/locale-context";
import { EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NoteTypeBadge } from "@/components/status-badge";
import { NoteTypeDialog } from "@/components/note-types/note-type-dialog";
import { DeleteNoteTypeDialog } from "@/components/note-types/delete-note-type-dialog";

interface NoteTypesManagerProps {
  projectSlug: string;
}

function sortTypes(list: NoteTypeRead[]): NoteTypeRead[] {
  return [...list].sort((a, b) => {
    if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function NoteTypesManager({ projectSlug }: NoteTypesManagerProps) {
  const t = useT();
  const key = `/projects/${projectSlug}/note-types`;
  const { data, isLoading, mutate } = useSWR<NoteTypeRead[]>(key);

  const [dialogScope, setDialogScope] = useState<ScopeKind>("PROJECT");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NoteTypeRead | null>(null);
  const [deleting, setDeleting] = useState<NoteTypeRead | null>(null);

  const { globalTypes, projectTypes } = useMemo(() => {
    const all = data ?? [];
    return {
      globalTypes: sortTypes(all.filter((tpe) => tpe.scope === "GLOBAL")),
      projectTypes: sortTypes(all.filter((tpe) => tpe.scope === "PROJECT")),
    };
  }, [data]);

  function openCreate(scope: ScopeKind): void {
    setEditing(null);
    setDialogScope(scope);
    setDialogOpen(true);
  }

  function openEdit(type: NoteTypeRead): void {
    setEditing(type);
    setDialogScope(type.scope);
    setDialogOpen(true);
  }

  function Row({ type }: { type: NoteTypeRead }) {
    return (
      <Card className="flex flex-row items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <NoteTypeBadge
            type={{
              id: type.id,
              key: type.key,
              slug: type.slug,
              name: type.name,
              color: type.color,
            }}
          />
          {type.description ? (
            <span className="truncate text-sm text-muted-foreground">
              {type.description}
            </span>
          ) : null}
          {type.is_default ? (
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[0.7rem] text-muted-foreground">
              {t("noteTypes.builtin")}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("common.edit")}
            onClick={() => openEdit(type)}
          >
            <Pencil className="size-4" />
          </Button>
          {!type.is_default && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("common.delete")}
              onClick={() => setDeleting(type)}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">{t("noteTypes.project.title")}</h3>
            <p className="text-xs text-muted-foreground">
              {t("noteTypes.project.description")}
            </p>
          </div>
          <Button size="sm" onClick={() => openCreate("PROJECT")}>
            <Plus className="size-4" />
            {t("noteTypes.addType")}
          </Button>
        </div>
        {isLoading ? (
          <Skeleton className="h-16 w-full rounded-xl" />
        ) : projectTypes.length === 0 ? (
          <EmptyState
            icon={Tags}
            title={t("noteTypes.project.emptyTitle")}
            description={t("noteTypes.project.emptyDescription")}
          />
        ) : (
          <div className="space-y-2">
            {projectTypes.map((type) => (
              <Row key={type.id} type={type} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">{t("noteTypes.global.title")}</h3>
            <p className="text-xs text-muted-foreground">
              {t("noteTypes.global.description")}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => openCreate("GLOBAL")}>
            <Plus className="size-4" />
            {t("noteTypes.addGlobalType")}
          </Button>
        </div>
        {isLoading ? (
          <Skeleton className="h-16 w-full rounded-xl" />
        ) : (
          <div className="space-y-2">
            {globalTypes.map((type) => (
              <Row key={type.id} type={type} />
            ))}
          </div>
        )}
      </section>

      <NoteTypeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        type={editing}
        scope={dialogScope}
        projectSlug={projectSlug}
        onSaved={() => void mutate()}
      />
      <DeleteNoteTypeDialog
        type={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onDeleted={() => void mutate()}
      />
    </div>
  );
}
