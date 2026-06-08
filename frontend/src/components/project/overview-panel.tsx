"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { toast } from "sonner";
import {
  BookmarkPlus,
  ExternalLink,
  FileText,
  Layers,
  StickyNote,
} from "lucide-react";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useT } from "@/i18n/locale-context";
import { ProjectStatusBadge, TechKindBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { api, ApiError } from "@/lib/api";
import type { ProjectRead, TechnologyInput } from "@/lib/types";

import { TechPicker } from "./tech-picker";
import { OverviewEditForm } from "./overview-edit-form";
import { SaveAsTemplateDialog } from "./save-as-template-dialog";

interface ProjectMetaRailProps {
  project: ProjectRead;
  className?: string;
}

const MAX_RAIL_TECHS = 5;

/**
 * Compact, read-only project context strip for the page header. Surfaces the
 * tech stack, repository link and note/task/artifact counts without the
 * always-on edit forms. Editing happens on demand via {@link EditProjectSheet}.
 */
export function ProjectMetaRail({ project, className }: ProjectMetaRailProps) {
  const t = useT();
  const techs = project.technologies;
  const shown = techs.slice(0, MAX_RAIL_TECHS);
  const overflow = techs.length - shown.length;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground",
        className,
      )}
    >
      {shown.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {shown.map((tech) => (
            <TechKindBadge key={tech.id} kind={tech.kind}>
              {tech.version ? `${tech.name} ${tech.version}` : tech.name}
            </TechKindBadge>
          ))}
          {overflow > 0 ? (
            <span className="text-xs text-muted-foreground">
              {t("project.meta.more", { count: overflow })}
            </span>
          ) : null}
        </div>
      ) : null}

      {project.repository_url ? (
        <>
          <RailDivider />
          <a
            href={project.repository_url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 font-medium text-foreground transition-colors hover:text-primary"
          >
            <ExternalLink className="size-3.5" />
            {t("project.meta.repository")}
          </a>
        </>
      ) : null}

      <RailDivider />
      <span className="inline-flex items-center gap-1.5">
        <StickyNote className="size-3.5" />
        <span className="tabular-nums">{project.note_count}</span>{" "}
        {t("project.meta.notes")}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Layers className="size-3.5" />
        <span className="tabular-nums">{project.artifact_count}</span>{" "}
        {t("project.meta.artifacts")}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <FileText className="size-3.5" />
        <span className="tabular-nums">{project.task_count}</span>{" "}
        {t("project.meta.tasks")}
      </span>
    </div>
  );
}

function RailDivider() {
  return <span aria-hidden className="hidden h-3.5 w-px bg-border sm:inline-block" />;
}

interface EditProjectSheetProps {
  project: ProjectRead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * On-demand editor for project status, repository URL, free-form metadata and
 * the technology stack, plus a "Save as template" entry point. Mounted in a
 * right-side Sheet so it does not clutter the working surface.
 *
 * The editable form is keyed by `project.updated_at` so it re-initializes from
 * the latest cache after a mutation, avoiding a setState-in-effect resync.
 */
export function EditProjectSheet({
  project,
  open,
  onOpenChange,
}: EditProjectSheetProps) {
  const t = useT();
  const { mutate } = useSWRConfig();
  const cacheKey = `/projects/${project.slug}`;

  const [templateOpen, setTemplateOpen] = useState(false);
  const [techBusy, setTechBusy] = useState(false);

  async function attachTechnology(input: TechnologyInput) {
    setTechBusy(true);
    try {
      const updated = await api.attachTechnology(project.slug, input);
      await mutate(cacheKey, updated, { revalidate: false });
      toast.success(t("project.edit.techAdded", { name: input.name }));
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : t("project.edit.techAddFailed"),
      );
    } finally {
      setTechBusy(false);
    }
  }

  async function detachTechnology(technologyId: string) {
    setTechBusy(true);
    const previous = project;
    // Optimistic removal.
    await mutate(
      cacheKey,
      {
        ...project,
        technologies: project.technologies.filter((tech) => tech.id !== technologyId),
      },
      { revalidate: false },
    );
    try {
      const updated = await api.detachTechnology(project.slug, technologyId);
      await mutate(cacheKey, updated, { revalidate: false });
    } catch (error) {
      await mutate(cacheKey, previous, { revalidate: false });
      toast.error(
        error instanceof ApiError ? error.message : t("project.edit.techRemoveFailed"),
      );
    } finally {
      setTechBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 sm:max-w-md"
        aria-describedby={undefined}
      >
        <SheetHeader className="gap-1">
          <SheetTitle className="flex items-center gap-2">
            {t("project.edit.title")}
            <ProjectStatusBadge status={project.status} />
          </SheetTitle>
          <SheetDescription>{t("project.edit.description")}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-5 px-4 pb-6">
            <OverviewEditForm
              key={project.updated_at}
              project={project}
              cacheKey={cacheKey}
            />

            <Separator />

            <div className="space-y-2">
              <Label>{t("project.edit.technologies")}</Label>
              <TechPicker
                attached={project.technologies}
                onAttach={attachTechnology}
                onDetach={detachTechnology}
                busy={techBusy}
              />
            </div>

            <Separator />

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setTemplateOpen(true)}
            >
              <BookmarkPlus className="size-3.5" />
              Save as template
            </Button>
          </div>
        </ScrollArea>
      </SheetContent>

      <SaveAsTemplateDialog
        project={project}
        open={templateOpen}
        onOpenChange={setTemplateOpen}
      />
    </Sheet>
  );
}
