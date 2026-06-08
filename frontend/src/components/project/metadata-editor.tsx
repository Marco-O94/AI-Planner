"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useT } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";

export interface MetadataEntry {
  key: string;
  value: string;
}

/** Convert the project's free-form metadata record into editable string rows. */
export function metadataToEntries(
  metadata: Record<string, unknown> | null | undefined,
): MetadataEntry[] {
  return Object.entries(metadata ?? {}).map(([key, value]) => ({
    key,
    value: typeof value === "string" ? value : JSON.stringify(value),
  }));
}

/** Convert editable rows back into a record, dropping blank keys. */
export function entriesToMetadata(entries: MetadataEntry[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const entry of entries) {
    const key = entry.key.trim();
    if (!key) continue;
    result[key] = entry.value;
  }
  return result;
}

interface MetadataEditorProps {
  entries: MetadataEntry[];
  onChange: (entries: MetadataEntry[]) => void;
}

/** Editable key/value table for a project's free-form metadata. */
export function MetadataEditor({ entries, onChange }: MetadataEditorProps) {
  const t = useT();
  const [draftKey, setDraftKey] = useState("");
  const [draftValue, setDraftValue] = useState("");

  function updateRow(index: number, patch: Partial<MetadataEntry>) {
    onChange(entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  }

  function removeRow(index: number) {
    onChange(entries.filter((_, i) => i !== index));
  }

  function addRow() {
    const key = draftKey.trim();
    if (!key) return;
    onChange([...entries, { key, value: draftValue }]);
    setDraftKey("");
    setDraftValue("");
  }

  return (
    <div className="space-y-2">
      {entries.length ? (
        <div className="space-y-1.5">
          {entries.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={entry.key}
                onChange={(event) => updateRow(index, { key: event.target.value })}
                placeholder={t("project.metadata.keyPlaceholder")}
                className="h-8 w-40 font-mono text-xs"
                aria-label={t("project.metadata.keyAria", { index: index + 1 })}
              />
              <Input
                value={entry.value}
                onChange={(event) => updateRow(index, { value: event.target.value })}
                placeholder={t("project.metadata.valuePlaceholder")}
                className="h-8 flex-1 text-xs"
                aria-label={t("project.metadata.valueAria", { index: index + 1 })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeRow(index)}
                aria-label={t("project.metadata.removeAria", {
                  label: entry.key || t("project.metadata.rowFallback"),
                })}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("project.metadata.empty")}</p>
      )}

      <div className={cn("flex items-center gap-2 pt-1")}>
        <Input
          value={draftKey}
          onChange={(event) => setDraftKey(event.target.value)}
          placeholder={t("project.metadata.newKeyPlaceholder")}
          className="h-8 w-40 font-mono text-xs"
          aria-label={t("project.metadata.newKeyAria")}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addRow();
            }
          }}
        />
        <Input
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          placeholder={t("project.metadata.newValuePlaceholder")}
          className="h-8 flex-1 text-xs"
          aria-label={t("project.metadata.newValueAria")}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addRow();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={addRow}
          disabled={!draftKey.trim()}
          aria-label={t("project.metadata.addAria")}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      <Label className="sr-only">{t("project.metadata.srLabel")}</Label>
    </div>
  );
}
