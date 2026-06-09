import type { TaskRead } from "@/lib/types";

/** Optional context that enriches the rendered task with resolved names. */
interface TaskMarkdownContext {
  projectName?: string;
  domainName?: string | null;
  /** Dependency titles already resolved from ids by the caller. */
  dependencyTitles?: string[];
}

/**
 * Render a single task as a self-contained, agent-friendly Markdown document.
 *
 * Pure and side-effect-free: same inputs always produce the same string. Uses
 * English structural labels and raw enum values (TODO / IN_PROGRESS / DONE,
 * LOW / MEDIUM / HIGH) to stay consistent with the MCP markdown formatter, so
 * the output reads the same whether produced here or by the server.
 */
export function taskToMarkdown(task: TaskRead, ctx: TaskMarkdownContext = {}): string {
  const lines: string[] = [`# ${task.title}`, ""];

  lines.push(`- **Status:** ${task.status}`);
  lines.push(`- **Priority:** ${task.priority}`);

  if (ctx.domainName) {
    lines.push(`- **Domain:** ${ctx.domainName}`);
  }
  if (ctx.projectName) {
    lines.push(`- **Project:** ${ctx.projectName}`);
  }
  if (task.tags.length > 0) {
    lines.push(`- **Tags:** ${task.tags.join(", ")}`);
  }
  if (task.blocked) {
    lines.push("- **Blocked:** yes");
  }
  const dependencyTitles = ctx.dependencyTitles ?? [];
  if (dependencyTitles.length > 0) {
    lines.push(`- **Depends on:** ${dependencyTitles.join(", ")}`);
  }

  lines.push("");
  lines.push("## Description");
  lines.push("");

  const description = task.description?.trim();
  lines.push(description ? description : "_No description._");

  return lines.join("\n") + "\n";
}
