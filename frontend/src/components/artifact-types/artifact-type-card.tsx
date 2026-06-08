"use client";

import { useState } from "react";
import { FileCode2, Lock, MoreVertical, Pencil, Trash2 } from "lucide-react";

import type { ArtifactTypeRead } from "@/lib/types";
import { useT } from "@/i18n/locale-context";
import { ScopeBadge } from "@/components/status-badge";
import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ArtifactTypeCardProps {
  type: ArtifactTypeRead;
  onEdit: (type: ArtifactTypeRead) => void;
  onDelete: (type: ArtifactTypeRead) => void;
}

export function ArtifactTypeCard({ type, onEdit, onDelete }: ArtifactTypeCardProps) {
  const t = useT();
  const [showInstructions, setShowInstructions] = useState(false);
  const readOnly = type.is_default;
  const fileCount = type.output_files.length;

  return (
    <Card className="group h-full gap-4 transition-colors hover:border-primary/40">
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <FileCode2 className="size-4.5" />
            </span>
            <h3 className="truncate text-base font-semibold tracking-tight">{type.name}</h3>
          </div>

          {readOnly ? (
            <span
              title={t("artifactTypes.card.defaultTitle")}
              className="flex shrink-0 items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground"
            >
              <Lock className="size-3" />
              {t("artifactTypes.card.defaultBadge")}
            </span>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("artifactTypes.card.actionsFor", { name: type.name })}
                  className="shrink-0 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onEdit(type)}>
                  <Pencil className="size-4" />
                  {t("common.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => onDelete(type)}
                >
                  <Trash2 className="size-4" />
                  {t("common.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <ScopeBadge scope={type.scope} />
          <Badge variant="secondary" className="font-normal">
            {fileCount === 1
              ? t("artifactTypes.card.fileCount", { count: fileCount })
              : t("artifactTypes.card.fileCountPlural", { count: fileCount })}
          </Badge>
        </div>

        {type.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{type.description}</p>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-3">
        {fileCount > 0 ? (
          <ul className="space-y-1.5">
            {type.output_files.slice(0, 4).map((file, i) => (
              <li key={`${file.path}-${i}`} className="flex items-baseline gap-2 text-sm">
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                  {file.path}
                </code>
                {file.note ? (
                  <span className="truncate text-xs text-muted-foreground">{file.note}</span>
                ) : null}
              </li>
            ))}
            {fileCount > 4 ? (
              <li className="text-xs text-muted-foreground">
                {t("artifactTypes.card.moreFiles", { count: fileCount - 4 })}
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">{t("artifactTypes.card.noFiles")}</p>
        )}

        {type.instructions ? (
          <div className="space-y-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2 h-7 text-xs text-muted-foreground"
              onClick={() => setShowInstructions((v) => !v)}
            >
              {showInstructions
                ? t("artifactTypes.card.hideInstructions")
                : t("artifactTypes.card.showInstructions")}
            </Button>
            {showInstructions ? (
              <div className="max-h-64 overflow-y-auto rounded-lg border border-border/70 bg-muted/40 p-3 text-sm">
                <Markdown>{type.instructions}</Markdown>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
