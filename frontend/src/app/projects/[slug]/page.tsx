"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Layers,
  ListChecks,
  Sparkles,
  StickyNote,
} from "lucide-react";

import { PageHeader, EmptyState } from "@/components/common";
import { ProjectStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FadeIn } from "@/components/motion";
import { ApiError } from "@/lib/api";
import type { DomainRead, ProjectRead } from "@/lib/types";

import { OverviewPanel } from "@/components/project/overview-panel";
import { DomainsPanel } from "@/components/project/domains-panel";
import { ProjectSearch } from "@/components/project/project-search";
import { GenerateDialog } from "@/components/project/generate-dialog";
import { NotesTab } from "@/components/project/tabs/notes-tab";
import { TasksTab } from "@/components/project/tabs/tasks-tab";
import { ArtifactsTab } from "@/components/project/tabs/artifacts-tab";
import { DocumentsTab } from "@/components/project/tabs/documents-tab";
import { SkillsTab } from "@/components/project/tabs/skills-tab";

const TABS = [
  { value: "notes", label: "Notes", icon: StickyNote, Component: NotesTab },
  { value: "tasks", label: "Tasks", icon: ListChecks, Component: TasksTab },
  { value: "artifacts", label: "Artifacts", icon: Layers, Component: ArtifactsTab },
  { value: "documents", label: "Documents", icon: FileText, Component: DocumentsTab },
  { value: "skills", label: "Skills", icon: Sparkles, Component: SkillsTab },
] as const;

const DEFAULT_TAB = "notes";

export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [generateOpen, setGenerateOpen] = useState(false);

  const tabParam = searchParams.get("tab");
  const activeTab = TABS.some((tab) => tab.value === tabParam) ? tabParam! : DEFAULT_TAB;

  const {
    data: project,
    isLoading,
    error,
  } = useSWR<ProjectRead>(slug ? `/projects/${slug}` : null);

  const { data: domains, isLoading: domainsLoading } = useSWR<DomainRead[]>(
    slug ? `/projects/${slug}/domains` : null,
  );

  const onTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", value);
      router.replace(`/projects/${slug}?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, slug],
  );

  if (error) {
    return (
      <EmptyState
        icon={Layers}
        title="Project not found"
        description={
          error instanceof ApiError ? error.message : "This project could not be loaded."
        }
        action={
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="size-4" />
              Back to projects
            </Link>
          </Button>
        }
      />
    );
  }

  if (isLoading || !project) {
    return <ProjectPageSkeleton />;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link href="/">
            <ArrowLeft className="size-4" />
            Projects
          </Link>
        </Button>
        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-3">
              {project.name}
              <ProjectStatusBadge status={project.status} />
            </span>
          }
          description={project.description ?? undefined}
          actions={
            <div className="flex items-center gap-2">
              {project.repository_url ? (
                <Button asChild variant="outline" size="sm">
                  <a
                    href={project.repository_url}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <ExternalLink className="size-4" />
                    Repository
                  </a>
                </Button>
              ) : null}
              <Button size="sm" onClick={() => setGenerateOpen(true)}>
                <Sparkles className="size-4" />
                Generate
              </Button>
            </div>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <OverviewPanel project={project} />
        <DomainsPanel project={project} domains={domains} isLoading={domainsLoading} />
      </div>

      <ProjectSearch projectSlug={project.slug} />

      <FadeIn>
        <Tabs value={activeTab} onValueChange={onTabChange} className="gap-4">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 sm:w-fit">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="flex-none gap-1.5">
                  <Icon className="size-4" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
          {TABS.map((tab) => {
            const Component = tab.Component;
            return (
              <TabsContent key={tab.value} value={tab.value} className="mt-0">
                <Component project={project} domains={domains ?? []} />
              </TabsContent>
            );
          })}
        </Tabs>
      </FadeIn>

      <GenerateDialog
        project={project}
        open={generateOpen}
        onOpenChange={setGenerateOpen}
      />
    </div>
  );
}

function ProjectPageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
