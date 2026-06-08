"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Layers, Sparkles } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/common";
import { ArtifactStatusBadge } from "@/components/status-badge";
import { FadeIn } from "@/components/motion";
import { cn } from "@/lib/utils";
import type { ArtifactRead, ArtifactTypeRead } from "@/lib/types";

import { ArtifactTypePicker } from "./artifact-type-picker";
import { buildMcpInstruction, McpInstructionBlock } from "./mcp-instruction";

interface ItemArtifactPreviewProps {
  kind: "note" | "task";
  itemId: string | null;
  title: string;
  projectSlug: string;
  onClose: () => void;
}

/**
 * Two-pane preview for a note or task. The left pane summarizes the item; the
 * right pane lists associated artifacts (`/notes/{id}/artifacts` or
 * `/tasks/{id}/artifacts`). When none exist it offers a "Generate from this"
 * affordance with an artifact-type picker and a copyable MCP instruction scoped
 * to the item. Renders nothing while `itemId` is null.
 */
export function ItemArtifactPreview({
  kind,
  itemId,
  title,
  projectSlug,
  onClose,
}: ItemArtifactPreviewProps) {
  const open = itemId !== null;
  const key = itemId ? `/${kind}s/${itemId}/artifacts` : null;
  const { data: artifacts, isLoading } = useSWR<ArtifactRead[]>(key);

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="w-full gap-0 sm:max-w-3xl"
      >
        <SheetHeader className="border-b border-border">
          <SheetTitle className="truncate">{title || "Untitled"}</SheetTitle>
          <SheetDescription>
            Associated artifacts for this {kind}.
          </SheetDescription>
        </SheetHeader>

        <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-2">
          <aside className="border-border p-4 md:border-r">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              {kind === "note" ? "Note" : "Task"}
            </Label>
            <p className="mt-2 text-sm font-medium text-foreground">
              {title || "Untitled"}
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{itemId}</p>
          </aside>

          <ScrollArea className="h-full">
            <div className="p-4">
              {isLoading ? (
                <div className="space-y-2">
                  {[0, 1].map((index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              ) : artifacts?.length ? (
                <ArtifactList artifacts={artifacts} projectSlug={projectSlug} />
              ) : itemId ? (
                <GenerateFromItem
                  kind={kind}
                  itemId={itemId}
                  title={title}
                  projectSlug={projectSlug}
                />
              ) : null}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ArtifactList({
  artifacts,
  projectSlug,
}: {
  artifacts: ArtifactRead[];
  projectSlug: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
        Artifacts ({artifacts.length})
      </Label>
      {artifacts.map((artifact) => (
        <Link
          key={artifact.id}
          href={`/projects/${projectSlug}?tab=artifacts`}
          className={cn(
            "flex items-center gap-2 rounded-lg border border-border bg-background p-3 transition-colors",
            "hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        >
          <Layers className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-sm font-medium">{artifact.title}</span>
          <ArtifactStatusBadge status={artifact.status} />
        </Link>
      ))}
    </div>
  );
}

function GenerateFromItem({
  kind,
  itemId,
  title,
  projectSlug,
}: {
  kind: "note" | "task";
  itemId: string;
  title: string;
  projectSlug: string;
}) {
  const [typeSlug, setTypeSlug] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ArtifactTypeRead | null>(null);

  const instruction = typeSlug
    ? buildMcpInstruction({
        projectSlug,
        artifactTypeSlug: typeSlug,
        title,
        noteIds: kind === "note" ? [itemId] : undefined,
        taskIds: kind === "task" ? [itemId] : undefined,
      })
    : null;

  return (
    <FadeIn className="space-y-4">
      <EmptyState
        icon={Sparkles}
        title="No artifacts yet"
        description="Generate one focused on this item."
        className="py-8"
      />
      <div className="space-y-2">
        <Label className="text-xs">Artifact type</Label>
        <ArtifactTypePicker
          projectSlug={projectSlug}
          value={typeSlug}
          onChange={(slug, type) => {
            setTypeSlug(slug);
            setSelectedType(type);
          }}
        />
        {selectedType?.description ? (
          <p className="text-xs text-muted-foreground">{selectedType.description}</p>
        ) : null}
      </div>
      {instruction ? (
        <>
          <Separator />
          <McpInstructionBlock instruction={instruction} />
        </>
      ) : null}
    </FadeIn>
  );
}
