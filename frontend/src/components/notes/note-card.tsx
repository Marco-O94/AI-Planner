"use client";

/**
 * A single note row: type badge, optional title, collapsed markdown preview
 * (expand/collapse for long content), tag list, and an actions menu. Clicking
 * the body opens the shared item→artifact preview.
 */

import { useState } from "react";
import { ChevronDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NoteTypeBadge } from "@/components/status-badge";
import { TagList } from "@/components/common";
import { Markdown } from "@/components/markdown";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DomainRead, NoteRead } from "@/lib/types";
import { useT } from "@/i18n/locale-context";

/** Content longer than this (chars) gets a collapse/expand affordance. */
const PREVIEW_THRESHOLD = 280;

interface NoteCardProps {
  note: NoteRead;
  domain?: DomainRead;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function NoteCard({ note, domain, onOpen, onEdit, onDelete }: NoteCardProps) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const isLong = note.content.length > PREVIEW_THRESHOLD;
  const isOptimistic = note.id.startsWith("optimistic-");

  return (
    <Card
      className={cn(
        "group/note gap-2 px-4 transition-colors hover:ring-primary/25",
        isOptimistic && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onOpen}
          disabled={isOptimistic}
          className="flex flex-1 flex-wrap items-center gap-2 text-left outline-none"
        >
          <NoteTypeBadge type={note.type} />
          {note.title ? (
            <span className="text-sm font-medium underline-offset-4 group-hover/note:text-primary group-hover/note:underline">
              {note.title}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">{t("notes.card.untitled")}</span>
          )}
        </button>

        <div className="flex items-center gap-2">
          {domain ? (
            <span className="hidden rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground sm:inline">
              {domain.name}
            </span>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={isOptimistic}
                className="opacity-100 transition-opacity sm:opacity-0 sm:group-hover/note:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                aria-label={t("notes.card.actionsAria")}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil className="size-4" />
                {t("common.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <Trash2 className="size-4" />
                {t("common.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div
        className={cn(
          "relative overflow-hidden",
          isLong && !expanded && "max-h-28",
        )}
      >
        <Markdown>{note.content}</Markdown>
        {isLong && !expanded ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent" />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <TagList tags={note.tags} />
        <div className="ml-auto flex items-center gap-3">
          {isLong ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {expanded ? t("notes.card.showLess") : t("notes.card.showMore")}
              <ChevronDown
                className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
              />
            </button>
          ) : null}
          <time className="text-xs text-muted-foreground">{formatDate(note.updated_at)}</time>
        </div>
      </div>
    </Card>
  );
}
