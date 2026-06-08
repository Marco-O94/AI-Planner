"use client";

import Link from "next/link";
import { ArrowUpRight, FileText, ListChecks, Package } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ProjectStatusBadge, TechKindBadge } from "@/components/status-badge";
import { useT } from "@/i18n/locale-context";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProjectRead, ProjectTechnologyRead, TechnologyKind } from "@/lib/types";

interface ProjectCardProps {
  project: ProjectRead;
}

/** Technology kinds shown on the card, in display order (tools are omitted to keep cards tidy). */
const CARD_TECH_KINDS: TechnologyKind[] = ["LANGUAGE", "FRAMEWORK", "DATABASE"];

const MAX_TECH_BADGES = 6;

function visibleTechnologies(technologies: ProjectTechnologyRead[]): ProjectTechnologyRead[] {
  return CARD_TECH_KINDS.flatMap((kind) =>
    technologies.filter((tech) => tech.kind === kind),
  );
}

interface CountStatProps {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
}

function CountStat({ icon: Icon, value, label }: CountStatProps) {
  return (
    <div className="flex items-center gap-1.5" title={`${value} ${label}`}>
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="font-medium tabular-nums text-foreground">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

export function ProjectCard({ project }: ProjectCardProps) {
  const t = useT();
  const techs = visibleTechnologies(project.technologies);
  const shown = techs.slice(0, MAX_TECH_BADGES);
  const overflow = techs.length - shown.length;

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card
        className={cn(
          "h-full transition-all duration-200",
          "group-hover:-translate-y-0.5 group-hover:ring-primary/30",
          "group-hover:shadow-lg group-hover:shadow-primary/5",
        )}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h3 className="truncate font-heading text-base font-semibold leading-snug">
                {project.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("dashboard.card.updated", {
                  date: formatDate(project.updated_at),
                })}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <ProjectStatusBadge status={project.status} />
              <ArrowUpRight className="size-4 text-muted-foreground/0 transition-colors group-hover:text-primary" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-4">
          <p className="line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
            {project.description?.trim() || t("dashboard.card.noDescription")}
          </p>

          {shown.length ? (
            <div className="flex flex-wrap gap-1.5">
              {shown.map((tech) => (
                <TechKindBadge key={tech.id} kind={tech.kind}>
                  {tech.name}
                  {tech.version ? (
                    <span className="opacity-60">@{tech.version}</span>
                  ) : null}
                </TechKindBadge>
              ))}
              {overflow > 0 ? (
                <span className="self-center text-xs text-muted-foreground">
                  {t("dashboard.card.more", { count: overflow })}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/60 pt-3 text-xs">
            <CountStat
              icon={FileText}
              value={project.note_count}
              label={t("dashboard.card.notes")}
            />
            <CountStat
              icon={ListChecks}
              value={project.task_count}
              label={t("dashboard.card.tasks")}
            />
            <CountStat
              icon={Package}
              value={project.artifact_count}
              label={t("dashboard.card.artifacts")}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
