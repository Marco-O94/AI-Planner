"use client";

import { ChevronRight, FileStack } from "lucide-react";

import { ArtifactStatusBadge } from "@/components/status-badge";
import { AnimatedItem, AnimatedList } from "@/components/motion";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { groupArtifactsByType } from "./lib";
import type { ArtifactRead, ArtifactTypeRead } from "@/lib/types";

interface ArtifactListProps {
  artifacts: ArtifactRead[];
  types: ArtifactTypeRead[];
  selectedId: string | null;
  onSelect: (artifactId: string) => void;
}

/** Artifacts grouped by type, each row selecting the artifact detail. */
export function ArtifactList({
  artifacts,
  types,
  selectedId,
  onSelect,
}: ArtifactListProps) {
  const groups = groupArtifactsByType(artifacts, types);

  return (
    <AnimatedList className="space-y-6">
      {groups.map((group) => (
        <AnimatedItem key={group.typeId} className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <FileStack className="size-3.5 text-muted-foreground" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.typeName}
            </h3>
            <span className="text-xs text-muted-foreground/70">
              {group.artifacts.length}
            </span>
          </div>
          <div className="space-y-1.5">
            {group.artifacts.map((artifact) => (
              <ArtifactRow
                key={artifact.id}
                artifact={artifact}
                selected={artifact.id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </div>
        </AnimatedItem>
      ))}
    </AnimatedList>
  );
}

interface ArtifactRowProps {
  artifact: ArtifactRead;
  selected: boolean;
  onSelect: (artifactId: string) => void;
}

function ArtifactRow({ artifact, selected, onSelect }: ArtifactRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(artifact.id)}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "group flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
        "border-border/70 bg-card hover:border-primary/40 hover:bg-primary/[0.04]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected && "border-primary/50 bg-primary/[0.06] ring-1 ring-primary/20",
      )}
    >
      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-sm font-medium">{artifact.title}</p>
        <p className="text-xs text-muted-foreground">
          Updated {formatDate(artifact.updated_at)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ArtifactStatusBadge status={artifact.status} />
        <ChevronRight
          className={cn(
            "size-4 text-muted-foreground/50 transition-transform",
            "group-hover:translate-x-0.5 group-hover:text-primary",
          )}
        />
      </div>
    </button>
  );
}
