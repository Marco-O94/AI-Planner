"use client";

/**
 * Full-page project settings for a single project — currently the note-types
 * manager. Route params come from useParams() (Next.js 16: never await/prop
 * params in a client component).
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common";
import { FadeIn } from "@/components/motion";
import { NoteTypesManager } from "@/components/note-types/note-types-manager";
import { useT } from "@/i18n/locale-context";
import { api } from "@/lib/api";
import type { ProjectRead } from "@/lib/types";

export default function ProjectSettingsPage() {
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
            title={t("settings.noteTypes.title")}
            description={t("settings.noteTypes.description")}
          />
        )}
      </div>

      <NoteTypesManager projectSlug={slug} />
    </FadeIn>
  );
}
