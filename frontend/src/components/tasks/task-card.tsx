"use client";

import { useState } from "react";
import { Ban, Link2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TagList } from "@/components/common";
import { Markdown } from "@/components/markdown";
import { TaskPriorityBadge } from "@/components/status-badge";
import { useT } from "@/i18n/locale-context";
import { api, ApiError } from "@/lib/api";
import type { TaskPriority, TaskRead, TaskStatus } from "@/lib/types";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/types";

import type { UseTasksResult } from "./use-tasks";

interface TaskCardProps {
  task: TaskRead;
  /** Titles of unfinished dependencies, for the blocked tooltip. */
  blockingTitles: string[];
  onEdit: (task: TaskRead) => void;
  patchTask: UseTasksResult["patchTask"];
  onDeleted: () => void;
}

/** A single task on the board: inline status/priority, blocked badge, actions. */
export function TaskCard({
  task,
  blockingTitles,
  onEdit,
  patchTask,
  onDeleted,
}: TaskCardProps) {
  const t = useT();
  const [deleting, setDeleting] = useState(false);

  async function changeStatus(status: TaskStatus) {
    if (status === task.status) return;
    await patchTask(
      task,
      { status },
      t("tasks.toasts.statusChanged", { status: t(`enums.taskStatus.${status}`) }),
    );
  }

  async function changePriority(priority: TaskPriority) {
    if (priority === task.priority) return;
    await patchTask(
      task,
      { priority },
      t("tasks.toasts.priorityChanged", {
        priority: t(`enums.taskPriority.${priority}`),
      }),
    );
  }

  async function remove() {
    setDeleting(true);
    try {
      await api.deleteTask(task.id);
      toast.success(t("tasks.toasts.deleted"));
      onDeleted();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : t("common.somethingWrong"),
      );
      setDeleting(false);
    }
  }

  return (
    <Card
      size="sm"
      className="gap-2 px-3 ring-foreground/10 transition-shadow hover:ring-foreground/20"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm leading-snug font-medium text-balance">{task.title}</h4>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="-mt-0.5 -mr-1 shrink-0 text-muted-foreground"
              aria-label={t("tasks.card.actions")}
            >
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onSelect={() => onEdit(task)}>
              <Pencil />
              {t("common.edit")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={deleting}
              onSelect={(event) => {
                event.preventDefault();
                void remove();
              }}
            >
              <Trash2 />
              {t("common.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {task.description ? (
        <Markdown className="line-clamp-3 text-xs text-muted-foreground prose-p:my-0">
          {task.description}
        </Markdown>
      ) : null}

      {task.blocked ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="w-fit gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            >
              <Ban className="size-3" />
              {t("tasks.card.blocked")}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {blockingTitles.length > 0
              ? t("tasks.card.blockedWaitingOn", {
                  titles: blockingTitles.join(", "),
                })
              : t("tasks.card.blockedWaitingGeneric")}
          </TooltipContent>
        </Tooltip>
      ) : null}

      <TagList tags={task.tags} className="gap-1" />

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Select value={task.status} onValueChange={(value) => changeStatus(value as TaskStatus)}>
          <SelectTrigger size="sm" className="h-7" aria-label={t("tasks.card.changeStatus")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TASK_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`enums.taskStatus.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t("tasks.card.changePriority")}
            className="rounded-4xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <TaskPriorityBadge priority={task.priority} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-32">
            {TASK_PRIORITIES.map((priority) => (
              <DropdownMenuItem
                key={priority}
                onSelect={() => void changePriority(priority)}
              >
                {t(`enums.taskPriority.${priority}`)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {task.depends_on.length > 0 ? (
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Link2 className="size-3" />
            {task.depends_on.length}
          </span>
        ) : null}
      </div>
    </Card>
  );
}
