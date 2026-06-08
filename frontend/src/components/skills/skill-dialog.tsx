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
import { Textarea } from "@/components/ui/textarea";
import { ScopeBadge } from "@/components/status-badge";
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
        toast.success("Skill updated");
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
        toast.success("Skill created");
      }
      onSaved(result);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not save skill");
    } finally {
      setSaving(false);
    }
  }

  const scopeLocked = Boolean(lockScope) || isEdit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>{isEdit ? "Edit skill" : "New skill"}</DialogTitle>
          <DialogDescription>
            Skills are reusable instructions Claude Code can pull into a project.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60vh] gap-4 overflow-y-auto px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            <div className="grid gap-1.5">
              <Label htmlFor="skill-scope" className="text-xs text-muted-foreground">
                Scope
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
                Name
              </Label>
              <Input
                id="skill-name"
                value={values.name}
                placeholder="e.g. Repository pattern"
                onChange={(event) => patch({ name: event.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="skill-description" className="text-xs text-muted-foreground">
              Description
            </Label>
            <Input
              id="skill-description"
              value={values.description}
              placeholder="One line on when to use this skill"
              onChange={(event) => patch({ description: event.target.value })}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="skill-content" className="text-xs text-muted-foreground">
              Content <span className="font-normal opacity-70">(markdown)</span>
            </Label>
            <Textarea
              id="skill-content"
              value={values.content}
              placeholder={"## Guidance\n\nWrite the reusable instructions here…"}
              className="min-h-48 font-mono text-[0.8125rem] leading-relaxed"
              onChange={(event) => patch({ content: event.target.value })}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="skill-tags" className="text-xs text-muted-foreground">
              Tags <span className="font-normal opacity-70">(space or comma)</span>
            </Label>
            <Input
              id="skill-tags"
              value={values.tagsInput}
              placeholder="architecture, testing"
              onChange={(event) => patch({ tagsInput: event.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create skill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
