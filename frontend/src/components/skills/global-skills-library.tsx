"use client";

/**
 * Global skill library surface (`/skills`). Lists GLOBAL skills only, with
 * create / import / edit / delete and a per-skill export link
 * (api.skillExportUrl). A debounced search filters by name/description/tag.
 */

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Download, Pencil, Plus, Search, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/common";
import { AnimatedList, AnimatedItem, AnimatePresence } from "@/components/motion";
import { api, ApiError } from "@/lib/api";
import { useDebounce } from "@/hooks/use-debounce";
import type { SkillRead } from "@/lib/types";

import { SkillCard } from "./skill-card";
import { SkillDialog } from "./skill-dialog";
import { SkillUpload } from "./skill-upload";

export function GlobalSkillsLibrary() {
  const { data, isLoading, error, mutate } = useSWR<SkillRead[]>("/skills", () =>
    api.listGlobalSkills(),
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<SkillRead | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SkillRead | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [rawQuery, setRawQuery] = useState("");
  const query = useDebounce(rawQuery, 200);

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

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.deleteSkill(pendingDelete.id);
      toast.success(`Deleted “${pendingDelete.name}”`);
      setPendingDelete(null);
      void mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not delete skill");
    } finally {
      setDeleting(false);
    }
  }

  const total = data?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={rawQuery}
            onChange={(event) => setRawQuery(event.target.value)}
            placeholder="Search skills…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="size-4" />
            Import .md
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New skill
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={Sparkles}
          title="Couldn’t load skills"
          description={error instanceof ApiError ? error.message : "Please try again."}
          action={<Button onClick={() => void mutate()}>Retry</Button>}
        />
      ) : total === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No global skills yet"
          description="Create a reusable skill or import one from a Markdown file."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={() => setUploadOpen(true)}>
                <Upload className="size-4" />
                Import .md
              </Button>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                New skill
              </Button>
            </div>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matches"
          description="No skills match your search."
        />
      ) : (
        <AnimatedList className="grid gap-3">
          <AnimatePresence initial={false}>
            {filtered.map((skill) => (
              <AnimatedItem key={skill.id} layout>
                <SkillCard
                  skill={skill}
                  actions={
                    <>
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        aria-label="Export skill"
                      >
                        <a href={api.skillExportUrl(skill.id)} download>
                          <Download className="size-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        onClick={() => setEditing(skill)}
                        aria-label="Edit skill"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setPendingDelete(skill)}
                        aria-label="Delete skill"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </>
                  }
                />
              </AnimatedItem>
            ))}
          </AnimatePresence>
        </AnimatedList>
      )}

      <SkillDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        lockScope="GLOBAL"
        onSaved={() => void mutate()}
      />
      <SkillDialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        skill={editing ?? undefined}
        onSaved={() => void mutate()}
      />
      <SkillUpload
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSaved={() => void mutate()}
      />

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this skill?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.name}” will be permanently removed from the global library.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
