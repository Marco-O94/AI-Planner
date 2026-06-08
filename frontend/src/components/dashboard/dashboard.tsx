"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { AlertCircle } from "lucide-react";

import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-context";
import { useDebounce } from "@/hooks/use-debounce";
import type { ProjectRead } from "@/lib/types";
import { CreateProjectDialog } from "./create-project-dialog";
import { FilterBar } from "./filter-bar";
import {
  EMPTY_FILTERS,
  hasActiveFilters,
  projectsKey,
  toProjectQuery,
  type DashboardFilters,
} from "./filters";
import { ProjectGrid } from "./project-grid";
import { ProjectGridSkeleton } from "./project-grid-skeleton";
import { useTechnologies } from "./use-technologies";

const SEARCH_DEBOUNCE_MS = 300;

export function Dashboard() {
  const t = useT();
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);
  const debouncedQuery = useDebounce(filters.q, SEARCH_DEBOUNCE_MS);

  const { grouped, isLoading: techLoading } = useTechnologies();

  // Key off the *debounced* search but the live select values, combined AND.
  // `filters.q` is intentionally excluded so typing doesn't re-key SWR on every
  // keystroke — only its debounced copy does.
  const query = useMemo(
    () => toProjectQuery({ ...filters, q: debouncedQuery }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      debouncedQuery,
      filters.status,
      filters.language,
      filters.framework,
      filters.database,
    ],
  );
  const key = projectsKey(query);
  const { data, error, isLoading, mutate } = useSWR<ProjectRead[]>(key);

  const filtersActive = hasActiveFilters({ ...filters, q: debouncedQuery });

  function patchFilters(patch: Partial<DashboardFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dashboard.header.title")}
        description={t("dashboard.header.description")}
        actions={<CreateProjectDialog onCreated={() => mutate()} />}
      />

      <FilterBar
        filters={filters}
        onChange={patchFilters}
        onReset={resetFilters}
        grouped={grouped}
        techLoading={techLoading}
      />

      {isLoading ? (
        <ProjectGridSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-destructive/40 bg-destructive/5 px-6 py-16 text-center">
          <AlertCircle className="size-8 text-destructive" />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {t("dashboard.errorState.title")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("dashboard.errorState.description")}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            {t("common.retry")}
          </Button>
        </div>
      ) : (
        <ProjectGrid
          projects={data ?? []}
          filtered={filtersActive}
          createAction={<CreateProjectDialog onCreated={() => mutate()} />}
          onClearFilters={resetFilters}
        />
      )}
    </div>
  );
}
