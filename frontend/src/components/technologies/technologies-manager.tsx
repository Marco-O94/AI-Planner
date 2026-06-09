"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { Plus, Pencil, Trash2, Boxes } from "lucide-react";

import { TECHNOLOGY_KINDS, type TechnologyKind, type TechnologyRead } from "@/lib/types";
import { useT } from "@/i18n/locale-context";
import { EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { TechKindBadge } from "@/components/status-badge";
import { TechnologyDialog } from "@/components/technologies/technology-dialog";
import { DeleteTechnologyDialog } from "@/components/technologies/delete-technology-dialog";
import { BulkDeleteTechnologiesDialog } from "@/components/technologies/bulk-delete-technologies-dialog";

const TECHNOLOGIES_KEY = "/technologies";

/** Row lists scroll past this height instead of growing the page. */
const SECTION_MAX_HEIGHT = "max-h-80";

function sortTechnologies(list: TechnologyRead[]): TechnologyRead[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

export function TechnologiesManager() {
  const t = useT();
  const { data, error, isLoading, mutate: revalidate } =
    useSWR<TechnologyRead[]>(TECHNOLOGIES_KEY);
  const { mutate } = useSWRConfig();

  const [dialogKind, setDialogKind] = useState<TechnologyKind>("LANGUAGE");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TechnologyRead | null>(null);
  const [deleting, setDeleting] = useState<TechnologyRead | null>(null);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState<TechnologyRead[]>([]);

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

  // Drop selected ids that no longer exist after the catalogue refreshes.
  useEffect(() => {
    const present = new Set((data ?? []).map((tech) => tech.id));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => present.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [data]);

  // Refresh the catalogue everywhere it is consumed (dashboard filters, pickers).
  function refresh(): void {
    void mutate(TECHNOLOGIES_KEY);
  }

  function clearSelection(): void {
    setSelectedIds(new Set());
  }

  function toggleSelected(id: string): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setSectionSelected(ids: string[], selected: boolean): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (selected) next.add(id);
        else next.delete(id);
      }
      return next;
    });
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
    const isSelected = selectedIds.has(technology.id);
    return (
      <Card className="flex flex-row items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleSelected(technology.id)}
            aria-label={technology.name}
          />
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

  function SectionHeader({ kind }: { kind: TechnologyKind }) {
    const technologies = grouped[kind];
    const ids = technologies.map((tech) => tech.id);
    const selectedCount = ids.filter((id) => selectedIds.has(id)).length;
    const kindLabel = t(`enums.techKind.${kind}`);

    const allChecked = ids.length > 0 && selectedCount === ids.length;
    const headerChecked: boolean | "indeterminate" = allChecked
      ? true
      : selectedCount > 0
        ? "indeterminate"
        : false;

    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {ids.length > 0 ? (
            <Checkbox
              checked={headerChecked}
              onCheckedChange={() => setSectionSelected(ids, !allChecked)}
              aria-label={t("technologies.bulk.selectAllAria", { kind: kindLabel })}
            />
          ) : null}
          <h3 className="text-sm font-semibold">{kindLabel}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {selectedCount > 0 ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={() =>
                setBulkDeleting(technologies.filter((tech) => selectedIds.has(tech.id)))
              }
            >
              <Trash2 className="size-4" />
              {t("technologies.bulk.deleteSelected", { count: selectedCount })}
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={() => openCreate(kind)}>
            <Plus className="size-4" />
            {t("technologies.addType")}
          </Button>
        </div>
      </div>
    );
  }

  const isEmpty =
    !isLoading && TECHNOLOGY_KINDS.every((kind) => grouped[kind].length === 0);

  return (
    <div className="space-y-8">
      {error ? (
        <EmptyState
          icon={Boxes}
          title={t("technologies.errors.loadTitle")}
          description={t("technologies.errors.loadDescription")}
          action={
            <Button variant="outline" size="sm" onClick={() => void revalidate()}>
              {t("common.retry")}
            </Button>
          }
        />
      ) : isEmpty ? (
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
            <SectionHeader kind={kind} />
            {isLoading ? (
              <Skeleton className="h-16 w-full rounded-xl" />
            ) : grouped[kind].length === 0 ? (
              <p className="px-1 text-xs text-muted-foreground">
                {t("technologies.builtinEmpty")}
              </p>
            ) : (
              <div
                tabIndex={0}
                aria-label={t("technologies.section.scrollAria", {
                  kind: t(`enums.techKind.${kind}`),
                })}
                className={`${SECTION_MAX_HEIGHT} space-y-2 overflow-y-auto pr-1`}
              >
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
      <BulkDeleteTechnologiesDialog
        technologies={bulkDeleting}
        onOpenChange={(open) => {
          if (!open) setBulkDeleting([]);
        }}
        onDeleted={() => {
          refresh();
          clearSelection();
        }}
      />
    </div>
  );
}
