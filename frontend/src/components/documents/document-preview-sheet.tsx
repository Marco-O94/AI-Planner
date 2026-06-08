"use client";

import useSWR from "swr";
import { Download, FileText } from "lucide-react";

import { CopyButton, EmptyState } from "@/components/common";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/i18n/locale-context";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { DocumentRead } from "@/lib/types";

import { DocumentTypeBadge, IndexedBadge } from "./document-type-badge";
import { fileExtension } from "./lib";

interface DocumentPreviewSheetProps {
  /** The document to preview; when null the sheet is closed. */
  document: DocumentRead | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Slide-over preview of a document's extracted text. Re-fetches the full record
 * (the list payload may omit large text) and renders markdown for `.md` files,
 * monospaced plain text otherwise.
 */
export function DocumentPreviewSheet({
  document,
  onOpenChange,
}: DocumentPreviewSheetProps) {
  const t = useT();
  const open = document !== null;
  const { data, isLoading } = useSWR<DocumentRead>(
    document ? `/documents/${document.id}` : null,
    () => api.getDocument(document!.id),
  );

  // Prefer the freshly-fetched record, fall back to the list row while loading.
  const record = data ?? document;
  const isMarkdown = record
    ? ["md", "markdown"].includes(fileExtension(record.filename))
    : false;
  const text = record?.extracted_text ?? "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 sm:max-w-xl md:max-w-2xl"
      >
        {record ? (
          <>
            <SheetHeader className="pr-12">
              <div className="flex flex-wrap items-center gap-2">
                <DocumentTypeBadge
                  mimeType={record.mime_type}
                  filename={record.filename}
                />
                <IndexedBadge indexedAt={record.indexed_at} />
              </div>
              <SheetTitle className="mt-1 text-pretty">
                {record.title}
              </SheetTitle>
              <SheetDescription className="font-mono text-xs">
                {record.filename}
              </SheetDescription>
            </SheetHeader>

            <div className="flex items-center gap-2 px-4 pb-3">
              <Button variant="outline" size="sm" asChild>
                <a
                  href={api.documentDownloadUrl(record.id)}
                  download={record.filename}
                >
                  <Download className="size-4" />
                  {t("common.download")}
                </a>
              </Button>
              {text ? (
                <CopyButton
                  value={text}
                  label={t("documents.preview.copyText")}
                  size="sm"
                />
              ) : null}
              <span className="ml-auto text-xs text-muted-foreground">
                {formatDateTime(record.created_at)}
              </span>
            </div>

            <Separator />

            <ScrollArea className="min-h-0 flex-1">
              <div className="p-4">
                {isLoading && !data ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : text ? (
                  isMarkdown ? (
                    <Markdown>{text}</Markdown>
                  ) : (
                    <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground/90">
                      {text}
                    </pre>
                  )
                ) : (
                  <EmptyState
                    icon={FileText}
                    title={t("documents.preview.noText.title")}
                    description={t("documents.preview.noText.description")}
                  />
                )}
              </div>
            </ScrollArea>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
