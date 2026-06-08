"use client";

/**
 * Shared, controlled form fields for composing/editing a note. Reused by the
 * quick-note composer and the edit dialog so the capture surface and the edit
 * surface stay in lock-step.
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NoteTypeBadge } from "@/components/status-badge";
import { NOTE_TYPES, type DomainRead, type NoteType } from "@/lib/types";
import { titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-context";

/** Sentinel value for "project-level" (no domain) — Radix Select forbids "". */
export const NO_DOMAIN = "__project__";

export interface NoteFormValues {
  type: NoteType;
  title: string;
  content: string;
  tagsInput: string;
  domainId: string;
}

export const EMPTY_NOTE_FORM: NoteFormValues = {
  type: "REQUIREMENT",
  title: "",
  content: "",
  tagsInput: "",
  domainId: NO_DOMAIN,
};

/** Split a free-form tags string ("a, b  c") into a deduped, trimmed list. */
export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  for (const raw of input.split(/[\s,]+/)) {
    const tag = raw.trim().replace(/^#/, "");
    if (tag) seen.add(tag);
  }
  return [...seen];
}

interface NoteFormFieldsProps {
  values: NoteFormValues;
  onChange: (patch: Partial<NoteFormValues>) => void;
  domains: DomainRead[];
  /** Hide the domain picker (e.g. when scoped to a fixed domain). */
  lockDomain?: boolean;
  idPrefix: string;
  textareaRef?: React.Ref<HTMLTextAreaElement>;
  className?: string;
}

export function NoteFormFields({
  values,
  onChange,
  domains,
  lockDomain = false,
  idPrefix,
  textareaRef,
  className,
}: NoteFormFieldsProps) {
  const t = useT();
  return (
    <div className={cn("grid gap-3", className)}>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-type`} className="text-xs text-muted-foreground">
            {t("notes.fields.typeLabel")}
          </Label>
          <Select
            value={values.type}
            onValueChange={(type) => onChange({ type: type as NoteType })}
          >
            <SelectTrigger id={`${idPrefix}-type`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NOTE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  <span className="flex items-center gap-2">
                    <NoteTypeBadge type={type} />
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-title`} className="text-xs text-muted-foreground">
            {t("notes.fields.titleLabel")}{" "}
            <span className="font-normal opacity-70">({t("common.optional")})</span>
          </Label>
          <Input
            id={`${idPrefix}-title`}
            value={values.title}
            placeholder={t("notes.fields.titlePlaceholder")}
            onChange={(event) => onChange({ title: event.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-content`} className="text-xs text-muted-foreground">
          {t("notes.fields.contentLabel")}{" "}
          <span className="font-normal opacity-70">{t("notes.fields.contentMarkdown")}</span>
        </Label>
        <Textarea
          id={`${idPrefix}-content`}
          ref={textareaRef}
          value={values.content}
          placeholder={t("notes.fields.contentPlaceholder")}
          className="min-h-28 font-mono text-[0.8125rem] leading-relaxed"
          onChange={(event) => onChange({ content: event.target.value })}
        />
      </div>

      <div
        className={cn(
          "grid gap-3",
          !lockDomain && "sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]",
        )}
      >
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-tags`} className="text-xs text-muted-foreground">
            {t("notes.fields.tagsLabel")}{" "}
            <span className="font-normal opacity-70">{t("notes.fields.tagsHint")}</span>
          </Label>
          <Input
            id={`${idPrefix}-tags`}
            value={values.tagsInput}
            placeholder={t("notes.fields.tagsPlaceholder")}
            onChange={(event) => onChange({ tagsInput: event.target.value })}
          />
        </div>

        {!lockDomain ? (
          <div className="grid gap-1.5">
            <Label
              htmlFor={`${idPrefix}-domain`}
              className="text-xs text-muted-foreground"
            >
              {t("notes.fields.domainLabel")}
            </Label>
            <Select
              value={values.domainId}
              onValueChange={(domainId) => onChange({ domainId })}
            >
              <SelectTrigger id={`${idPrefix}-domain`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_DOMAIN}>{t("notes.fields.projectLevel")}</SelectItem>
                {domains.map((domain) => (
                  <SelectItem key={domain.id} value={domain.id}>
                    {domain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Human label for a note type, used in toasts and headings. */
export function noteTypeLabel(type: NoteType): string {
  return titleCase(type);
}
