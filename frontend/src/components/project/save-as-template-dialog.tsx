"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-context";
import { api, ApiError } from "@/lib/api";
import type { ProjectRead } from "@/lib/types";

interface SaveAsTemplateDialogProps {
  project: ProjectRead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Captures a name/description and saves the current project as a reusable template. */
export function SaveAsTemplateDialog({
  project,
  open,
  onOpenChange,
}: SaveAsTemplateDialogProps) {
  const t = useT();
  const [name, setName] = useState(
    t("project.template.defaultName", { project: project.name }),
  );
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error(t("project.template.nameRequired"));
      return;
    }
    setSaving(true);
    try {
      const template = await api.saveAsTemplate(project.slug, {
        name: trimmed,
        description: description.trim() || null,
      });
      toast.success(t("project.template.saved", { name: template.name }));
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : t("project.template.saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("project.template.title")}</DialogTitle>
          <DialogDescription>{t("project.template.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="template-name">{t("project.template.nameLabel")}</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="template-description">
              {t("project.template.descriptionLabel")}
            </Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("project.template.descriptionPlaceholder")}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("project.template.saveTemplate")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
