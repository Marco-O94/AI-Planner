"use client";

/**
 * Presentational card for a single skill. Renders scope badge, name, one-line
 * description, tags and a collapsible markdown body view. Actions (edit, delete,
 * attach/detach, export) are passed in as a slot so the card stays reusable
 * across the project tab and the global library.
 */

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { ScopeBadge } from "@/components/status-badge";
import { TagList } from "@/components/common";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SkillRead } from "@/lib/types";

interface SkillCardProps {
  skill: SkillRead;
  actions?: React.ReactNode;
  /** Optional badge/marker shown next to the scope (e.g. "Attached"). */
  marker?: React.ReactNode;
  className?: string;
}

export function SkillCard({ skill, actions, marker, className }: SkillCardProps) {
  const [open, setOpen] = useState(false);
  const hasBody = skill.content.trim().length > 0;

  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden transition-colors hover:border-primary/40",
        className,
      )}
    >
      <CardHeader className="gap-3 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <ScopeBadge scope={skill.scope} />
              {marker}
              <h3 className="truncate text-base font-semibold tracking-tight">
                {skill.name}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">{skill.description}</p>
          </div>
          {actions ? (
            <div className="flex shrink-0 items-center gap-1">{actions}</div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <TagList tags={skill.tags} />
          <span className="text-xs text-muted-foreground/80">
            Updated {formatDate(skill.updated_at)}
          </span>
        </div>
      </CardHeader>

      {hasBody ? (
        <CardContent className="pt-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen((value) => !value)}
            className="h-7 -ml-2 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
            aria-expanded={open}
          >
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform duration-200",
                open && "rotate-180",
              )}
            />
            {open ? "Hide content" : "View content"}
          </Button>
          {open ? (
            <div className="mt-3 rounded-lg border border-border bg-muted/30 p-4">
              <Markdown>{skill.content}</Markdown>
            </div>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  );
}
