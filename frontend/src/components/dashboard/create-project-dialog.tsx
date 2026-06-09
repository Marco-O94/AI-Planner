"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, api } from "@/lib/api";
import { useT } from "@/i18n/locale-context";
import { PROJECT_STATUSES } from "@/lib/types";
import type {
  ProjectStatus,
  TechnologyInput,
  TemplateRead,
} from "@/lib/types";
import { TechPicker } from "./tech-picker";
import { useTechnologies } from "./use-technologies";

const NO_TEMPLATE = "__none__";

interface CreateProjectDialogProps {
  /** Revalidate the dashboard list after a successful create. */
  onCreated: () => void;
}

interface FormState {
  name: string;
  description: string;
  status: ProjectStatus;
  templateSlug: string;
  technologies: TechnologyInput[];
}

const INITIAL_FORM: FormState = {
  name: "",
  description: "",
  status: "ACTIVE",
  templateSlug: NO_TEMPLATE,
  technologies: [],
};

export function CreateProjectDialog({ onCreated }: CreateProjectDialogProps) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const { grouped, isLoading: techLoading } = useTechnologies();
  const { data: templates } = useSWR<TemplateRead[]>(open ? "/templates" : null);

  function patch(next: Partial<FormState>) {
    setForm((current) => ({ ...current, ...next }));
  }

  function reset() {
    setForm(INITIAL_FORM);
  }

  function onOpenChange(next: boolean) {
    if (submitting) return;
    if (!next) reset();
    setOpen(next);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      toast.error(t("dashboard.create.nameRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.createProject({
        name,
        description: form.description.trim() || null,
        status: form.status,
        technologies: form.technologies,
        template_slug:
          form.templateSlug === NO_TEMPLATE ? null : form.templateSlug,
      });
      toast.success(t("dashboard.create.created", { name: created.name }));
      onCreated();
      setOpen(false);
      reset();
      router.push(`/projects/${created.slug}`);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : t("dashboard.create.error"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          {t("dashboard.create.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("dashboard.create.title")}</DialogTitle>
          <DialogDescription>
            {t("dashboard.create.description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="project-name">
              {t("dashboard.create.nameLabel")}
            </Label>
            <Input
              id="project-name"
              value={form.name}
              onChange={(event) => patch({ name: event.target.value })}
              placeholder={t("dashboard.create.namePlaceholder")}
              autoFocus
              required
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="project-description">
              {t("dashboard.create.descriptionLabel")}
            </Label>
            <Textarea
              id="project-description"
              value={form.description}
              onChange={(event) => patch({ description: event.target.value })}
              placeholder={t("dashboard.create.descriptionPlaceholder")}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="project-status">
                {t("dashboard.create.statusLabel")}
              </Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  patch({ status: value as ProjectStatus })
                }
              >
                <SelectTrigger id="project-status" className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {t(`enums.projectStatus.${status}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="project-template">
                {t("dashboard.create.templateLabel")}
              </Label>
              <Select
                value={form.templateSlug}
                onValueChange={(value) => patch({ templateSlug: value })}
              >
                <SelectTrigger id="project-template" className="h-9 w-full">
                  <SelectValue placeholder={t("common.none")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TEMPLATE}>{t("common.none")}</SelectItem>
                  {(templates ?? []).map((template) => (
                    <SelectItem key={template.id} value={template.slug}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("dashboard.create.technologiesLabel")}</Label>
            <TechPicker
              value={form.technologies}
              onChange={(technologies) => patch({ technologies })}
              grouped={grouped}
              disabled={techLoading}
            />
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("dashboard.create.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
