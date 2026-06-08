"use client";

import { Download, Eye, FileText, MoreHorizontal, Trash2 } from "lucide-react";

import { TagList } from "@/components/common";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/i18n/locale-context";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { DocumentRead, DomainRead } from "@/lib/types";
import { cn } from "@/lib/utils";

import { DocumentTypeBadge, IndexedBadge } from "./document-type-badge";

interface DocumentRowProps {
  document: DocumentRead;
  domains: DomainRead[];
  /** Whether to show the owning domain (hidden when already scoped to one). */
  showDomain: boolean;
  onPreview: (document: DocumentRead) => void;
  onDelete: (document: DocumentRead) => void;
}

/** A single document entry: type/indexed badges, metadata, tags, and actions. */
export function DocumentRow({
  document,
  domains,
  showDomain,
  onPreview,
  onDelete,
}: DocumentRowProps) {
  const t = useT();
  const domain = document.domain_id
    ? domains.find((item) => item.id === document.domain_id)
    : undefined;

  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-xl border border-border/70 bg-card p-3.5",
        "transition-colors hover:border-border hover:bg-muted/40",
        "focus-within:border-ring/60",
      )}
    >
      <button
        type="button"
        onClick={() => onPreview(document)}
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground",
          "transition-colors group-hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        )}
        aria-label={t("documents.row.previewAria", { title: document.title })}
      >
        <FileText className="size-5" />
      </button>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onPreview(document)}
            className={cn(
              "truncate text-left text-sm font-medium text-foreground",
              "transition-colors hover:text-primary",
              "focus-visible:outline-none focus-visible:underline",
            )}
          >
            {document.title}
          </button>
          <DocumentTypeBadge
            mimeType={document.mime_type}
            filename={document.filename}
          />
          <IndexedBadge indexedAt={document.indexed_at} />
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="truncate font-mono">{document.filename}</span>
          <span aria-hidden>·</span>
          <span>
            {t("documents.row.added", { date: formatDate(document.created_at) })}
          </span>
          {showDomain && domain ? (
            <>
              <span aria-hidden>·</span>
              <span className="text-primary/80">{domain.name}</span>
            </>
          ) : null}
        </div>

        <TagList tags={document.tags} />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground"
            aria-label={t("documents.row.actions")}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={() => onPreview(document)}>
            <Eye className="size-4" />
            {t("documents.row.preview")}
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a
              href={api.documentDownloadUrl(document.id)}
              download={document.filename}
            >
              <Download className="size-4" />
              {t("common.download")}
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => onDelete(document)}
          >
            <Trash2 className="size-4" />
            {t("common.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
