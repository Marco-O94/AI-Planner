"use client";

/**
 * Create / edit dialog for a skill. Reused across the project Skills tab, the
 * project skills page, and the global `/skills` library. When `lockScope` is
 * set (project-inline create) the scope picker is hidden and PROJECT is forced.
 */

import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { ScopeBadge } from "@/components/status-badge";
import { useT } from "@/i18n/locale-context";
import { api, ApiError } from "@/lib/api";
import type { ScopeKind, SkillCreate, SkillRead, SkillUpdate } from "@/lib/types";
import { toast } from "sonner";

import {
  EMPTY_SKILL_FORM,
  formFromSkill,
  parseTags,
  type SkillFormValues,
} from "./skill-form-fields";

const SCOPES: ScopeKind[] = ["GLOBAL", "PROJECT"];

interface SkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing skill to edit; omit for create mode. */
  skill?: SkillRead;
  /** Force PROJECT scope and hide the scope picker (project-inline create). */
  lockScope?: ScopeKind;
  /** Project slug a new PROJECT-scoped skill belongs to. */
  projectSlug?: string;
  /** Pre-fill form values (e.g. from a parsed upload). */
  initial?: Partial<SkillFormValues>;
  /** Called after a successful create/update so callers can revalidate SWR. */
  onSaved: (skill: SkillRead) => void;
}

export function SkillDialog({
  open,
  onOpenChange,
  skill,
  lockScope,
  projectSlug,
  initial,
  onSaved,
}: SkillDialogProps) {
  const t = useT();
  const isEdit = Boolean(skill);
  const [values, setValues] = useState<SkillFormValues>(EMPTY_SKILL_FORM);
  const [saving, setSaving] = useState(false);

  // Re-seed the form each time the dialog opens so stale state never leaks in.
  useEffect(() => {
    if (!open) return;
    const base = skill
      ? formFromSkill(skill)
      : { ...EMPTY_SKILL_FORM, scope: lockScope ?? EMPTY_SKILL_FORM.scope };
    setValues({ ...base, ...initial });
  }, [open, skill, lockScope, initial]);

  function patch(part: Partial<SkillFormValues>) {
    setValues((prev) => ({ ...prev, ...part }));
  }

  const canSave = values.name.trim() && values.description.trim() && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const tags = parseTags(values.tagsInput);
      let result: SkillRead;
      if (skill) {
        const body: SkillUpdate = {
          name: values.name.trim(),
          description: values.description.trim(),
          content: values.content,
          tags,
        };
        result = await api.updateSkill(skill.id, body);
        toast.success(t("skills.toasts.skillUpdated"));
      } else {
        const scope = lockScope ?? values.scope;
        const body: SkillCreate = {
          scope,
          name: values.name.trim(),
          description: values.description.trim(),
          content: values.content,
          tags,
          project_slug: scope === "PROJECT" ? projectSlug ?? null : null,
        };
        result = await api.createSkill(body);
        toast.success(t("skills.toasts.skillCreated"));
      }
      onSaved(result);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : t("skills.toasts.saveError"),
      );
    } finally {
      setSaving(false);
    }
  }

  const scopeLocked = Boolean(lockScope) || isEdit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>
            {isEdit ? t("skills.dialog.editTitle") : t("skills.dialog.newTitle")}
          </DialogTitle>
          <DialogDescription>{t("skills.dialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60vh] gap-4 overflow-y-auto px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            <div className="grid gap-1.5">
              <Label htmlFor="skill-scope" className="text-xs text-muted-foreground">
                {t("skills.dialog.scopeLabel")}
              </Label>
              {scopeLocked ? (
                <div className="flex h-9 items-center">
                  <ScopeBadge scope={skill?.scope ?? lockScope ?? values.scope} />
                </div>
              ) : (
                <Select
                  value={values.scope}
                  onValueChange={(scope) => patch({ scope: scope as ScopeKind })}
                >
                  <SelectTrigger id="skill-scope" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCOPES.map((scope) => (
                      <SelectItem key={scope} value={scope}>
                        <ScopeBadge scope={scope} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="skill-name" className="text-xs text-muted-foreground">
                {t("skills.dialog.nameLabel")}
              </Label>
              <Input
                id="skill-name"
                value={values.name}
                placeholder={t("skills.dialog.namePlaceholder")}
                onChange={(event) => patch({ name: event.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="skill-description" className="text-xs text-muted-foreground">
              {t("skills.dialog.descriptionLabel")}
            </Label>
            <Input
              id="skill-description"
              value={values.description}
              placeholder={t("skills.dialog.descriptionPlaceholder")}
              onChange={(event) => patch({ description: event.target.value })}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="skill-content" className="text-xs text-muted-foreground">
              {t("skills.dialog.contentLabel")}{" "}
              <span className="font-normal opacity-70">
                {t("skills.dialog.contentHint")}
              </span>
            </Label>
            <MarkdownEditor
              id="skill-content"
              value={values.content}
              placeholder={t("skills.dialog.contentPlaceholder")}
              className="min-h-48"
              onChange={(content) => patch({ content })}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="skill-tags" className="text-xs text-muted-foreground">
              {t("skills.dialog.tagsLabel")}{" "}
              <span className="font-normal opacity-70">
                {t("skills.dialog.tagsHint")}
              </span>
            </Label>
            <Input
              id="skill-tags"
              value={values.tagsInput}
              placeholder={t("skills.dialog.tagsPlaceholder")}
              onChange={(event) => patch({ tagsInput: event.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {saving
              ? t("common.saving")
              : isEdit
                ? t("common.saveChanges")
                : t("skills.dialog.createSkill")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
