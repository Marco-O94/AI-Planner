"use client";

/**
 * Drag-and-drop / file-picker upload for a `.md` skill file with frontmatter.
 * Parses name/description/scope/tags client-side, then shows an animated
 * confirm step where the user can adjust scope. If the resulting skill is
 * GLOBAL and a project context is present, the user may also attach it to the
 * current project in the same flow.
 */

import { useState } from "react";
import { FileText, X } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScopeBadge } from "@/components/status-badge";
import { AnimatePresence, motion } from "@/components/motion";
import { useT } from "@/i18n/locale-context";
import { api, ApiError } from "@/lib/api";
import type { ScopeKind, SkillCreate, SkillRead } from "@/lib/types";

import { nameFromFilename, parseSkillFile, type ParsedSkillFile } from "./frontmatter";
import { parseTags } from "./skill-form-fields";
import { SkillDropzone } from "./skill-dropzone";

const SCOPES: ScopeKind[] = ["GLOBAL", "PROJECT"];

interface SkillUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When present, PROJECT skills are scoped here and GLOBAL can attach here. */
  projectSlug?: string;
  onSaved: (skill: SkillRead) => void;
}

interface Draft extends ParsedSkillFile {
  tagsInput: string;
  attachToProject: boolean;
}

export function SkillUpload({
  open,
  onOpenChange,
  projectSlug,
  onSaved,
}: SkillUploadProps) {
  const t = useT();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setDraft(null);
    setSaving(false);
  }

  function close() {
    reset();
    onOpenChange(false);
  }

  async function ingest(file: File) {
    if (!/\.md$/i.test(file.name)) {
      toast.error(t("skills.toasts.chooseMd"));
      return;
    }
    try {
      const text = await file.text();
      const parsed = parseSkillFile(text, nameFromFilename(file.name));
      setDraft({
        ...parsed,
        tagsInput: parsed.tags.join(" "),
        attachToProject: parsed.scope === "GLOBAL" && Boolean(projectSlug),
      });
    } catch {
      toast.error(t("skills.toasts.readError"));
    }
  }

  function patch(part: Partial<Draft>) {
    setDraft((prev) => (prev ? { ...prev, ...part } : prev));
  }

  async function confirm() {
    if (!draft) return;
    const name = draft.name.trim();
    const description = draft.description.trim();
    if (!name || !description) {
      toast.error(t("skills.toasts.nameDescriptionRequired"));
      return;
    }
    setSaving(true);
    try {
      const body: SkillCreate = {
        scope: draft.scope,
        name,
        description,
        content: draft.body,
        tags: parseTags(draft.tagsInput),
        project_slug: draft.scope === "PROJECT" ? projectSlug ?? null : null,
      };
      const created = await api.createSkill(body);

      if (draft.scope === "GLOBAL" && draft.attachToProject && projectSlug) {
        await api.attachSkill(projectSlug, created.id);
      }
      toast.success(t("skills.toasts.imported", { name: created.name }));
      onSaved(created);
      close();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : t("skills.toasts.importError"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>{t("skills.upload.title")}</DialogTitle>
          <DialogDescription>
            {t("skills.upload.descriptionPrefix")}
            <code className="text-xs">.md</code>
            {t("skills.upload.descriptionSuffix")}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5">
          <AnimatePresence mode="wait" initial={false}>
            {!draft ? (
              <motion.div
                key="dropzone"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
              >
                <SkillDropzone onFile={(file) => void ingest(file)} />
              </motion.div>
            ) : (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
                className="grid gap-4"
              >
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="truncate font-medium">
                    {draft.name || t("skills.upload.untitled")}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="ml-auto size-7"
                    onClick={reset}
                    aria-label={t("skills.upload.changeFileAria")}
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="upload-name" className="text-xs text-muted-foreground">
                    {t("skills.upload.nameLabel")}
                  </Label>
                  <Input
                    id="upload-name"
                    value={draft.name}
                    onChange={(event) => patch({ name: event.target.value })}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label
                    htmlFor="upload-description"
                    className="text-xs text-muted-foreground"
                  >
                    {t("skills.upload.descriptionLabel")}
                  </Label>
                  <Input
                    id="upload-description"
                    value={draft.description}
                    onChange={(event) => patch({ description: event.target.value })}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label
                      htmlFor="upload-scope"
                      className="text-xs text-muted-foreground"
                    >
                      {t("skills.upload.scopeLabel")}
                    </Label>
                    <Select
                      value={draft.scope}
                      onValueChange={(scope) =>
                        patch({
                          scope: scope as ScopeKind,
                          attachToProject:
                            scope === "GLOBAL" ? Boolean(projectSlug) : false,
                        })
                      }
                    >
                      <SelectTrigger id="upload-scope" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCOPES.map((scope) => (
                          <SelectItem key={scope} value={scope}>
                            <ScopeBadge scope={scope} />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1.5">
                    <Label
                      htmlFor="upload-tags"
                      className="text-xs text-muted-foreground"
                    >
                      {t("skills.upload.tagsLabel")}
                    </Label>
                    <Input
                      id="upload-tags"
                      value={draft.tagsInput}
                      placeholder={t("skills.upload.tagsPlaceholder")}
                      onChange={(event) => patch({ tagsInput: event.target.value })}
                    />
                  </div>
                </div>

                {projectSlug && draft.scope === "GLOBAL" ? (
                  <label className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm">
                    <Checkbox
                      checked={draft.attachToProject}
                      onCheckedChange={(checked) =>
                        patch({ attachToProject: checked === true })
                      }
                    />
                    {t("skills.upload.attachAfterImport")}
                  </label>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button variant="ghost" onClick={close} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button onClick={confirm} disabled={!draft || saving}>
            {saving ? t("skills.upload.importing") : t("skills.upload.importSkill")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
