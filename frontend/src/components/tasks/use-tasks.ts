"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import type { TaskRead, TaskUpdate } from "@/lib/types";

/** SWR key for a project's task list (the backend path string). */
export function tasksKey(slug: string): string {
  return `/projects/${slug}/tasks`;
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "Something went wrong";
}

export interface UseTasksResult {
  tasks: TaskRead[];
  isLoading: boolean;
  error: unknown;
  /** Re-fetch from the server. */
  refresh: () => Promise<unknown>;
  /** Patch a task with an optimistic board update + toast feedback. */
  patchTask: (task: TaskRead, body: TaskUpdate, successMessage?: string) => Promise<void>;
}

/**
 * Recompute the `blocked` flag locally so optimistic moves keep blocked badges
 * accurate before the server responds. A task is blocked when any dependency is
 * not DONE.
 */
function recomputeBlocked(tasks: TaskRead[]): TaskRead[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  return tasks.map((task) => {
    const blocked = task.depends_on.some((depId) => {
      const dep = byId.get(depId);
      return dep ? dep.status !== "DONE" : false;
    });
    return blocked === task.blocked ? task : { ...task, blocked };
  });
}

/** Load and mutate the tasks for a project, with optimistic helpers. */
export function useTasks(slug: string): UseTasksResult {
  const key = tasksKey(slug);
  const { data, isLoading, error, mutate } = useSWR<TaskRead[]>(key);

  const tasks = useMemo(() => data ?? [], [data]);

  async function patchTask(
    task: TaskRead,
    body: TaskUpdate,
    successMessage?: string,
  ): Promise<void> {
    const optimistic = (current: TaskRead[] | undefined): TaskRead[] => {
      const next = (current ?? []).map((item) =>
        item.id === task.id ? { ...item, ...body } : item,
      );
      return recomputeBlocked(next as TaskRead[]);
    };

    try {
      await mutate(
        async (current) => {
          const updated = await api.updateTask(task.id, body);
          const next = (current ?? []).map((item) =>
            item.id === task.id ? updated : item,
          );
          return recomputeBlocked(next);
        },
        {
          optimisticData: optimistic,
          rollbackOnError: true,
          revalidate: false,
          populateCache: true,
        },
      );
      if (successMessage) toast.success(successMessage);
    } catch (caught) {
      toast.error(errorMessage(caught));
    }
  }

  return { tasks, isLoading, error, refresh: () => mutate(), patchTask };
}
