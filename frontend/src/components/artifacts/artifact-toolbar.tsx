"use client";

import { useState } from "react";
import { Download, FileArchive } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, ApiError } from "@/lib/api";
import { useT } from "@/i18n/locale-context";
import { titleCase } from "@/lib/format";
import { ARTIFACT_STATUSES } from "@/lib/types";
import { triggerDownload } from "./lib";
import { toast } from "sonner";
import type { ArtifactRead, ArtifactStatus } from "@/lib/types";

interface ArtifactToolbarProps {
  artifact: ArtifactRead;
  onStatusChanged: () => void;
}

/** Status toggle (DRAFT/APPROVED/ARCHIVED) plus single/zip export controls. */
export function ArtifactToolbar({ artifact, onStatusChanged }: ArtifactToolbarProps) {
  const t = useT();
  const [pending, setPending] = useState(false);

  async function changeStatus(status: ArtifactStatus) {
    if (status === artifact.status) return;
    setPending(true);
    try {
      await api.updateArtifact(artifact.id, { status });
      toast.success(
        t("artifacts.toolbar.statusChanged", { status: titleCase(status) }),
      );
      onStatusChanged();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : t("artifacts.toolbar.statusError"),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={artifact.status}
        onValueChange={(value) => changeStatus(value as ArtifactStatus)}
        disabled={pending}
      >
        <SelectTrigger
          className="h-8 w-[150px]"
          aria-label={t("artifacts.toolbar.statusLabel")}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ARTIFACT_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {titleCase(status)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          triggerDownload(api.artifactExportUrl(artifact.id), `${artifact.slug}.zip`)
        }
      >
        <FileArchive className="size-3.5" />
        {t("artifacts.toolbar.exportZip")}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        asChild
      >
        <a href={api.artifactExportUrl(artifact.id)} target="_blank" rel="noopener noreferrer">
          <Download className="size-3.5" />
          {t("artifacts.toolbar.openExport")}
        </a>
      </Button>
    </div>
  );
}
