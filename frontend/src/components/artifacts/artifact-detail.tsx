"use client";

import useSWR from "swr";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/common";
import { ArtifactStatusBadge } from "@/components/status-badge";
import { FadeIn } from "@/components/motion";
import { useT } from "@/i18n/locale-context";
import { formatDateTime } from "@/lib/format";
import { isPlanLikeType, artifactDetailKey, versionFilesKey } from "./lib";
import { FileSet } from "./file-set";
import { ManifestCoverage } from "./manifest-coverage";
import { VersionSwitcher } from "./version-switcher";
import { PhaseChecklist } from "./phase-checklist";
import { ArtifactToolbar } from "./artifact-toolbar";
import { SourceLinks } from "./source-links";
import type { ArtifactDetailRead, VersionFilesRead } from "@/lib/types";

interface ArtifactDetailProps {
  artifactId: string;
  onBack: () => void;
  /** Revalidate the parent list after status changes. */
  onMutated: () => void;
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-9 w-full max-w-md" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

/** Full artifact detail: file set, coverage, versions+diff, phases, status, export, sources. */
export function ArtifactDetail({ artifactId, onBack, onMutated }: ArtifactDetailProps) {
  const t = useT();
  const detailKey = artifactDetailKey(artifactId);
  const { data, error, isLoading, mutate } = useSWR<ArtifactDetailRead>(detailKey);

  const planLike = isPlanLikeType(data?.artifact_type_slug);
  const currentVersionKey =
    data != null ? versionFilesKey(artifactId, data.current_version_number) : null;
  const { data: currentVersion } = useSWR<VersionFilesRead>(currentVersionKey);

  function refresh() {
    void mutate();
    onMutated();
  }

  if (isLoading) return <DetailSkeleton />;

  if (error || !data) {
    return (
      <EmptyState
        title={t("artifacts.detail.loadErrorTitle")}
        description={t("artifacts.detail.loadErrorDescription")}
        action={
          <Button type="button" variant="outline" size="sm" onClick={onBack}>
            <ChevronLeft className="size-4" /> {t("artifacts.detail.backToList")}
          </Button>
        }
      />
    );
  }

  return (
    <FadeIn className="space-y-5">
      <div className="space-y-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="-ml-2 text-muted-foreground"
        >
          <ChevronLeft className="size-4" /> {t("artifacts.detail.allArtifacts")}
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">{data.artifact.title}</h2>
              <ArtifactStatusBadge status={data.artifact.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("artifacts.detail.meta", {
                type: data.artifact_type_slug,
                version: data.current_version_number,
                updated: formatDateTime(data.artifact.updated_at),
              })}
            </p>
          </div>
          <ArtifactToolbar artifact={data.artifact} onStatusChanged={refresh} />
        </div>
      </div>

      <ManifestCoverage coverage={data.coverage} />

      <Tabs defaultValue="files" className="space-y-4">
        <TabsList>
          <TabsTrigger value="files">{t("artifacts.detail.tabs.files")}</TabsTrigger>
          <TabsTrigger value="versions">
            {t("artifacts.detail.tabs.versions")}
          </TabsTrigger>
          {planLike ? (
            <TabsTrigger value="phases">
              {t("artifacts.detail.tabs.checklist")}
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="sources">
            {t("artifacts.detail.tabs.sources")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files">
          {data.files.length ? (
            <FileSet artifactId={artifactId} files={data.files} />
          ) : (
            <EmptyState
              title={t("artifacts.detail.noFilesTitle")}
              description={t("artifacts.detail.noFilesDescription")}
            />
          )}
        </TabsContent>

        <TabsContent value="versions">
          <VersionSwitcher
            artifactId={artifactId}
            versions={data.versions}
            currentVersionNumber={data.current_version_number}
          />
        </TabsContent>

        {planLike ? (
          <TabsContent value="phases">
            <PhaseChecklist
              artifactId={artifactId}
              phases={data.phases}
              onChanged={refresh}
            />
          </TabsContent>
        ) : null}

        <TabsContent value="sources">
          {currentVersion ? (
            <SourceLinks
              noteIds={currentVersion.source_note_ids}
              taskIds={currentVersion.source_task_ids}
              documentIds={currentVersion.source_document_ids}
            />
          ) : (
            <EmptyState
              title={t("artifacts.detail.noSourcesTitle")}
              description={t("artifacts.detail.noSourcesDescription")}
            />
          )}
        </TabsContent>
      </Tabs>
    </FadeIn>
  );
}
