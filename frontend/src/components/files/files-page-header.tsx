"use client";

import { PageHeader } from "@/components/common";
import { useT } from "@/i18n/locale-context";

/** Localized page header for the File Explorer surface. */
export function FilesPageHeader() {
  const t = useT();
  return (
    <PageHeader
      title={t("files.header.title")}
      description={t("files.header.description")}
    />
  );
}
