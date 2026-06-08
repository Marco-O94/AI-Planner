"use client";

/**
 * Global skill library page. Lists, creates, edits, deletes and exports GLOBAL
 * skills. Project-scoped skills are managed from each project's Skills tab.
 */

import { PageHeader } from "@/components/common";
import { FadeIn } from "@/components/motion";
import { GlobalSkillsLibrary } from "@/components/skills/global-skills-library";
import { useT } from "@/i18n/locale-context";

export default function SkillsPage() {
  const t = useT();
  return (
    <FadeIn className="space-y-8">
      <PageHeader
        title={t("skills.page.libraryTitle")}
        description={t("skills.page.libraryDescription")}
      />
      <GlobalSkillsLibrary />
    </FadeIn>
  );
}
