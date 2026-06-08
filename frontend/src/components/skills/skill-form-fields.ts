import type { ScopeKind, SkillRead } from "@/lib/types";

/** Controlled form values for composing/editing a skill. */
export interface SkillFormValues {
  scope: ScopeKind;
  name: string;
  description: string;
  content: string;
  tagsInput: string;
}

export const EMPTY_SKILL_FORM: SkillFormValues = {
  scope: "PROJECT",
  name: "",
  description: "",
  content: "",
  tagsInput: "",
};

/** Split a free-form tags string ("a, b  c") into a deduped, trimmed list. */
export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  for (const raw of input.split(/[\s,]+/)) {
    const tag = raw.trim().replace(/^#/, "");
    if (tag) seen.add(tag);
  }
  return [...seen];
}

/** Seed form values from an existing skill (for the edit flow). */
export function formFromSkill(skill: SkillRead): SkillFormValues {
  return {
    scope: skill.scope,
    name: skill.name,
    description: skill.description,
    content: skill.content,
    tagsInput: skill.tags.join(" "),
  };
}
