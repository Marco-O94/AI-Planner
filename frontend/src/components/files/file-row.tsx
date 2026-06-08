"use client";

import { ChevronRight } from "lucide-react";

import { HighlightedSnippet } from "@/components/markdown";
import { TagList } from "@/components/common";
import { useT } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";
import type { FileEntryRead } from "@/lib/types";

import { FileKindBadge, FileKindIcon } from "./file-kind-badge";

interface FileRowProps {
  entry: FileEntryRead;
  /** Project name shown when results span multiple projects (search view). */
  projectName?: string;
  onOpen: (entry: FileEntryRead) => void;
}

/** A single saved-file result: title/path, kind badge, snippet, tags. */
export function FileRow({ entry, projectName, onOpen }: FileRowProps) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={() => onOpen(entry)}
      className={cn(
        "group/file-row flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3.5 text-left transition-all",
        "hover:border-primary/40 hover:bg-muted/40 hover:shadow-sm",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        "active:translate-y-px",
      )}
    >
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground transition-colors group-hover/file-row:bg-primary/10 group-hover/file-row:text-primary">
        <FileKindIcon kind={entry.kind} className="size-4" />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium text-foreground">{entry.title}</span>
          <FileKindBadge kind={entry.kind} />
          {projectName ? (
            <span className="truncate text-xs text-muted-foreground">
              {t("files.row.inProject", { project: projectName })}
            </span>
          ) : null}
        </span>

        {entry.path ? (
          <code className="truncate text-xs text-muted-foreground">{entry.path}</code>
        ) : null}

        {entry.snippet ? (
          <HighlightedSnippet snippet={entry.snippet} className="line-clamp-2 text-sm" />
        ) : null}

        {entry.tags.length ? <TagList tags={entry.tags} className="pt-0.5" /> : null}
      </span>

      <ChevronRight className="mt-2.5 size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover/file-row:translate-x-0.5 group-hover/file-row:text-foreground" />
    </button>
  );
}
