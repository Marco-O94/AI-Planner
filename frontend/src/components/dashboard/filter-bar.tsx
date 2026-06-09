"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT, type TranslateFn } from "@/i18n/locale-context";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FilterSelect, type FilterOption } from "./filter-select";
import { ALL, hasActiveFilters, type DashboardFilters } from "./filters";
import type { GroupedTechnologies } from "./use-technologies";

interface FilterBarProps {
  filters: DashboardFilters;
  onChange: (patch: Partial<DashboardFilters>) => void;
  onReset: () => void;
  grouped: GroupedTechnologies;
  techLoading: boolean;
}

/** The facet dimensions that can appear as removable chips. */
type FacetKey = "status" | "language" | "framework" | "database";

interface ActiveChip {
  key: FacetKey;
  /** The facet's own label (e.g. "Status"), for the remove-button aria. */
  facetLabel: string;
  /** The selected value's display label (e.g. "Active", "TypeScript"). */
  valueLabel: string;
}

function toOptions(techs: GroupedTechnologies[keyof GroupedTechnologies]): FilterOption[] {
  return techs.map((tech) => ({ value: tech.slug, label: tech.name }));
}

/** Resolve a technology slug to its display name within a kind group. */
function techNameBySlug(
  techs: GroupedTechnologies[keyof GroupedTechnologies],
  slug: string,
): string {
  return techs.find((tech) => tech.slug === slug)?.name ?? slug;
}

/** Build the active-filter chips from current state + the technology catalogue. */
function buildActiveChips(
  filters: DashboardFilters,
  grouped: GroupedTechnologies,
  t: TranslateFn,
): ActiveChip[] {
  const chips: ActiveChip[] = [];
  if (filters.status !== ALL) {
    chips.push({
      key: "status",
      facetLabel: t("dashboard.filters.status"),
      valueLabel: t(`enums.projectStatus.${filters.status}`),
    });
  }
  if (filters.language !== ALL) {
    chips.push({
      key: "language",
      facetLabel: t("dashboard.filters.language"),
      valueLabel: techNameBySlug(grouped.LANGUAGE, filters.language),
    });
  }
  if (filters.framework !== ALL) {
    chips.push({
      key: "framework",
      facetLabel: t("dashboard.filters.framework"),
      valueLabel: techNameBySlug(grouped.FRAMEWORK, filters.framework),
    });
  }
  if (filters.database !== ALL) {
    chips.push({
      key: "database",
      facetLabel: t("dashboard.filters.database"),
      valueLabel: techNameBySlug(grouped.DATABASE, filters.database),
    });
  }
  return chips;
}

/**
 * Search + faceted filters above the project grid. The search input is
 * prominent on the left; the four labeled facet selects are grouped at the
 * right. Active dimensions surface as removable chips below. All dimensions
 * combine with AND server-side.
 */
export function FilterBar({
  filters,
  onChange,
  onReset,
  grouped,
  techLoading,
}: FilterBarProps) {
  const t = useT();
  const active = hasActiveFilters(filters);

  const statusOptions: FilterOption[] = PROJECT_STATUSES.map((status) => ({
    value: status,
    label: t(`enums.projectStatus.${status}`),
  }));

  const chips = buildActiveChips(filters, grouped, t);

  return (
    <div className="rounded-2xl border border-border/70 bg-card/50 p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
        {/* Search: the dominant control. */}
        <div className="group relative flex-1 lg:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            type="search"
            value={filters.q}
            onChange={(event) => onChange({ q: event.target.value })}
            placeholder={t("dashboard.filters.searchPlaceholder")}
            aria-label={t("dashboard.filters.searchAria")}
            className="h-10 pl-9 text-sm"
          />
        </div>

        {/* Facets: secondary, grouped and right-aligned on wide screens. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:flex-wrap lg:items-center lg:justify-end lg:gap-2.5">
          <FilterSelect
            label={t("dashboard.filters.status")}
            value={filters.status}
            options={statusOptions}
            onChange={(value) =>
              onChange({ status: value as DashboardFilters["status"] })
            }
          />
          <FilterSelect
            label={t("dashboard.filters.language")}
            value={filters.language}
            options={toOptions(grouped.LANGUAGE)}
            onChange={(value) => onChange({ language: value })}
            disabled={techLoading}
          />
          <FilterSelect
            label={t("dashboard.filters.framework")}
            value={filters.framework}
            options={toOptions(grouped.FRAMEWORK)}
            onChange={(value) => onChange({ framework: value })}
            disabled={techLoading}
          />
          <FilterSelect
            label={t("dashboard.filters.database")}
            value={filters.database}
            options={toOptions(grouped.DATABASE)}
            onChange={(value) => onChange({ database: value })}
            disabled={techLoading}
          />
        </div>
      </div>

      {/* Active-filter chips: one per narrowing dimension, each individually
          removable, plus a "Clear all" affordance. */}
      {active ? (
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-3">
          <span
            className="mr-1 text-xs font-medium text-muted-foreground"
            aria-hidden
          >
            {t("dashboard.filters.activeAria")}
          </span>
          <ul
            className="flex flex-wrap items-center gap-1.5"
            aria-label={t("dashboard.filters.activeAria")}
          >
            {chips.map((chip) => (
              <li key={chip.key}>
                <FilterChip
                  facetLabel={chip.facetLabel}
                  valueLabel={chip.valueLabel}
                  onRemove={() =>
                    onChange({ [chip.key]: ALL } as Partial<DashboardFilters>)
                  }
                  removeAria={t("dashboard.filters.removeFilter", {
                    label: chip.facetLabel,
                  })}
                />
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="ml-auto h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
            {t("dashboard.filters.clearAll")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** A single removable active-filter chip: "Facet: Value ✕". */
function FilterChip({
  facetLabel,
  valueLabel,
  onRemove,
  removeAria,
}: {
  facetLabel: string;
  valueLabel: string;
  onRemove: () => void;
  removeAria: string;
}) {
  return (
    <span
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 py-1 pr-1 pl-2.5 text-xs font-medium text-primary",
        "transition-colors",
      )}
    >
      <span className="opacity-70">{facetLabel}</span>
      <span>{valueLabel}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeAria}
        className={cn(
          "grid size-4 place-items-center rounded-full text-primary/70 outline-none transition-colors",
          "hover:bg-primary/20 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <X className="size-3" />
      </button>
    </span>
  );
}
