import type { ScopeKind } from "@/lib/types";

/**
 * Parsed result of a `.md` skill file with optional YAML-ish frontmatter.
 * Only the fields we care about are extracted; everything else stays in `body`.
 */
export interface ParsedSkillFile {
  name: string;
  description: string;
  scope: ScopeKind;
  tags: string[];
  body: string;
}

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/;

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseTags(raw: string): string[] {
  const value = raw.trim();
  if (!value) return [];
  // Support inline arrays: [a, b, c]
  const inner = value.startsWith("[") && value.endsWith("]") ? value.slice(1, -1) : value;
  return inner
    .split(",")
    .map((tag) => stripQuotes(tag).replace(/^#/, "").trim())
    .filter(Boolean);
}

function coerceScope(raw: string | undefined): ScopeKind {
  return String(raw ?? "").trim().toUpperCase() === "GLOBAL" ? "GLOBAL" : "PROJECT";
}

/**
 * Parse a skill markdown file. Reads simple `key: value` frontmatter between
 * the leading `---` fences. Falls back to sensible defaults when fields are
 * absent (e.g. uses the filename for `name`). Never throws on malformed input.
 */
export function parseSkillFile(content: string, fallbackName = ""): ParsedSkillFile {
  const match = content.match(FRONTMATTER_RE);
  const defaults: ParsedSkillFile = {
    name: fallbackName,
    description: "",
    scope: "PROJECT",
    tags: [],
    body: content,
  };

  if (!match) return defaults;

  const [, frontmatter, body] = match;
  const fields: Record<string, string> = {};
  for (const line of frontmatter.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1);
    if (key) fields[key] = value;
  }

  return {
    name: stripQuotes(fields.name ?? "") || fallbackName,
    description: stripQuotes(fields.description ?? ""),
    scope: coerceScope(fields.scope),
    tags: parseTags(fields.tags ?? ""),
    body: body.trim(),
  };
}

/** Best-effort skill name derived from a filename (drops extension + slugs). */
export function nameFromFilename(filename: string): string {
  return filename
    .replace(/\.md$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
