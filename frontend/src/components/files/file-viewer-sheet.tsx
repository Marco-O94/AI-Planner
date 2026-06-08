"use client";

import { FileWarning } from "lucide-react";

import { CopyButton, TagList } from "@/components/common";
import { HighlightedSnippet, Markdown } from "@/components/markdown";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useT } from "@/i18n/locale-context";
import type { FileEntryRead } from "@/lib/types";

import { FileKindBadge } from "./file-kind-badge";
import { useFileContent } from "./use-file-content";

interface FileViewerSheetProps {
  entry: FileEntryRead | null;
  projectName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Slide-over viewer that renders a saved file's resolved content as markdown. */
export function FileViewerSheet({
  entry,
  projectName,
  open,
  onOpenChange,
}: FileViewerSheetProps) {
  const t = useT();
  const { content, isLoading, unavailableReason } = useFileContent(open ? entry : null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-xl"
        aria-describedby={undefined}
      >
        {entry ? (
          <>
            <SheetHeader className="border-b p-4 pr-12">
              <div className="flex flex-wrap items-center gap-2">
                <FileKindBadge kind={entry.kind} />
                {projectName ? (
                  <span className="text-xs text-muted-foreground">
                    {t("files.viewer.inProject", { project: projectName })}
                  </span>
                ) : null}
              </div>
              <SheetTitle className="text-balance">{entry.title}</SheetTitle>
              {entry.path ? (
                <SheetDescription className="flex items-center gap-2">
                  <code className="truncate text-xs">{entry.path}</code>
                  <CopyButton value={entry.path} size="icon" className="size-6" />
                </SheetDescription>
              ) : null}
              {entry.tags.length ? <TagList tags={entry.tags} className="pt-1" /> : null}
            </SheetHeader>

            <ScrollArea className="min-h-0 flex-1">
              <div className="p-4">
                <FileViewerBody
                  isLoading={isLoading}
                  content={content}
                  snippet={entry.snippet}
                  unavailableReason={unavailableReason}
                />
              </div>
            </ScrollArea>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

interface FileViewerBodyProps {
  isLoading: boolean;
  content: string | null;
  snippet: string | null;
  unavailableReason: string | null;
}

function FileViewerBody({
  isLoading,
  content,
  snippet,
  unavailableReason,
}: FileViewerBodyProps) {
  const t = useT();
  if (isLoading) {
    return (
      <div className="space-y-2.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-5 h-4 w-1/2" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (content && content.trim()) {
    return <Markdown>{content}</Markdown>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-lg border border-dashed border-border/80 bg-muted/40 p-3 text-sm text-muted-foreground">
        <FileWarning className="mt-0.5 size-4 shrink-0" />
        <span>{unavailableReason ?? t("files.viewer.noContent")}</span>
      </div>
      {snippet ? (
        <>
          <Separator />
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {t("files.viewer.matchedSnippet")}
            </p>
            <HighlightedSnippet snippet={snippet} />
          </div>
        </>
      ) : null}
    </div>
  );
}
