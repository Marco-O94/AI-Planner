"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { ArrowRight, GitCompare } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common";
import { formatDate } from "@/lib/format";
import { versionFilesKey } from "./lib";
import { FileDiff } from "./file-diff";
import type { ArtifactFileRead, VersionFilesRead, VersionRefRead } from "@/lib/types";

interface VersionSwitcherProps {
  artifactId: string;
  versions: VersionRefRead[];
  currentVersionNumber: number;
}

function versionLabel(version: VersionRefRead): string {
  const date = formatDate(version.created_at);
  return `v${version.version_number}${date !== "—" ? ` · ${date}` : ""}`;
}

function useVersionFiles(artifactId: string, versionNumber: number | null) {
  return useSWR<VersionFilesRead>(
    versionNumber != null ? versionFilesKey(artifactId, versionNumber) : null,
  );
}

interface FilePair {
  path: string;
  oldContent: string;
  newContent: string;
}

function pairFiles(base?: ArtifactFileRead[], target?: ArtifactFileRead[]): FilePair[] {
  const byPath = new Map<string, FilePair>();
  for (const file of base ?? []) {
    byPath.set(file.path, { path: file.path, oldContent: file.content, newContent: "" });
  }
  for (const file of target ?? []) {
    const existing = byPath.get(file.path);
    if (existing) existing.newContent = file.content;
    else byPath.set(file.path, { path: file.path, oldContent: "", newContent: file.content });
  }
  return Array.from(byPath.values()).sort((a, b) => a.path.localeCompare(b.path));
}

/** Version selector with a per-file diff between a base and a target version. */
export function VersionSwitcher({
  artifactId,
  versions,
  currentVersionNumber,
}: VersionSwitcherProps) {
  const sorted = useMemo(
    () => [...versions].sort((a, b) => b.version_number - a.version_number),
    [versions],
  );
  const previous = sorted.find((v) => v.version_number < currentVersionNumber);

  const [baseNumber, setBaseNumber] = useState<number | null>(
    previous?.version_number ?? null,
  );
  const [targetNumber, setTargetNumber] = useState<number>(currentVersionNumber);

  const base = useVersionFiles(artifactId, baseNumber);
  const target = useVersionFiles(artifactId, targetNumber);

  if (versions.length < 2) {
    return (
      <EmptyState
        icon={GitCompare}
        title="Only one version"
        description="Diffs appear once a second version of this artifact is generated."
      />
    );
  }

  const isLoading =
    (baseNumber != null && base.isLoading) || target.isLoading;
  const pairs = pairFiles(base.data?.files, target.data?.files);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card p-3">
        <span className="text-xs font-medium text-muted-foreground">Compare</span>
        <Select
          value={baseNumber != null ? String(baseNumber) : ""}
          onValueChange={(value) => setBaseNumber(Number(value))}
        >
          <SelectTrigger className="h-8 w-[160px]">
            <SelectValue placeholder="Base version" />
          </SelectTrigger>
          <SelectContent>
            {sorted.map((version) => (
              <SelectItem key={version.id} value={String(version.version_number)}>
                {versionLabel(version)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ArrowRight className="size-4 text-muted-foreground" />
        <Select
          value={String(targetNumber)}
          onValueChange={(value) => setTargetNumber(Number(value))}
        >
          <SelectTrigger className="h-8 w-[160px]">
            <SelectValue placeholder="Target version" />
          </SelectTrigger>
          <SelectContent>
            {sorted.map((version) => (
              <SelectItem key={version.id} value={String(version.version_number)}>
                {versionLabel(version)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : pairs.length ? (
        <div className="space-y-5">
          {pairs.map((pair) => (
            <div key={pair.path} className="space-y-2">
              <p className="font-mono text-xs text-muted-foreground">{pair.path}</p>
              <FileDiff oldContent={pair.oldContent} newContent={pair.newContent} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={GitCompare}
          title="No files to compare"
          description="Neither version contains files at the selected revisions."
        />
      )}
    </div>
  );
}
