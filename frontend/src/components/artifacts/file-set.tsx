"use client";

import { Download, FileCode2 } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/common";
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/utils";
import { fileLabel, singleFileExportUrl, sortedFiles, triggerDownload } from "./lib";
import type { ArtifactFileRead } from "@/lib/types";

interface FileSetProps {
  artifactId: string;
  files: ArtifactFileRead[];
}

const MARKDOWN_EXT = /\.(md|markdown|mdx)$/i;

function isMarkdownPath(path: string): boolean {
  return MARKDOWN_EXT.test(path);
}

function languageFence(path: string, content: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return `\`\`\`${ext}\n${content}\n\`\`\``;
}

/** Tabbed/accordion view of the current version's files, each with its manifest note. */
export function FileSet({ artifactId, files }: FileSetProps) {
  const ordered = sortedFiles(files);
  const defaultOpen = ordered[0]?.path;

  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultOpen}
      className="rounded-xl border border-border/70 bg-card"
    >
      {ordered.map((file) => (
        <AccordionItem key={file.id} value={file.path} className="px-4 last:border-b-0">
          <AccordionTrigger className="gap-3 hover:no-underline">
            <div className="flex min-w-0 items-center gap-2">
              <FileCode2 className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate font-mono text-sm">{fileLabel(file.path)}</span>
              <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                {file.path}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-4">
            {file.note ? (
              <p className={cn("text-xs text-muted-foreground", "rounded-md bg-muted/50 px-2.5 py-1.5")}>
                {file.note}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <CopyButton value={file.content} label="Copy file" size="sm" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  triggerDownload(singleFileExportUrl(artifactId, file.path), fileLabel(file.path))
                }
              >
                <Download className="size-3.5" />
                Download
              </Button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border/60 bg-background/60 p-3">
              <Markdown>
                {isMarkdownPath(file.path)
                  ? file.content
                  : languageFence(file.path, file.content)}
              </Markdown>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
