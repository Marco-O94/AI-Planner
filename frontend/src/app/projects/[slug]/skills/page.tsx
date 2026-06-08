"use client";

/**
 * Full-page skills management for a single project — the same surface as the
 * Skills tab, presented as a standalone route. Route params come from
 * useParams() (Next.js 16: never await/prop params in a client component).
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common";
import { FadeIn } from "@/components/motion";
import { ProjectSkillsManager } from "@/components/skills/project-skills-manager";
import { useT } from "@/i18n/locale-context";
import { api } from "@/lib/api";
import type { ProjectRead } from "@/lib/types";

export default function ProjectSkillsPage() {
  const t = useT();
  const { slug } = useParams<{ slug: string }>();
  const { data: project, isLoading } = useSWR<ProjectRead>(
    slug ? `/projects/${slug}` : null,
    () => api.getProject(slug),
  );

  return (
    <FadeIn className="space-y-8">
      <div className="space-y-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground hover:text-foreground"
        >
          <Link href={`/projects/${slug}`}>
            <ArrowLeft className="size-4" />
            {t("skills.page.backToProject")}
          </Link>
        </Button>
        {isLoading && !project ? (
          <Skeleton className="h-9 w-64" />
        ) : (
          <PageHeader
            title={t("skills.page.projectTitle")}
            description={
              project
                ? t("skills.page.projectDescriptionNamed", { name: project.name })
                : t("skills.page.projectDescription")
            }
          />
        )}
      </div>

      <ProjectSkillsManager projectSlug={slug} />
    </FadeIn>
  );
}
