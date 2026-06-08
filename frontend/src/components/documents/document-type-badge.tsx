"use client";

import { CheckCircle2, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useT } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";

import { documentKindLabel } from "./lib";

interface DocumentTypeBadgeProps {
  mimeType: string;
  filename: string;
  className?: string;
}

/** Compact badge naming the document's kind (PDF / DOCX / Markdown / Text). */
export function DocumentTypeBadge({
  mimeType,
  filename,
  className,
}: DocumentTypeBadgeProps) {
  return (
    <Badge variant="outline" className={cn("font-medium", className)}>
      {documentKindLabel(mimeType, filename)}
    </Badge>
  );
}

interface IndexedBadgeProps {
  indexedAt: string | null;
  className?: string;
}

/**
 * "Indexed" once the document has been vectorized for search, otherwise a muted
 * "Pending" badge so users know it is not yet searchable.
 */
export function IndexedBadge({ indexedAt, className }: IndexedBadgeProps) {
  const t = useT();

  if (indexedAt) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className={cn(
              "gap-1 text-primary [&>svg]:text-primary",
              className,
            )}
          >
            <CheckCircle2 />
            {t("documents.badge.indexed")}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{t("documents.badge.indexedTooltip")}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn("gap-1 text-muted-foreground", className)}
        >
          <Clock />
          {t("documents.badge.pending")}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{t("documents.badge.pendingTooltip")}</TooltipContent>
    </Tooltip>
  );
}
