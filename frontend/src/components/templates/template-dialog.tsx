"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import type { TemplateCreate, TemplateRead, TemplateUpdate } from "@/lib/types";
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
import { Textarea } from "@/components/ui/textarea";

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this template; otherwise it creates a new one. */
  template?: TemplateRead | null;
  onSaved: () => void;
}

interface FormState {
  name: string;
  description: string;
}

function toForm(template: TemplateRead | null | undefined): FormState {
  return {
    name: template?.name ?? "",
    description: template?.description ?? "",
  };
}

export function TemplateDialog({
  open,
  onOpenChange,
  template,
  onSaved,
}: TemplateDialogProps) {
  const [form, setForm] = useState<FormState>(() => toForm(template));
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(template);

  useEffect(() => {
    if (open) setForm(toForm(template));
  }, [open, template]);

  const canSave = form.name.trim().length > 0;

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    try {
      if (isEdit && template) {
        const body: TemplateUpdate = {
          name: form.name.trim(),
          description: form.description.trim() || null,
        };
        await api.updateTemplate(template.id, body);
        toast.success("Template updated");
      } else {
        const body: TemplateCreate = {
          name: form.name.trim(),
          description: form.description.trim() || null,
          definition: {},
        };
        await api.createTemplate(body);
        toast.success("Template created");
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not save template");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit template" : "New template"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the name and description for this project template."
              : "Create a reusable starting point for new projects. Capture its full definition by using “Save as template” on an existing project."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tpl-name">Name</Label>
            <Input
              id="tpl-name"
              value={form.name}
              placeholder="SaaS starter"
              autoFocus
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tpl-description">Description</Label>
            <Textarea
              id="tpl-description"
              value={form.description}
              placeholder="What kind of project this template is for…"
              rows={4}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave || saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
