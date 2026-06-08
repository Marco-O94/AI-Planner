"use client";

/**
 * Picker dialog to attach / detach GLOBAL skills to a project. Lists every
 * global skill (api.listGlobalSkills) with a searchable command list; rows
 * already attached show a checkmark and toggle to detach. Each toggle calls
 * api.attachSkill / api.detachSkill then revalidates via onMutated.
 */

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Check, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common";
import { TagList } from "@/components/common";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { SkillRead } from "@/lib/types";

interface AttachSkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectSlug: string;
  /** Ids of global skills already attached to this project. */
  attachedIds: Set<string>;
  /** Called after any attach/detach so callers can revalidate the tab list. */
  onMutated: () => void;
}

export function AttachSkillDialog({
  open,
  onOpenChange,
  projectSlug,
  attachedIds,
  onMutated,
}: AttachSkillDialogProps) {
  const { data, isLoading, error } = useSWR<SkillRead[]>(
    open ? "/skills" : null,
    () => api.listGlobalSkills(),
  );
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const list = data ?? [];
    const needle = query.trim().toLowerCase();
    if (!needle) return list;
    return list.filter(
      (skill) =>
        skill.name.toLowerCase().includes(needle) ||
        skill.description.toLowerCase().includes(needle) ||
        skill.tags.some((tag) => tag.toLowerCase().includes(needle)),
    );
  }, [data, query]);

  async function toggle(skill: SkillRead) {
    const attached = attachedIds.has(skill.id);
    setPendingId(skill.id);
    try {
      if (attached) {
        await api.detachSkill(projectSlug, skill.id);
        toast.success(`Detached “${skill.name}”`);
      } else {
        await api.attachSkill(projectSlug, skill.id);
        toast.success(`Attached “${skill.name}”`);
      }
      onMutated();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update skill");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Attach global skills</DialogTitle>
          <DialogDescription>
            Toggle which global skills apply to this project.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b border-border px-6 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search global skills…"
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-3 py-3">
          {isLoading ? (
            <div className="space-y-2 px-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <EmptyState
              title="Couldn’t load skills"
              description={error instanceof ApiError ? error.message : "Try again."}
              className="border-0 py-10"
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title={query ? "No matches" : "No global skills yet"}
              description={
                query
                  ? "Try a different search."
                  : "Create a global skill in the library first."
              }
              className="border-0 py-10"
            />
          ) : (
            <ul className="space-y-1">
              {filtered.map((skill) => {
                const attached = attachedIds.has(skill.id);
                const pending = pendingId === skill.id;
                return (
                  <li key={skill.id}>
                    <button
                      type="button"
                      onClick={() => toggle(skill)}
                      disabled={pending}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors",
                        "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        "disabled:opacity-60",
                        attached && "bg-primary/5",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
                          attached
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input",
                        )}
                      >
                        {pending ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : attached ? (
                          <Check className="size-3.5" />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1 space-y-1">
                        <span className="block truncate text-sm font-medium">
                          {skill.name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {skill.description}
                        </span>
                        <TagList tags={skill.tags} className="pt-0.5" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
