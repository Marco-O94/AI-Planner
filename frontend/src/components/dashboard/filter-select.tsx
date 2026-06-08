"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        size="default"
        aria-label={label}
        className="h-9 w-full min-w-0 sm:w-auto"
      >
        <SelectValue placeholder={`Any ${label.toLowerCase()}`} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Any {label.toLowerCase()}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
