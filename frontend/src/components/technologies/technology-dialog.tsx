"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { useT } from "@/i18n/locale-context";
import {
  TECHNOLOGY_KINDS,
  type TechnologyKind,
  type TechnologyRead,
} from "@/lib/types";
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

interface TechnologyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technology?: TechnologyRead | null;
  /** Pre-selected kind for newly-created technologies. */
  kind: TechnologyKind;
  onSaved: () => void;
}

interface FormState {
  kind: TechnologyKind;
  name: string;
}

function toForm(
  technology: TechnologyRead | null | undefined,
  fallbackKind: TechnologyKind,
): FormState {
  if (!technology) return { kind: fallbackKind, name: "" };
  return { kind: technology.kind, name: technology.name };
}

export function TechnologyDialog({
  open,
  onOpenChange,
  technology,
  kind,
  onSaved,
}: TechnologyDialogProps) {
  const t = useT();
  const [form, setForm] = useState<FormState>(() => toForm(technology, kind));
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(technology);

  useEffect(() => {
    if (open) setForm(toForm(technology, kind));
  }, [open, technology, kind]);

  const canSave = form.name.trim().length > 0;

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    try {
      if (isEdit && technology) {
        await api.updateTechnology(technology.id, {
          kind: form.kind,
          name: form.name.trim(),
        });
        toast.success(t("technologies.toasts.updated"));
      } else {
        await api.createTechnology({ kind: form.kind, name: form.name.trim() });
        toast.success(t("technologies.toasts.created"));
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : t("technologies.toasts.saveError"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("technologies.dialog.editTitle")
              : t("technologies.dialog.newTitle")}
          </DialogTitle>
          <DialogDescription>{t("technologies.dialog.description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="tech-kind">{t("technologies.dialog.kindLabel")}</Label>
            <Select
              value={form.kind}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, kind: value as TechnologyKind }))
              }
            >
              <SelectTrigger id="tech-kind" className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TECHNOLOGY_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {t(`enums.techKind.${k}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tech-name">{t("technologies.dialog.nameLabel")}</Label>
            <Input
              id="tech-name"
              value={form.name}
              placeholder={t("technologies.dialog.namePlaceholder")}
              autoFocus
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
                  : t("technologies.dialog.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
