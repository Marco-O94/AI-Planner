"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";
import { ALL } from "./filters";

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  /** Accessible label, also used as the "any" placeholder ("Any {label}"). */
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * A single filter dimension: a compact select with an always-present
 * "Any {label}" option mapped to the ALL sentinel.
 */
export function FilterSelect({
  label,
  value,
  options,
  onChange,
  disabled,
}: FilterSelectProps) {
  const t = useT();
  const anyLabel = t("dashboard.filters.any", { label: label.toLowerCase() });
  const isActive = value !== ALL;
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        size="default"
        aria-label={label}
        data-active={isActive || undefined}
        className={cn(
          "h-9 w-full min-w-0 transition-colors sm:w-auto",
          "*:data-[slot=select-value]:truncate",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          isActive
            ? "border-primary/40 bg-primary/5 font-medium text-primary ring-1 ring-primary/20 dark:bg-primary/10"
            : "text-muted-foreground hover:border-foreground/20 hover:text-foreground",
        )}
      >
        <SelectValue placeholder={anyLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{anyLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
