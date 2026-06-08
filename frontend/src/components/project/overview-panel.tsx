"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { toast } from "sonner";
import { BookmarkPlus, Loader2, Save } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ProjectStatusBadge } from "@/components/status-badge";
import { titleCase } from "@/lib/format";
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

interface OverviewPanelProps {
  project: ProjectRead;
}

/**
 * Editable project metadata: status, repository URL, technology stack (with
 * versions) and free-form key/value metadata. Writes go through `api.*` and
 * revalidate the project's SWR cache; technology changes apply optimistically.
 *
 * The editable form is keyed by `project.updated_at` so it re-initializes from
 * the latest cache after a mutation, avoiding a setState-in-effect resync.
 */
export function OverviewPanel({ project }: OverviewPanelProps) {
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
    <Card className="gap-0">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            Overview
            <ProjectStatusBadge status={project.status} />
          </CardTitle>
          <CardDescription>Edit metadata, stack and repository.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => setTemplateOpen(true)}>
          <BookmarkPlus className="size-3.5" />
          Save as template
        </Button>
      </CardHeader>

      <CardContent className="space-y-5 pt-4">
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
      </CardContent>

      <SaveAsTemplateDialog
        project={project}
        open={templateOpen}
        onOpenChange={setTemplateOpen}
      />
    </Card>
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
    <>
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
    </>
  );
}
