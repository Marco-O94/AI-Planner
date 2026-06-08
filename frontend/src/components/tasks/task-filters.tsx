"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { titleCase } from "@/lib/format";
import type { TaskPriority, TaskStatus } from "@/lib/types";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/types";

import { ALL_VALUE } from "./constants";

export interface TaskFilterState {
  status: TaskStatus | typeof ALL_VALUE;
  priority: TaskPriority | typeof ALL_VALUE;
  tag: string;
}

export const EMPTY_FILTERS: TaskFilterState = {
  status: ALL_VALUE,
  priority: ALL_VALUE,
  tag: "",
};

interface TaskFiltersProps {
  filters: TaskFilterState;
  onChange: (filters: TaskFilterState) => void;
  /** Distinct tags across the project, offered as filter options. */
  tagOptions: string[];
}

/** Filter bar: status, priority, and tag. */
export function TaskFilters({ filters, onChange, tagOptions }: TaskFiltersProps) {
  const hasActive =
    filters.status !== ALL_VALUE ||
    filters.priority !== ALL_VALUE ||
    filters.tag.trim().length > 0;

  function patch(partial: Partial<TaskFilterState>) {
    onChange({ ...filters, ...partial });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={filters.status}
        onValueChange={(value) =>
          patch({ status: value as TaskFilterState["status"] })
        }
      >
        <SelectTrigger size="sm" className="min-w-32" aria-label="Filter by status">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>All statuses</SelectItem>
          {TASK_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {titleCase(status)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.priority}
        onValueChange={(value) =>
          patch({ priority: value as TaskFilterState["priority"] })
        }
      >
        <SelectTrigger size="sm" className="min-w-32" aria-label="Filter by priority">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>All priorities</SelectItem>
          {TASK_PRIORITIES.map((priority) => (
            <SelectItem key={priority} value={priority}>
              {titleCase(priority)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {tagOptions.length > 0 ? (
        <Select
          value={filters.tag || ALL_VALUE}
          onValueChange={(value) => patch({ tag: value === ALL_VALUE ? "" : value })}
        >
          <SelectTrigger size="sm" className="min-w-32" aria-label="Filter by tag">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All tags</SelectItem>
            {tagOptions.map((tag) => (
              <SelectItem key={tag} value={tag}>
                #{tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          value={filters.tag}
          onChange={(event) => patch({ tag: event.target.value })}
          placeholder="Filter by tag…"
          className="h-7 w-40"
          aria-label="Filter by tag"
        />
      )}

      {hasActive ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="text-muted-foreground"
        >
          <X />
          Clear
        </Button>
      ) : null}
    </div>
  );
}
