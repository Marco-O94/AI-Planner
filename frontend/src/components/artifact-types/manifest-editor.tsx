"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/i18n/locale-context";
import type { OutputFile } from "@/lib/types";

interface ManifestEditorProps {
  value: OutputFile[];
  onChange: (next: OutputFile[]) => void;
  disabled?: boolean;
}

/**
 * Editor for an artifact type's declared file manifest: a list of
 * {path, note} rows the user can add, edit and remove. Immutable updates only.
 */
export function ManifestEditor({ value, onChange, disabled }: ManifestEditorProps) {
  const t = useT();

  function updateRow(index: number, patch: Partial<OutputFile>): void {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number): void {
    onChange(value.filter((_, i) => i !== index));
  }

  function addRow(): void {
    onChange([...value, { path: "", note: "" }]);
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("artifactTypes.manifest.label")}</Label>
        <span className="text-xs text-muted-foreground">
          {t("artifactTypes.manifest.hint")}
        </span>
      </div>

      {value.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/80 px-3 py-4 text-center text-sm text-muted-foreground">
          {t("artifactTypes.manifest.emptyState")}
        </p>
      ) : (
        <div className="space-y-2">
          {value.map((row, index) => (
            <div
              key={index}
              className="grid grid-cols-1 gap-2 rounded-lg border border-border/70 bg-card/50 p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto]"
            >
              <Input
                value={row.path}
                disabled={disabled}
                placeholder="docs/plan.md"
                aria-label={`File path ${index + 1}`}
                onChange={(e) => updateRow(index, { path: e.target.value })}
                className="font-mono text-xs"
              />
              <Input
                value={row.note ?? ""}
                disabled={disabled}
                placeholder="What this file is for"
                aria-label={`File note ${index + 1}`}
                onChange={(e) => updateRow(index, { note: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                aria-label={`Remove file ${index + 1}`}
                onClick={() => removeRow(index)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {!disabled ? (
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="size-4" />
          Add file
        </Button>
      ) : null}
    </div>
  );
}
