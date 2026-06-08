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
import { useT, type TranslateFn } from "@/i18n/locale-context";
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
  const t = useT();
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
      toast.success(t("skills.toasts.detached", { name: skill.name }));
      void mutate();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t("skills.toasts.detachError"),
      );
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.deleteSkill(pendingDelete.id);
      toast.success(t("skills.toasts.deleted", { name: pendingDelete.name }));
      setPendingDelete(null);
      void mutate();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t("skills.toasts.deleteError"),
      );
    } finally {
      setDeleting(false);
    }
  }

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setAttachOpen(true)}>
        <Link2 className="size-4" />
        {t("skills.manager.attachGlobal")}
      </Button>
      <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
        <Upload className="size-4" />
        {t("skills.manager.importMd")}
      </Button>
      <Button size="sm" onClick={() => setCreateOpen(true)}>
        <Plus className="size-4" />
        {t("skills.manager.newSkill")}
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
            {t("skills.manager.heading")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("skills.manager.subtitle")}
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
          title={t("skills.manager.loadError")}
          description={
            error instanceof ApiError ? error.message : t("skills.manager.loadErrorRetry")
          }
          action={
            <Button onClick={() => void mutate()}>{t("common.retry")}</Button>
          }
        />
      ) : skills.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={t("skills.manager.emptyTitle")}
          description={t("skills.manager.emptyDescription")}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={() => setAttachOpen(true)}>
                <Link2 className="size-4" />
                {t("skills.manager.attachGlobal")}
              </Button>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                {t("skills.manager.newSkill")}
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
                        {t("skills.manager.attachedMarker")}
                      </Badge>
                    ) : null
                  }
                  actions={
                    <SkillRowActions
                      skill={skill}
                      t={t}
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
            <AlertDialogTitle>{t("skills.manager.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("skills.manager.deleteConfirm", {
                name: pendingDelete?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
              disabled={deleting}
            >
              {deleting ? t("common.deleting") : t("common.delete")}
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
  t,
  onEdit,
  onDetach,
  onDelete,
}: {
  skill: SkillRead;
  t: TranslateFn;
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
        aria-label={t("skills.manager.editAria")}
      >
        <Pencil className="size-4" />
      </Button>
      {skill.scope === "GLOBAL" ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-destructive"
          onClick={onDetach}
          aria-label={t("skills.manager.detachAria")}
        >
          <Link2 className="size-4" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          aria-label={t("skills.manager.deleteAria")}
        >
          <Trash2 className="size-4" />
        </Button>
      )}
    </>
  );
}
