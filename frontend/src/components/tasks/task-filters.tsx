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
import { useT } from "@/i18n/locale-context";
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
  const t = useT();
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
        <SelectTrigger size="sm" className="min-w-32" aria-label={t("tasks.filters.filterByStatus")}>
          <SelectValue placeholder={t("tasks.filters.statusPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{t("tasks.filters.allStatuses")}</SelectItem>
          {TASK_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {t(`enums.taskStatus.${status}`)}
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
        <SelectTrigger size="sm" className="min-w-32" aria-label={t("tasks.filters.filterByPriority")}>
          <SelectValue placeholder={t("tasks.filters.priorityPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{t("tasks.filters.allPriorities")}</SelectItem>
          {TASK_PRIORITIES.map((priority) => (
            <SelectItem key={priority} value={priority}>
              {t(`enums.taskPriority.${priority}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {tagOptions.length > 0 ? (
        <Select
          value={filters.tag || ALL_VALUE}
          onValueChange={(value) => patch({ tag: value === ALL_VALUE ? "" : value })}
        >
          <SelectTrigger size="sm" className="min-w-32" aria-label={t("tasks.filters.filterByTag")}>
            <SelectValue placeholder={t("tasks.filters.tagPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>{t("tasks.filters.allTags")}</SelectItem>
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
          placeholder={t("tasks.filters.tagInputPlaceholder")}
          className="h-7 w-40"
          aria-label={t("tasks.filters.filterByTag")}
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
          {t("common.clear")}
        </Button>
      ) : null}
    </div>
  );
}
