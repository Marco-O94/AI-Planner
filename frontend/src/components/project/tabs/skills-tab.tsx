"use client";

/**
 * Skills project tab. Renders the shared project-skills manager: applicable
 * skills (PROJECT + attached GLOBAL) with scope badges, inline PROJECT-skill
 * creation, `.md` import, and a global-skill attach/detach picker.
 *
 * Skills apply project-wide (the backend does not scope skills to a domain), so
 * `domainId` is intentionally not used here.
 */

import type { TabProps } from "@/components/project/types";
import { ProjectSkillsManager } from "@/components/skills/project-skills-manager";

export function SkillsTab({ project }: TabProps) {
  return <ProjectSkillsManager projectSlug={project.slug} compact />;
}
