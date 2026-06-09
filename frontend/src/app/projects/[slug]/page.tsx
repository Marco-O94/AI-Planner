"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import {
  ArrowLeft,
  BookmarkPlus,
  FileText,
  Layers,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Settings,
  Sparkles,
  StickyNote,
  Trash2,
} from "lucide-react";

import { PageHeader, EmptyState } from "@/components/common";
import { useT } from "@/i18n/locale-context";
import { ProjectStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FadeIn } from "@/components/motion";
import { ApiError } from "@/lib/api";
import type { DomainRead, ProjectRead } from "@/lib/types";

import {
  ProjectMetaRail,
  EditProjectSheet,
} from "@/components/project/overview-panel";
import { DomainsButton } from "@/components/project/domains-panel";
import { ProjectSearchButton } from "@/components/project/project-search";
import { GenerateDialog } from "@/components/project/generate-dialog";
import { SaveAsTemplateDialog } from "@/components/project/save-as-template-dialog";
import { DeleteProjectDialog } from "@/components/project/delete-project-dialog";
import { NotesTab } from "@/components/project/tabs/notes-tab";
import { TasksTab } from "@/components/project/tabs/tasks-tab";
import { ArtifactsTab } from "@/components/project/tabs/artifacts-tab";
import { DocumentsTab } from "@/components/project/tabs/documents-tab";
import { SkillsTab } from "@/components/project/tabs/skills-tab";

const TABS = [
  { value: "notes", icon: StickyNote, Component: NotesTab },
  { value: "tasks", icon: ListChecks, Component: TasksTab },
  { value: "artifacts", icon: Layers, Component: ArtifactsTab },
  { value: "documents", icon: FileText, Component: DocumentsTab },
  { value: "skills", icon: Sparkles, Component: SkillsTab },
] as const;

const DEFAULT_TAB = "notes";

export default function ProjectPage() {
  const t = useT();
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
        title={t("project.page.notFoundTitle")}
        description={
          error instanceof ApiError
            ? error.message
            : t("project.page.notFoundDescription")
        }
        action={
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="size-4" />
              {t("project.page.backToProjectsAction")}
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
    <div className="space-y-6">
      <div className="space-y-4 border-b border-border/70 pb-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link href="/">
            <ArrowLeft className="size-4" />
            {t("project.page.backToProjects")}
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
            <div className="flex flex-wrap items-center gap-2">
              <DomainsButton
                project={project}
                domains={domains}
                isLoading={domainsLoading}
              />
              <ProjectSearchButton projectSlug={project.slug} />
              <Button asChild variant="outline" size="sm">
                <Link href={`/projects/${project.slug}/settings`}>
                  <Settings className="size-4" />
                  <span className="hidden sm:inline">{t("settings.entry")}</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="size-3.5" />
                <span className="hidden sm:inline">{t("project.page.editAction")}</span>
              </Button>
              <Button size="sm" onClick={() => setGenerateOpen(true)}>
                <Sparkles className="size-4" />
                {t("common.generate")}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("project.page.moreActions")}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setTemplateOpen(true)}>
                    <BookmarkPlus className="size-4" />
                    {t("project.page.saveAsTemplate")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="size-4" />
                    {t("project.page.deleteAction")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />

        <ProjectMetaRail project={project} />
      </div>

      <FadeIn>
        <Tabs value={activeTab} onValueChange={onTabChange} className="gap-4">
          <TabsList className="flex w-full justify-start gap-1 overflow-x-auto sm:w-fit sm:overflow-visible">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="shrink-0 gap-1.5 whitespace-nowrap"
                >
                  <Icon className="size-4" />
                  <span>{t(`project.tabs.${tab.value}`)}</span>
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
      <EditProjectSheet project={project} open={editOpen} onOpenChange={setEditOpen} />
      <SaveAsTemplateDialog
        project={project}
        open={templateOpen}
        onOpenChange={setTemplateOpen}
      />
      <DeleteProjectDialog
        project={project}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}

function ProjectPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4 border-b border-border/70 pb-6">
        <Skeleton className="h-6 w-24" />
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-5 w-80" />
      </div>
      <Skeleton className="h-9 w-80" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
