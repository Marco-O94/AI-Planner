"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { useT } from "@/i18n/locale-context";
import {
  NOTE_TYPE_COLORS,
  type NoteTypeColor,
  type NoteTypeCreate,
  type NoteTypeRead,
  type NoteTypeUpdate,
  type ScopeKind,
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
import { NoteTypeBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

interface NoteTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type?: NoteTypeRead | null;
  /** Scope for newly-created types. */
  scope: ScopeKind;
  /** Required when scope === "PROJECT". */
  projectSlug?: string;
  onSaved: () => void;
}

interface FormState {
  name: string;
  description: string;
  color: NoteTypeColor;
}

const EMPTY_FORM: FormState = { name: "", description: "", color: "violet" };

function toForm(type: NoteTypeRead | null | undefined): FormState {
  if (!type) return EMPTY_FORM;
  return { name: type.name, description: type.description ?? "", color: type.color };
}

export function NoteTypeDialog({
  open,
  onOpenChange,
  type,
  scope,
  projectSlug,
  onSaved,
}: NoteTypeDialogProps) {
  const t = useT();
  const [form, setForm] = useState<FormState>(() => toForm(type));
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(type);

  useEffect(() => {
    if (open) setForm(toForm(type));
  }, [open, type]);

  const canSave = form.name.trim().length > 0;

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    try {
      if (isEdit && type) {
        const body: NoteTypeUpdate = {
          name: form.name.trim(),
          description: form.description.trim() || null,
          color: form.color,
        };
        await api.updateNoteType(type.id, body);
        toast.success(t("noteTypes.toasts.updated"));
      } else {
        const body: NoteTypeCreate = {
          scope,
          name: form.name.trim(),
          color: form.color,
          description: form.description.trim() || null,
          project_slug: scope === "PROJECT" ? (projectSlug ?? null) : null,
        };
        await api.createNoteType(body);
        toast.success(t("noteTypes.toasts.created"));
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t("noteTypes.toasts.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("noteTypes.dialog.editTitle") : t("noteTypes.dialog.newTitle")}
          </DialogTitle>
          <DialogDescription>{t("noteTypes.dialog.description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="nt-name">{t("noteTypes.dialog.nameLabel")}</Label>
            <Input
              id="nt-name"
              value={form.name}
              placeholder={t("noteTypes.dialog.namePlaceholder")}
              autoFocus
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nt-description">{t("noteTypes.dialog.descriptionLabel")}</Label>
            <Input
              id="nt-description"
              value={form.description}
              placeholder={t("noteTypes.dialog.descriptionPlaceholder")}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("noteTypes.dialog.colorLabel")}</Label>
            <div className="flex flex-wrap items-center gap-2">
              {NOTE_TYPE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-pressed={form.color === color}
                  aria-label={color}
                  onClick={() => setForm((f) => ({ ...f, color }))}
                  className={cn(
                    "rounded-full outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring",
                    form.color === color
                      ? "ring-2 ring-primary/50"
                      : "opacity-70 hover:opacity-100",
                  )}
                >
                  <NoteTypeBadge
                    type={{
                      id: color,
                      key: null,
                      slug: color,
                      name: form.name.trim() || t("noteTypes.dialog.preview"),
                      color,
                    }}
                  />
                </button>
              ))}
            </div>
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
                  : t("noteTypes.dialog.createType")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
