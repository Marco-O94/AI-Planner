"use client";

import useSWR from "swr";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/i18n/locale-context";
import type { ArtifactTypeRead } from "@/lib/types";

interface ArtifactTypePickerProps {
  projectSlug: string;
  value: string | null;
  onChange: (slug: string, type: ArtifactTypeRead) => void;
  disabled?: boolean;
}

/**
 * SWR-backed picker over the artifact types available to a project (project +
 * global, including the default "Development Plan"). Emits the selected type's
 * slug and full record.
 */
export function ArtifactTypePicker({
  projectSlug,
  value,
  onChange,
  disabled,
}: ArtifactTypePickerProps) {
  const t = useT();
  const { data, isLoading } = useSWR<ArtifactTypeRead[]>(
    `/projects/${projectSlug}/artifact-types`,
  );

  if (isLoading) return <Skeleton className="h-8 w-full" />;

  const types = data ?? [];

  if (!types.length) {
    return (
      <p className="text-sm text-muted-foreground">{t("project.artifactType.empty")}</p>
    );
  }

  return (
    <Select
      value={value ?? undefined}
      disabled={disabled}
      onValueChange={(slug) => {
        const match = types.find((type) => type.slug === slug);
        if (match) onChange(slug, match);
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={t("project.artifactType.placeholder")} />
      </SelectTrigger>
      <SelectContent>
        {types.map((type) => (
          <SelectItem key={type.id} value={type.slug}>
            {type.name}
            {type.is_default ? t("project.artifactType.defaultSuffix") : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
