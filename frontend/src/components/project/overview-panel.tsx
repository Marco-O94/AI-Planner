"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { toast } from "sonner";
import {
  BookmarkPlus,
  ExternalLink,
  FileText,
  Layers,
  Loader2,
  Save,
  StickyNote,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProjectStatusBadge, TechKindBadge } from "@/components/status-badge";
import { titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";
import { api, ApiError } from "@/lib/api";
import {
  PROJECT_STATUSES,
  type ProjectRead,
  type ProjectStatus,
  type ProjectUpdate,
  type TechnologyInput,
} from "@/lib/types";

import { TechPicker } from "./tech-picker";
import {
  MetadataEditor,
  entriesToMetadata,
  metadataToEntries,
  type MetadataEntry,
} from "./metadata-editor";
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
            <span className="text-xs text-muted-foreground">+{overflow} more</span>
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
            Repository
          </a>
        </>
      ) : null}

      <RailDivider />
      <span className="inline-flex items-center gap-1.5">
        <StickyNote className="size-3.5" />
        <span className="tabular-nums">{project.note_count}</span> notes
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Layers className="size-3.5" />
        <span className="tabular-nums">{project.artifact_count}</span> artifacts
      </span>
      <span className="inline-flex items-center gap-1.5">
        <FileText className="size-3.5" />
        <span className="tabular-nums">{project.task_count}</span> tasks
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
  const { mutate } = useSWRConfig();
  const cacheKey = `/projects/${project.slug}`;

  const [templateOpen, setTemplateOpen] = useState(false);
  const [techBusy, setTechBusy] = useState(false);

  async function attachTechnology(input: TechnologyInput) {
    setTechBusy(true);
    try {
      const updated = await api.attachTechnology(project.slug, input);
      await mutate(cacheKey, updated, { revalidate: false });
      toast.success(`Added ${input.name}.`);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not add the technology.",
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
        error instanceof ApiError ? error.message : "Could not remove the technology.",
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
            Edit project
            <ProjectStatusBadge status={project.status} />
          </SheetTitle>
          <SheetDescription>
            Status, repository, metadata and technology stack.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-5 px-4 pb-6">
            <OverviewForm
              key={project.updated_at}
              project={project}
              cacheKey={cacheKey}
            />

            <Separator />

            <div className="space-y-2">
              <Label>Technologies</Label>
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

interface OverviewFormProps {
  project: ProjectRead;
  cacheKey: string;
}

/** The editable status / repository / metadata fields, remounted per project version. */
function OverviewForm({ project, cacheKey }: OverviewFormProps) {
  const { mutate } = useSWRConfig();

  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [repositoryUrl, setRepositoryUrl] = useState(project.repository_url ?? "");
  const [entries, setEntries] = useState<MetadataEntry[]>(() =>
    metadataToEntries(project.metadata),
  );
  const [saving, setSaving] = useState(false);

  const dirty =
    status !== project.status ||
    repositoryUrl !== (project.repository_url ?? "") ||
    JSON.stringify(entriesToMetadata(entries)) !== JSON.stringify(project.metadata);

  async function save() {
    setSaving(true);
    const body: ProjectUpdate = {
      status,
      repository_url: repositoryUrl.trim() || null,
      metadata: entriesToMetadata(entries),
    };
    try {
      const updated = await api.updateProject(project.slug, body);
      await mutate(cacheKey, updated, { revalidate: false });
      toast.success("Project updated.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="project-status">Status</Label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as ProjectStatus)}
          >
            <SelectTrigger id="project-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_STATUSES.map((option) => (
                <SelectItem key={option} value={option}>
                  {titleCase(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="project-repo">Repository URL</Label>
          <Input
            id="project-repo"
            value={repositoryUrl}
            onChange={(event) => setRepositoryUrl(event.target.value)}
            placeholder="https://github.com/org/repo"
            inputMode="url"
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label>Metadata</Label>
        <MetadataEditor entries={entries} onChange={setEntries} />
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={!dirty || saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save changes
        </Button>
      </div>
    </div>
  );
}
