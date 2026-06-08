"use client";

/**
 * Global skill library page. Lists, creates, edits, deletes and exports GLOBAL
 * skills. Project-scoped skills are managed from each project's Skills tab.
 */

import { PageHeader } from "@/components/common";
import { FadeIn } from "@/components/motion";
import { GlobalSkillsLibrary } from "@/components/skills/global-skills-library";

export default function SkillsPage() {
  return (
    <FadeIn className="space-y-8">
      <PageHeader
        title="Skill library"
        description="Reusable global skills you can attach to any project to guide artifact generation."
      />
      <GlobalSkillsLibrary />
    </FadeIn>
  );
}
