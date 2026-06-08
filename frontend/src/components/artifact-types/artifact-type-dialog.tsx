"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import type {
  ArtifactTypeCreate,
  ArtifactTypeRead,
  ArtifactTypeUpdate,
  OutputFile,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ManifestEditor } from "@/components/artifact-types/manifest-editor";

interface ArtifactTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this type; otherwise it creates a new one. */
  type?: ArtifactTypeRead | null;
  onSaved: () => void;
}

interface FormState {
  name: string;
  description: string;
  instructions: string;
  outputFiles: OutputFile[];
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  instructions: "",
  outputFiles: [],
};

function toForm(type: ArtifactTypeRead | null | undefined): FormState {
  if (!type) return EMPTY_FORM;
  return {
    name: type.name,
    description: type.description ?? "",
    instructions: type.instructions,
    outputFiles: type.output_files.map((f) => ({ path: f.path, note: f.note ?? "" })),
  };
}

/** Strip empty manifest rows before sending to the API. */
function cleanFiles(files: OutputFile[]): OutputFile[] {
  return files
    .map((f) => ({ path: f.path.trim(), note: (f.note ?? "").trim() || null }))
    .filter((f) => f.path.length > 0);
}

export function ArtifactTypeDialog({
  open,
  onOpenChange,
  type,
  onSaved,
}: ArtifactTypeDialogProps) {
  const [form, setForm] = useState<FormState>(() => toForm(type));
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(type);

  // Reset the form whenever the dialog opens for a different target.
  useEffect(() => {
    if (open) setForm(toForm(type));
  }, [open, type]);

  const canSave = form.name.trim().length > 0 && form.instructions.trim().length > 0;

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const files = cleanFiles(form.outputFiles);
      if (isEdit && type) {
        const body: ArtifactTypeUpdate = {
          name: form.name.trim(),
          description: form.description.trim() || null,
          instructions: form.instructions.trim(),
          output_files: files,
        };
        await api.updateArtifactType(type.id, body);
        toast.success("Artifact type updated");
      } else {
        const body: ArtifactTypeCreate = {
          scope: "GLOBAL",
          name: form.name.trim(),
          description: form.description.trim() || null,
          instructions: form.instructions.trim(),
          output_files: files,
        };
        await api.createArtifactType(body);
        toast.success("Artifact type created");
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not save artifact type");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit artifact type" : "New artifact type"}</DialogTitle>
          <DialogDescription>
            Define how the agent generates this artifact and which files it should produce.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="at-name">Name</Label>
            <Input
              id="at-name"
              value={form.name}
              placeholder="API Specification"
              autoFocus
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="at-description">Description</Label>
            <Input
              id="at-description"
              value={form.description}
              placeholder="A short summary of this artifact type"
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="at-instructions">Generation instructions (markdown)</Label>
            <Textarea
              id="at-instructions"
              value={form.instructions}
              placeholder={"Describe how the agent should build this artifact…\n\n- Use…\n- Include…"}
              rows={8}
              className="font-mono text-sm"
              onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
            />
          </div>

          <ManifestEditor
            value={form.outputFiles}
            onChange={(outputFiles) => setForm((f) => ({ ...f, outputFiles }))}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave || saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create type"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
