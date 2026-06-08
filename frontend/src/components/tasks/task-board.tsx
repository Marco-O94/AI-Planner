"use client";

import { useMemo } from "react";

import { AnimatedItem, AnimatePresence, motion } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/i18n/locale-context";
import type { TaskRead } from "@/lib/types";

import { BOARD_COLUMNS } from "./constants";
import { TaskCard } from "./task-card";
import type { UseTasksResult } from "./use-tasks";

interface TaskBoardProps {
  /** Tasks already filtered for display. */
  tasks: TaskRead[];
  /** Full task set, used to resolve dependency titles for blocked tooltips. */
  allTasks: TaskRead[];
  onEdit: (task: TaskRead) => void;
  patchTask: UseTasksResult["patchTask"];
  onMutated: () => void;
}

/** Status-grouped board with animated layout moves between columns. */
export function TaskBoard({
  tasks,
  allTasks,
  onEdit,
  patchTask,
  onMutated,
}: TaskBoardProps) {
  const t = useT();
  const titleById = useMemo(
    () => new Map(allTasks.map((task) => [task.id, task.title])),
    [allTasks],
  );

  function blockingTitles(task: TaskRead): string[] {
    if (!task.blocked) return [];
    return task.depends_on
      .map((id) => allTasks.find((candidate) => candidate.id === id))
      .filter((dep): dep is TaskRead => Boolean(dep) && dep!.status !== "DONE")
      .map((dep) => titleById.get(dep.id) ?? dep.title);
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {BOARD_COLUMNS.map((column) => {
        const columnTasks = tasks.filter((task) => task.status === column.status);
        const columnLabel = t(`tasks.board.columns.${column.status}`);
        return (
          <section
            key={column.status}
            className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/30 p-3"
            aria-label={columnLabel}
          >
            <header className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold tracking-tight">{columnLabel}</h3>
              <Badge variant="secondary" className="tabular-nums">
                {columnTasks.length}
              </Badge>
            </header>

            <motion.div layout className="flex flex-1 flex-col gap-2.5">
              <AnimatePresence mode="popLayout" initial={false}>
                {columnTasks.map((task) => (
                  <AnimatedItem key={task.id} layout>
                    <TaskCard
                      task={task}
                      blockingTitles={blockingTitles(task)}
                      onEdit={onEdit}
                      patchTask={patchTask}
                      onDeleted={onMutated}
                    />
                  </AnimatedItem>
                ))}
              </AnimatePresence>

              {columnTasks.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-muted-foreground/70">
                  {t("tasks.board.columnEmpty")}
                </p>
              ) : null}
            </motion.div>
          </section>
        );
      })}
    </div>
  );
}
