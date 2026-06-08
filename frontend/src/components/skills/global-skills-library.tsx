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
import { useT } from "@/i18n/locale-context";
import { api, ApiError } from "@/lib/api";
import { useDebounce } from "@/hooks/use-debounce";
import type { SkillRead } from "@/lib/types";

import { SkillCard } from "./skill-card";
import { SkillDialog } from "./skill-dialog";
import { SkillUpload } from "./skill-upload";

export function GlobalSkillsLibrary() {
  const t = useT();
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

  const total = data?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={rawQuery}
            onChange={(event) => setRawQuery(event.target.value)}
            placeholder={t("skills.library.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="size-4" />
            {t("skills.library.importMd")}
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            {t("skills.library.newSkill")}
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
          title={t("skills.library.loadError")}
          description={
            error instanceof ApiError ? error.message : t("skills.library.loadErrorRetry")
          }
          action={
            <Button onClick={() => void mutate()}>{t("common.retry")}</Button>
          }
        />
      ) : total === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={t("skills.library.emptyTitle")}
          description={t("skills.library.emptyDescription")}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={() => setUploadOpen(true)}>
                <Upload className="size-4" />
                {t("skills.library.importMd")}
              </Button>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                {t("skills.library.newSkill")}
              </Button>
            </div>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t("skills.library.noMatchesTitle")}
          description={t("skills.library.noMatchesDescription")}
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
                        aria-label={t("skills.library.exportAria")}
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
                        aria-label={t("skills.library.editAria")}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setPendingDelete(skill)}
                        aria-label={t("skills.library.deleteAria")}
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
            <AlertDialogTitle>{t("skills.library.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("skills.library.deleteConfirm", {
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
