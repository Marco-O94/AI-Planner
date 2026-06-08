"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/i18n/locale-context";
import { api, ApiError } from "@/lib/api";
import type { DomainRead, TaskCreate, TaskRead, TaskUpdate } from "@/lib/types";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/types";

import { ALL_VALUE } from "./constants";
import {
  emptyTaskForm,
  parseTags,
  taskFormFromTask,
  type TaskFormState,
} from "./task-form-state";
import { TaskMultiSelect } from "./task-multi-select";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectSlug: string;
  domains: DomainRead[];
  /** All project tasks, used to populate the dependency picker. */
  allTasks: TaskRead[];
  /** When set, the dialog edits this task; otherwise it creates a new one. */
  task?: TaskRead | null;
  /** Pre-selected domain for new tasks (from a scoped/domain view). */
  defaultDomainId?: string;
  /** Called after a successful create/update so the parent can revalidate. */
  onSaved: () => void;
}

/**
 * Dialog shell for creating/editing a task. The interactive form is mounted
 * only while open and keyed by the edited task id, so its state initializes
 * fresh from props each time — no effect-driven state syncing required.
 */
export function TaskDialog({ open, onOpenChange, ...rest }: TaskDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto sm:max-w-lg">
        {open ? (
          <TaskDialogForm
            key={rest.task?.id ?? "new"}
            onOpenChange={onOpenChange}
            {...rest}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type TaskDialogFormProps = Omit<TaskDialogProps, "open">;

function TaskDialogForm({
  onOpenChange,
  projectSlug,
  domains,
  allTasks,
  task,
  defaultDomainId,
  onSaved,
}: TaskDialogFormProps) {
  const t = useT();
  const isEdit = Boolean(task);
  const [form, setForm] = useState<TaskFormState>(() =>
    task ? taskFormFromTask(task) : emptyTaskForm(defaultDomainId),
  );
  const [saving, setSaving] = useState(false);

  const dependencyOptions = useMemo(
    () => allTasks.filter((candidate) => candidate.id !== task?.id),
    [allTasks, task?.id],
  );

  function update<K extends keyof TaskFormState>(
    field: K,
    value: TaskFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submit() {
    const title = form.title.trim();
    if (!title) {
      toast.error(t("tasks.toasts.titleRequired"));
      return;
    }

    const domainId = form.domainId === ALL_VALUE ? null : form.domainId;
    const description = form.description.trim() || null;
    const tags = parseTags(form.tags);

    setSaving(true);
    try {
      if (isEdit && task) {
        const body: TaskUpdate = {
          title,
          description,
          status: form.status,
          priority: form.priority,
          tags,
          domain_id: domainId,
          depends_on: form.dependsOn,
        };
        await api.updateTask(task.id, body);
        toast.success(t("tasks.toasts.updated"));
      } else {
        const body: TaskCreate = {
          title,
          description,
          status: form.status,
          priority: form.priority,
          tags,
          domain_id: domainId,
          depends_on: form.dependsOn,
        };
        await api.createTask(projectSlug, body);
        toast.success(t("tasks.toasts.created"));
      }
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : t("common.somethingWrong"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader className="pb-4">
        <DialogTitle>
          {isEdit ? t("tasks.dialog.editTitle") : t("tasks.dialog.newTitle")}
        </DialogTitle>
        <DialogDescription>
          {isEdit
            ? t("tasks.dialog.editDescription")
            : t("tasks.dialog.newDescription")}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="task-title">{t("tasks.dialog.titleLabel")}</Label>
          <Input
            id="task-title"
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder={t("tasks.dialog.titlePlaceholder")}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="task-description">{t("tasks.dialog.descriptionLabel")}</Label>
          <Textarea
            id="task-description"
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            placeholder={t("tasks.dialog.descriptionPlaceholder")}
            className="min-h-28"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("tasks.dialog.statusLabel")}</Label>
            <Select
              value={form.status}
              onValueChange={(value) =>
                update("status", value as TaskFormState["status"])
              }
            >
              <SelectTrigger className="w-full">
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
          </div>

          <div className="space-y-1.5">
            <Label>{t("tasks.dialog.priorityLabel")}</Label>
            <Select
              value={form.priority}
              onValueChange={(value) =>
                update("priority", value as TaskFormState["priority"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {t(`enums.taskPriority.${priority}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="task-tags">{t("tasks.dialog.tagsLabel")}</Label>
            <Input
              id="task-tags"
              value={form.tags}
              onChange={(event) => update("tags", event.target.value)}
              placeholder={t("tasks.dialog.tagsPlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("tasks.dialog.domainLabel")}</Label>
            <Select
              value={form.domainId}
              onValueChange={(value) => update("domainId", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("tasks.dialog.domainProjectLevel")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>
                  {t("tasks.dialog.domainProjectLevel")}
                </SelectItem>
                {domains.map((domain) => (
                  <SelectItem key={domain.id} value={domain.id}>
                    {domain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{t("tasks.dialog.dependenciesLabel")}</Label>
          <TaskMultiSelect
            options={dependencyOptions}
            value={form.dependsOn}
            onChange={(value) => update("dependsOn", value)}
          />
        </div>
      </div>

      <DialogFooter className="mt-6">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={saving}
        >
          {t("common.cancel")}
        </Button>
        <Button onClick={submit} disabled={saving}>
          {saving
            ? t("common.saving")
            : isEdit
              ? t("common.saveChanges")
              : t("tasks.dialog.createTask")}
        </Button>
      </DialogFooter>
    </>
  );
}
