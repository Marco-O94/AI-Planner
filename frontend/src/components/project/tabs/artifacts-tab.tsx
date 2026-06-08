"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { FileStack } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common";
import { useT } from "@/i18n/locale-context";
import { ArtifactList } from "@/components/artifacts/artifact-list";
import { ArtifactDetail } from "@/components/artifacts/artifact-detail";
import { artifactsKey } from "@/components/artifacts/lib";
import type { TabProps } from "@/components/project/types";
import type { ArtifactRead, ArtifactTypeRead } from "@/lib/types";

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}

/** Artifacts surface: grouped list plus an artifact detail with files, coverage,
 * versions/diff, phases, status, export, and source links. */
export function ArtifactsTab({ project, domainId }: TabProps) {
  const t = useT();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const listKey = artifactsKey(project.slug);
  const {
    data: artifacts,
    error,
    isLoading,
    mutate,
  } = useSWR<ArtifactRead[]>(listKey);
  const { data: types } = useSWR<ArtifactTypeRead[]>(
    `/projects/${project.slug}/artifact-types`,
  );

  const scoped = useMemo(() => {
    const all = artifacts ?? [];
    return domainId ? all.filter((artifact) => artifact.domain_id === domainId) : all;
  }, [artifacts, domainId]);

  if (selectedId) {
    return (
      <ArtifactDetail
        artifactId={selectedId}
        onBack={() => setSelectedId(null)}
        onMutated={() => void mutate()}
      />
    );
  }

  if (isLoading) return <ListSkeleton />;

  if (error) {
    return (
      <EmptyState
        icon={FileStack}
        title={t("artifacts.empty.loadErrorTitle")}
        description={t("artifacts.empty.loadErrorDescription")}
      />
    );
  }

  if (!scoped.length) {
    return (
      <EmptyState
        icon={FileStack}
        title={
          domainId
            ? t("artifacts.empty.domainTitle")
            : t("artifacts.empty.noneTitle")
        }
        description={t("artifacts.empty.noneDescription")}
      />
    );
  }

  return (
    <ArtifactList
      artifacts={scoped}
      types={types ?? []}
      selectedId={selectedId}
      onSelect={setSelectedId}
    />
  );
}
