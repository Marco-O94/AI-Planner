"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-context";

export interface TermEntry {
  term: string;
  definition: string;
}

/** Convert a ubiquitous-language record into ordered editable rows. */
export function languageToEntries(
  language: Record<string, string> | null | undefined,
): TermEntry[] {
  if (!language) return [];
  return Object.entries(language).map(([term, definition]) => ({ term, definition }));
}

/** Convert editable rows back into a record, dropping blank terms. */
export function entriesToLanguage(entries: TermEntry[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const entry of entries) {
    const term = entry.term.trim();
    if (!term) continue;
    result[term] = entry.definition;
  }
  return result;
}

interface UbiquitousLanguageEditorProps {
  entries: TermEntry[];
  onChange: (entries: TermEntry[]) => void;
  readOnly?: boolean;
}

/** Editable (or read-only) term/definition table for a domain's vocabulary. */
export function UbiquitousLanguageEditor({
  entries,
  onChange,
  readOnly,
}: UbiquitousLanguageEditorProps) {
  const t = useT();
  const [draftTerm, setDraftTerm] = useState("");
  const [draftDefinition, setDraftDefinition] = useState("");

  function updateRow(index: number, patch: Partial<TermEntry>) {
    onChange(entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  }

  function removeRow(index: number) {
    onChange(entries.filter((_, i) => i !== index));
  }

  function addRow() {
    const term = draftTerm.trim();
    if (!term) return;
    onChange([...entries, { term, definition: draftDefinition }]);
    setDraftTerm("");
    setDraftDefinition("");
  }

  if (readOnly) {
    if (!entries.length) {
      return (
        <p className="text-sm text-muted-foreground">{t("project.language.empty")}</p>
      );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/3">{t("project.language.termHead")}</TableHead>
            <TableHead>{t("project.language.definitionHead")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium whitespace-normal">{entry.term}</TableCell>
              <TableCell className="whitespace-normal text-muted-foreground">
                {entry.definition}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, index) => (
        <div key={index} className="flex items-start gap-2">
          <Input
            value={entry.term}
            onChange={(event) => updateRow(index, { term: event.target.value })}
            placeholder={t("project.language.termPlaceholder")}
            className="h-8 w-40"
            aria-label={t("project.language.termAria", { index: index + 1 })}
          />
          <Input
            value={entry.definition}
            onChange={(event) => updateRow(index, { definition: event.target.value })}
            placeholder={t("project.language.definitionPlaceholder")}
            className="h-8 flex-1"
            aria-label={t("project.language.definitionAria", { index: index + 1 })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => removeRow(index)}
            aria-label={t("project.language.removeAria", {
              label: entry.term || t("project.language.termFallback"),
            })}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ))}
      <div className="flex items-start gap-2 pt-1">
        <Input
          value={draftTerm}
          onChange={(event) => setDraftTerm(event.target.value)}
          placeholder={t("project.language.newTermPlaceholder")}
          className="h-8 w-40"
          aria-label={t("project.language.newTermAria")}
        />
        <Input
          value={draftDefinition}
          onChange={(event) => setDraftDefinition(event.target.value)}
          placeholder={t("project.language.newDefinitionPlaceholder")}
          className="h-8 flex-1"
          aria-label={t("project.language.newDefinitionAria")}
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
          disabled={!draftTerm.trim()}
          aria-label={t("project.language.addAria")}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
