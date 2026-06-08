"use client";

import { useMemo } from "react";
import { diffLines, type Change } from "diff";

import { cn } from "@/lib/utils";

interface FileDiffProps {
  oldContent: string;
  newContent: string;
}

interface DiffLine {
  kind: "added" | "removed" | "context";
  text: string;
}

function toLines(changes: Change[]): DiffLine[] {
  const lines: DiffLine[] = [];
  for (const change of changes) {
    const kind: DiffLine["kind"] = change.added
      ? "added"
      : change.removed
        ? "removed"
        : "context";
    const segments = change.value.split("\n");
    // A trailing newline produces an empty final segment; drop it.
    if (segments.length > 1 && segments[segments.length - 1] === "") {
      segments.pop();
    }
    for (const text of segments) {
      lines.push({ kind, text });
    }
  }
  return lines;
}

const LINE_STYLE: Record<DiffLine["kind"], string> = {
  added: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  removed: "bg-red-500/10 text-red-700 dark:text-red-300",
  context: "text-muted-foreground",
};

const LINE_PREFIX: Record<DiffLine["kind"], string> = {
  added: "+",
  removed: "-",
  context: " ",
};

/** Per-file line diff between two artifact versions (added / removed / context). */
export function FileDiff({ oldContent, newContent }: FileDiffProps) {
  const lines = useMemo(
    () => toLines(diffLines(oldContent, newContent)),
    [oldContent, newContent],
  );

  const hasChanges = lines.some((line) => line.kind !== "context");
  if (!hasChanges) {
    return (
      <p className="rounded-lg border border-dashed border-border/70 px-3 py-6 text-center text-xs text-muted-foreground">
        No differences between these versions.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60 bg-background/60">
      <pre className="min-w-full text-[0.78rem] leading-relaxed">
        <code className="block font-mono">
          {lines.map((line, index) => (
            <span
              key={index}
              className={cn("flex gap-2 px-3 py-px", LINE_STYLE[line.kind])}
            >
              <span aria-hidden className="select-none opacity-60">
                {LINE_PREFIX[line.kind]}
              </span>
              <span className="whitespace-pre-wrap break-words">{line.text || " "}</span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
