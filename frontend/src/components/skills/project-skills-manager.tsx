"use client";

/**
 * Shared management surface for a project's applicable skills. Used by both the
 * Skills project tab and the full-page `/projects/[slug]/skills` route so the
 * two stay in lock-step. Lists PROJECT + attached GLOBAL skills with scope
 * badges, supports creating a PROJECT skill inline, importing a `.md` file, and
 * attaching/detaching GLOBAL skills via a picker dialog.
 */

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Link2, Pencil, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common";
import { AnimatedList, AnimatedItem, AnimatePresence } from "@/components/motion";
import { api, ApiError } from "@/lib/api";
import type { SkillRead } from "@/lib/types";

import { SkillCard } from "./skill-card";
import { SkillDialog } from "./skill-dialog";
import { SkillUpload } from "./skill-upload";
import { AttachSkillDialog } from "./attach-skill-dialog";

interface ProjectSkillsManagerProps {
  projectSlug: string;
  /** Compact header (used inside the tab vs. the full page). */
  compact?: boolean;
}

export function ProjectSkillsManager({
  projectSlug,
  compact = false,
}: ProjectSkillsManagerProps) {
  const key = `/projects/${projectSlug}/skills`;
  const { data, isLoading, error, mutate } = useSWR<SkillRead[]>(key, () =>
    api.listProjectSkills(projectSlug),
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [editing, setEditing] = useState<SkillRead | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SkillRead | null>(null);
  const [deleting, setDeleting] = useState(false);

  const skills = data ?? [];
  const attachedGlobalIds = useMemo(
    () => new Set(skills.filter((s) => s.scope === "GLOBAL").map((s) => s.id)),
    [skills],
  );

  async function handleDetach(skill: SkillRead) {
    try {
      await api.detachSkill(projectSlug, skill.id);
      toast.success(`Detached “${skill.name}”`);
      void mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not detach skill");
    }
  }

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

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setAttachOpen(true)}>
        <Link2 className="size-4" />
        Attach global
      </Button>
      <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
        <Upload className="size-4" />
        Import .md
      </Button>
      <Button size="sm" onClick={() => setCreateOpen(true)}>
        <Plus className="size-4" />
        New skill
      </Button>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h2
            className={
              compact ? "text-base font-semibold" : "text-lg font-semibold tracking-tight"
            }
          >
            Applicable skills
          </h2>
          <p className="text-sm text-muted-foreground">
            Project skills plus any attached global skills.
          </p>
        </div>
        {actions}
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
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
      ) : skills.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No skills yet"
          description="Create a project skill or attach a global one to guide generation."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={() => setAttachOpen(true)}>
                <Link2 className="size-4" />
                Attach global
              </Button>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                New skill
              </Button>
            </div>
          }
        />
      ) : (
        <AnimatedList className="grid gap-3">
          <AnimatePresence initial={false}>
            {skills.map((skill) => (
              <AnimatedItem key={skill.id} layout>
                <SkillCard
                  skill={skill}
                  marker={
                    skill.scope === "GLOBAL" ? (
                      <Badge variant="outline" className="font-normal">
                        Attached
                      </Badge>
                    ) : null
                  }
                  actions={
                    <SkillRowActions
                      skill={skill}
                      onEdit={() => setEditing(skill)}
                      onDetach={() => void handleDetach(skill)}
                      onDelete={() => setPendingDelete(skill)}
                    />
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
        lockScope="PROJECT"
        projectSlug={projectSlug}
        onSaved={() => void mutate()}
      />
      <SkillDialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        skill={editing ?? undefined}
        projectSlug={projectSlug}
        onSaved={() => void mutate()}
      />
      <SkillUpload
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        projectSlug={projectSlug}
        onSaved={() => void mutate()}
      />
      <AttachSkillDialog
        open={attachOpen}
        onOpenChange={setAttachOpen}
        projectSlug={projectSlug}
        attachedIds={attachedGlobalIds}
        onMutated={() => void mutate()}
      />

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this skill?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.name}” will be permanently removed. This cannot be undone.
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

/**
 * Per-row actions. GLOBAL skills (attached) can be edited or detached; PROJECT
 * skills can be edited or deleted outright.
 */
function SkillRowActions({
  skill,
  onEdit,
  onDetach,
  onDelete,
}: {
  skill: SkillRead;
  onEdit: () => void;
  onDetach: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-muted-foreground hover:text-foreground"
        onClick={onEdit}
        aria-label="Edit skill"
      >
        <Pencil className="size-4" />
      </Button>
      {skill.scope === "GLOBAL" ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-destructive"
          onClick={onDetach}
          aria-label="Detach skill"
        >
          <Link2 className="size-4" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          aria-label="Delete skill"
        >
          <Trash2 className="size-4" />
        </Button>
      )}
    </>
  );
}
