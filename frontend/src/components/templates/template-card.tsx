"use client";

import Link from "next/link";
import { ArrowRight, FolderGit2, MoreVertical, Pencil, Trash2 } from "lucide-react";

import type { TemplateRead } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { useT } from "@/i18n/locale-context";
import type { TranslateFn } from "@/i18n/locale-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TemplateCardProps {
  template: TemplateRead;
  onEdit: (template: TemplateRead) => void;
  onDelete: (template: TemplateRead) => void;
}

/** Count the definition entries so the card hints at how much it carries. */
function definitionSummary(
  definition: Record<string, unknown>,
  t: TranslateFn,
): string | null {
  const keys = Object.keys(definition ?? {});
  if (keys.length === 0) return null;
  return keys.length === 1
    ? t("templates.card.sectionCount", { count: keys.length })
    : t("templates.card.sectionCountPlural", { count: keys.length });
}

export function TemplateCard({ template, onEdit, onDelete }: TemplateCardProps) {
  const t = useT();
  const summary = definitionSummary(template.definition, t);

  return (
    <Card className="group h-full gap-4 transition-colors hover:border-primary/40">
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <FolderGit2 className="size-5" />
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("templates.card.actionsFor", { name: template.name })}
                className="shrink-0 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onEdit(template)}>
                <Pencil className="size-4" />
                {t("common.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => onDelete(template)}>
                <Trash2 className="size-4" />
                {t("common.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h3 className="text-base font-semibold tracking-tight">{template.name}</h3>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {template.description?.trim() || t("templates.card.noDescription")}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {summary ? <span>{summary}</span> : null}
          <span>{t("templates.card.updated", { date: formatDate(template.updated_at) })}</span>
        </div>
      </CardContent>

      <CardFooter>
        {/*
          Integration point: the dashboard create-project flow reads the
          `?template=<slug>` query param to preselect this template.
        */}
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href={`/?template=${encodeURIComponent(template.slug)}`}>
            {t("templates.card.newProject")}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
