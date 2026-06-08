"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

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
import { titleCase } from "@/lib/format";
import { api, ApiError } from "@/lib/api";
import {
  PROJECT_STATUSES,
  type ProjectRead,
  type ProjectStatus,
  type ProjectUpdate,
} from "@/lib/types";

import {
  MetadataEditor,
  entriesToMetadata,
  metadataToEntries,
  type MetadataEntry,
} from "./metadata-editor";

interface OverviewEditFormProps {
  project: ProjectRead;
  cacheKey: string;
}

/**
 * The editable status / repository / metadata fields. Remount per project
 * version (`key={project.updated_at}`) so it re-initializes from the latest
 * cache after a mutation, avoiding a setState-in-effect resync.
 */
export function OverviewEditForm({ project, cacheKey }: OverviewEditFormProps) {
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
