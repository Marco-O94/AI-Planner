"use client";

/** Search + note-type filter row for the Notes tab. */

import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NoteTypeBadge } from "@/components/status-badge";
import type { NoteTypeRead } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-context";

interface NotesFilterBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  activeType: string | "ALL"; // slug or ALL
  onTypeChange: (value: string | "ALL") => void;
  types: NoteTypeRead[]; // applicable types, ordered
  counts: Record<string, number>; // keyed by slug
  total: number;
}

export function NotesFilterBar({
  query,
  onQueryChange,
  activeType,
  onTypeChange,
  types,
  counts,
  total,
}: NotesFilterBarProps) {
  const t = useT();
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          placeholder={t("notes.filter.placeholder")}
          onChange={(event) => onQueryChange(event.target.value)}
          className="h-9 pl-8"
        />
        {query ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onQueryChange("")}
            aria-label={t("notes.filter.clearAria")}
            className="absolute top-1/2 right-1 -translate-y-1/2"
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <FilterChip
          label={t("common.all")}
          count={total}
          active={activeType === "ALL"}
          onClick={() => onTypeChange("ALL")}
        />
        {types
          .filter((type) => (counts[type.slug] ?? 0) > 0)
          .map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() =>
                onTypeChange(activeType === type.slug ? "ALL" : type.slug)
              }
              className={cn(
                "rounded-full outline-none ring-offset-background transition-all focus-visible:ring-2 focus-visible:ring-ring",
                activeType === type.slug
                  ? "ring-2 ring-primary/40"
                  : "opacity-70 hover:opacity-100",
              )}
              aria-pressed={activeType === type.slug}
            >
              <NoteTypeBadge
                type={{
                  id: type.id,
                  key: type.key,
                  slug: type.slug,
                  name: type.name,
                  color: type.color,
                }}
              />
            </button>
          ))}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border bg-transparent text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}
