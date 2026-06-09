"use client";

import { useMemo, useState } from "react";
import { ListTodo, Plus } from "lucide-react";

import { EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/i18n/locale-context";
import { ALL_VALUE } from "@/components/tasks/constants";
import { TaskBoard } from "@/components/tasks/task-board";
import { TaskDialog } from "@/components/tasks/task-dialog";
import {
  EMPTY_FILTERS,
  TaskFilters,
  type TaskFilterState,
} from "@/components/tasks/task-filters";
import { useTasks } from "@/components/tasks/use-tasks";
import type { TabProps } from "@/components/project/types";
import type { TaskRead } from "@/lib/types";

function matchesFilters(task: TaskRead, filters: TaskFilterState): boolean {
  if (filters.status !== ALL_VALUE && task.status !== filters.status) return false;
  if (filters.priority !== ALL_VALUE && task.priority !== filters.priority) return false;
  const tag = filters.tag.trim().toLowerCase();
  if (tag && !task.tags.some((t) => t.toLowerCase().includes(tag))) return false;
  return true;
}

/** Tasks tab: a status board with deps, blocked badges, and inline editing. */
export function TasksTab({ project, domains, domainId }: TabProps) {
  const t = useT();
  const { tasks, isLoading, error, refresh, patchTask } = useTasks(project.slug);
  const [filters, setFilters] = useState<TaskFilterState>(EMPTY_FILTERS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRead | null>(null);

  // Scope to a domain when the surrounding view requests it.
  const scopedTasks = useMemo(
    () => (domainId ? tasks.filter((task) => task.domain_id === domainId) : tasks),
    [tasks, domainId],
  );

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    for (const task of scopedTasks) for (const tag of task.tags) set.add(tag);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [scopedTasks]);

  const visibleTasks = useMemo(
    () => scopedTasks.filter((task) => matchesFilters(task, filters)),
    [scopedTasks, filters],
  );

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(task: TaskRead) {
    setEditing(task);
    setDialogOpen(true);
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, columnIndex) => (
          <div
            key={columnIndex}
            className="space-y-2.5 rounded-xl border border-border/70 bg-muted/30 p-3"
          >
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={ListTodo}
        title={t("tasks.loadError.title")}
        description={t("tasks.loadError.description")}
        action={
          <Button variant="outline" onClick={() => void refresh()}>
            {t("common.retry")}
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TaskFilters filters={filters} onChange={setFilters} tagOptions={tagOptions} />
        <Button onClick={openCreate}>
          <Plus />
          {t("tasks.newTask")}
        </Button>
      </div>

      {scopedTasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title={t("tasks.empty.title")}
          description={t("tasks.empty.description")}
          action={
            <Button onClick={openCreate}>
              <Plus />
              {t("tasks.createFirst")}
            </Button>
          }
        />
      ) : visibleTasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title={t("tasks.noMatches.title")}
          description={t("tasks.noMatches.description")}
          action={
            <Button variant="outline" onClick={() => setFilters(EMPTY_FILTERS)}>
              {t("tasks.noMatches.clearFilters")}
            </Button>
          }
        />
      ) : (
        <TaskBoard
          tasks={visibleTasks}
          allTasks={tasks}
          onEdit={openEdit}
          patchTask={patchTask}
          onMutated={() => void refresh()}
          projectName={project.name}
          domains={domains}
        />
      )}

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectSlug={project.slug}
        domains={domains}
        allTasks={scopedTasks}
        task={editing}
        defaultDomainId={domainId}
        onSaved={() => void refresh()}
      />
    </div>
  );
}
