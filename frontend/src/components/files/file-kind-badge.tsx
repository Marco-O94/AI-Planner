"use client";

import { FileCode2, FileText, StickyNote } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useT } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";
import type { SearchKind } from "@/lib/types";

import { kindLabelKey } from "./types";

const KIND_STYLES: Record<SearchKind, string> = {
  document: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  artifact_file: "bg-primary/10 text-primary border-primary/20",
  note: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
};

const KIND_ICONS: Record<SearchKind, React.ComponentType<{ className?: string }>> = {
  document: FileText,
  artifact_file: FileCode2,
  note: StickyNote,
};

interface FileKindBadgeProps {
  kind: SearchKind;
  className?: string;
}

/** A pill describing the kind of a saved file (document / artifact file / note). */
export function FileKindBadge({ kind, className }: FileKindBadgeProps) {
  const t = useT();
  const Icon = KIND_ICONS[kind];
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 font-medium", KIND_STYLES[kind], className)}
    >
      <Icon className="size-3" />
      {t(kindLabelKey(kind))}
    </Badge>
  );
}

/** The icon for a kind, used standalone in row leaders. */
export function FileKindIcon({ kind, className }: FileKindBadgeProps) {
  const Icon = KIND_ICONS[kind];
  return <Icon className={className} />;
}
