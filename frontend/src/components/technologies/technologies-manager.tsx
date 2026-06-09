"use client";

import { useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { Plus, Pencil, Trash2, Boxes } from "lucide-react";

import { TECHNOLOGY_KINDS, type TechnologyKind, type TechnologyRead } from "@/lib/types";
import { useT } from "@/i18n/locale-context";
import { EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TechKindBadge } from "@/components/status-badge";
import { TechnologyDialog } from "@/components/technologies/technology-dialog";
import { DeleteTechnologyDialog } from "@/components/technologies/delete-technology-dialog";

const TECHNOLOGIES_KEY = "/technologies";

function sortTechnologies(list: TechnologyRead[]): TechnologyRead[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

export function TechnologiesManager() {
  const t = useT();
  const { data, isLoading } = useSWR<TechnologyRead[]>(TECHNOLOGIES_KEY);
  const { mutate } = useSWRConfig();

  const [dialogKind, setDialogKind] = useState<TechnologyKind>("LANGUAGE");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TechnologyRead | null>(null);
  const [deleting, setDeleting] = useState<TechnologyRead | null>(null);

  const grouped = useMemo(() => {
    const all = data ?? [];
    return TECHNOLOGY_KINDS.reduce<Record<TechnologyKind, TechnologyRead[]>>(
      (acc, kind) => ({
        ...acc,
        [kind]: sortTechnologies(all.filter((tech) => tech.kind === kind)),
      }),
      { LANGUAGE: [], FRAMEWORK: [], DATABASE: [], TOOL: [] },
    );
  }, [data]);

  // Refresh the catalogue everywhere it is consumed (dashboard filters, pickers).
  function refresh(): void {
    void mutate(TECHNOLOGIES_KEY);
  }

  function openCreate(kind: TechnologyKind): void {
    setEditing(null);
    setDialogKind(kind);
    setDialogOpen(true);
  }

  function openEdit(technology: TechnologyRead): void {
    setEditing(technology);
    setDialogKind(technology.kind);
    setDialogOpen(true);
  }

  function Row({ technology }: { technology: TechnologyRead }) {
    return (
      <Card className="flex flex-row items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <TechKindBadge kind={technology.kind} />
          <span className="truncate text-sm font-medium">{technology.name}</span>
          <span className="truncate font-mono text-xs text-muted-foreground">
            {technology.slug}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("common.edit")}
            onClick={() => openEdit(technology)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("common.delete")}
            onClick={() => setDeleting(technology)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </Card>
    );
  }

  const isEmpty =
    !isLoading && TECHNOLOGY_KINDS.every((kind) => grouped[kind].length === 0);

  return (
    <div className="space-y-8">
      {isEmpty ? (
        <EmptyState
          icon={Boxes}
          title={t("technologies.section.emptyTitle")}
          description={t("technologies.section.emptyDescription")}
          action={
            <Button size="sm" onClick={() => openCreate("LANGUAGE")}>
              <Plus className="size-4" />
              {t("technologies.addType")}
            </Button>
          }
        />
      ) : (
        TECHNOLOGY_KINDS.map((kind) => (
          <section key={kind} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t(`enums.techKind.${kind}`)}</h3>
              <Button size="sm" variant="outline" onClick={() => openCreate(kind)}>
                <Plus className="size-4" />
                {t("technologies.addType")}
              </Button>
            </div>
            {isLoading ? (
              <Skeleton className="h-16 w-full rounded-xl" />
            ) : grouped[kind].length === 0 ? (
              <p className="px-1 text-xs text-muted-foreground">
                {t("technologies.builtinEmpty")}
              </p>
            ) : (
              <div className="space-y-2">
                {grouped[kind].map((technology) => (
                  <Row key={technology.id} technology={technology} />
                ))}
              </div>
            )}
          </section>
        ))
      )}

      <TechnologyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        technology={editing}
        kind={dialogKind}
        onSaved={refresh}
      />
      <DeleteTechnologyDialog
        technology={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onDeleted={refresh}
      />
    </div>
  );
}
