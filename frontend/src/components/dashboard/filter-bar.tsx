"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { titleCase } from "@/lib/format";
import { PROJECT_STATUSES } from "@/lib/types";
import { FilterSelect, type FilterOption } from "./filter-select";
import { hasActiveFilters, type DashboardFilters } from "./filters";
import type { GroupedTechnologies } from "./use-technologies";

interface FilterBarProps {
  filters: DashboardFilters;
  onChange: (patch: Partial<DashboardFilters>) => void;
  onReset: () => void;
  grouped: GroupedTechnologies;
  techLoading: boolean;
}

const STATUS_OPTIONS: FilterOption[] = PROJECT_STATUSES.map((status) => ({
  value: status,
  label: titleCase(status),
}));

function toOptions(techs: GroupedTechnologies[keyof GroupedTechnologies]): FilterOption[] {
  return techs.map((tech) => ({ value: tech.slug, label: tech.name }));
}

/**
 * Search + faceted filters above the project grid. The search input is
 * debounced by the parent; selects emit ALL when cleared. All dimensions
 * combine with AND server-side.
 */
export function FilterBar({
  filters,
  onChange,
  onReset,
  grouped,
  techLoading,
}: FilterBarProps) {
  const active = hasActiveFilters(filters);

  return (
    <div className="rounded-xl border border-border/80 bg-card/60 p-3 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1 lg:max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={filters.q}
            onChange={(event) => onChange({ q: event.target.value })}
            placeholder="Search projects by name or description…"
            aria-label="Search projects"
            className="h-9 pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:flex-1 lg:flex-wrap lg:justify-end">
          <FilterSelect
            label="Status"
            value={filters.status}
            options={STATUS_OPTIONS}
            onChange={(value) =>
              onChange({ status: value as DashboardFilters["status"] })
            }
          />
          <FilterSelect
            label="Language"
            value={filters.language}
            options={toOptions(grouped.LANGUAGE)}
            onChange={(value) => onChange({ language: value })}
            disabled={techLoading}
          />
          <FilterSelect
            label="Framework"
            value={filters.framework}
            options={toOptions(grouped.FRAMEWORK)}
            onChange={(value) => onChange({ framework: value })}
            disabled={techLoading}
          />
          <FilterSelect
            label="Database"
            value={filters.database}
            options={toOptions(grouped.DATABASE)}
            onChange={(value) => onChange({ database: value })}
            disabled={techLoading}
          />
        </div>
      </div>
      {active ? (
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
            Clear filters
          </Button>
        </div>
      ) : null}
    </div>
  );
}
