"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { useT } from "@/i18n/locale-context";
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
  const t = useT();
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
        toast.success(t("templates.toasts.updated"));
      } else {
        const body: TemplateCreate = {
          name: form.name.trim(),
          description: form.description.trim() || null,
          definition: {},
        };
        await api.createTemplate(body);
        toast.success(t("templates.toasts.created"));
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t("templates.toasts.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("templates.dialog.editTitle") : t("templates.dialog.newTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("templates.dialog.editDescription")
              : t("templates.dialog.newDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tpl-name">{t("templates.dialog.nameLabel")}</Label>
            <Input
              id="tpl-name"
              value={form.name}
              placeholder={t("templates.dialog.namePlaceholder")}
              autoFocus
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tpl-description">{t("templates.dialog.descriptionLabel")}</Label>
            <Textarea
              id="tpl-description"
              value={form.description}
              placeholder={t("templates.dialog.descriptionPlaceholder")}
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
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!canSave || saving}>
              {saving
                ? t("common.saving")
                : isEdit
                  ? t("common.saveChanges")
                  : t("templates.dialog.createTemplate")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
