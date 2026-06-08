"use client";

import { CopyButton } from "@/components/common";
import { cn } from "@/lib/utils";

/**
 * Build the copyable MCP instruction prompt the user pastes into Claude Code to
 * generate / save a typed artifact for a project. When `noteIds` / `taskIds`
 * are provided the generation is scoped to those focused items; otherwise the
 * agent works from the complete project context.
 */
export function buildMcpInstruction({
  projectSlug,
  artifactTypeSlug,
  title,
  noteIds,
  taskIds,
}: {
  projectSlug: string;
  artifactTypeSlug: string;
  title?: string;
  noteIds?: string[];
  taskIds?: string[];
}): string {
  const focus: string[] = [];
  if (noteIds?.length) focus.push(`note_ids=${JSON.stringify(noteIds)}`);
  if (taskIds?.length) focus.push(`task_ids=${JSON.stringify(taskIds)}`);
  const focusArgs = focus.length ? `, ${focus.join(", ")}` : "";
  const artifactTitle = title?.trim() || "<title>";

  return [
    "Using the project-notes MCP server:",
    `1. Call prepare_generation(project_slug="${projectSlug}", artifact_type_slug="${artifactTypeSlug}"${focusArgs}).`,
    "2. Produce every file declared in the artifact type's manifest.",
    `3. Call save_artifact(project_slug="${projectSlug}", artifact_type_slug="${artifactTypeSlug}", title="${artifactTitle}", files=[...]).`,
  ].join("\n");
}

/** Renders an MCP instruction prompt in a <pre> with a copy affordance. */
export function McpInstructionBlock({
  instruction,
  className,
}: {
  instruction: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative overflow-hidden rounded-lg border border-border bg-muted/50">
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words p-3 pr-12 font-mono text-xs leading-relaxed text-foreground">
          {instruction}
        </pre>
        <div className="absolute right-2 top-2">
          <CopyButton value={instruction} size="icon" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Paste this into Claude Code. The artifacts list refreshes once the agent saves.
      </p>
    </div>
  );
}
