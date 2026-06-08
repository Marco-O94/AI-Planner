"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { ArrowLeft, Boxes } from "lucide-react";

import { PageHeader, EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FadeIn } from "@/components/motion";
import { ApiError } from "@/lib/api";
import type { DomainRead, ProjectRead } from "@/lib/types";

import { NotesTab } from "@/components/project/tabs/notes-tab";
import { TasksTab } from "@/components/project/tabs/tasks-tab";
import {
  UbiquitousLanguageEditor,
  languageToEntries,
} from "@/components/project/ubiquitous-language-editor";

export default function DomainPage() {
  const { slug, domainSlug } = useParams<{ slug: string; domainSlug: string }>();

  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useSWR<ProjectRead>(slug ? `/projects/${slug}` : null);

  const {
    data: domains,
    isLoading: domainsLoading,
    error: domainsError,
  } = useSWR<DomainRead[]>(slug ? `/projects/${slug}/domains` : null);

  const error = projectError ?? domainsError;
  const loading = projectLoading || domainsLoading;
  const domain = domains?.find((item) => item.slug === domainSlug) ?? null;

  if (error) {
    return (
      <DomainError
        slug={slug}
        message={error instanceof ApiError ? error.message : undefined}
      />
    );
  }

  if (loading || !project) {
    return <DomainPageSkeleton />;
  }

  if (!domain) {
    return <DomainError slug={slug} message="This domain could not be found." />;
  }

  const terms = languageToEntries(domain.ubiquitous_language);

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link href={`/projects/${slug}`}>
            <ArrowLeft className="size-4" />
            {project.name}
          </Link>
        </Button>
        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-2">
              <Boxes className="size-6 text-primary" />
              {domain.name}
            </span>
          }
          description={domain.description ?? undefined}
        />
      </div>

      {terms.length ? (
        <FadeIn>
          <Card className="gap-0">
            <CardHeader>
              <CardTitle className="text-base">Ubiquitous language</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <UbiquitousLanguageEditor
                entries={terms}
                onChange={() => undefined}
                readOnly
              />
            </CardContent>
          </Card>
        </FadeIn>
      ) : null}

      <FadeIn>
        <Tabs defaultValue="notes" className="gap-4">
          <TabsList className="w-fit">
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
          </TabsList>
          <TabsContent value="notes" className="mt-0">
            <NotesTab project={project} domains={domains ?? []} domainId={domain.id} />
          </TabsContent>
          <TabsContent value="tasks" className="mt-0">
            <TasksTab project={project} domains={domains ?? []} domainId={domain.id} />
          </TabsContent>
        </Tabs>
      </FadeIn>
    </div>
  );
}

function DomainError({ slug, message }: { slug: string; message?: string }) {
  return (
    <EmptyState
      icon={Boxes}
      title="Domain not found"
      description={message ?? "This bounded context could not be loaded."}
      action={
        <Button asChild variant="outline">
          <Link href={`/projects/${slug}`}>
            <ArrowLeft className="size-4" />
            Back to project
          </Link>
        </Button>
      }
    />
  );
}

function DomainPageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-64" />
      </div>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
