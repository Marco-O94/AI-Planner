"use client";

/**
 * Controlled markdown editor with an Edit/Preview toggle. Edit mode is a plain
 * monospace <Textarea>; Preview mode renders the shared <Markdown> component so
 * notes, skills, and artifact-type instructions all use one editing surface.
 */

import { useEffect, useRef, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/markdown";
import { useT } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";

type EditorTab = "edit" | "preview";

const DEFAULT_TAB: EditorTab = "edit";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  /** Extra classes applied to the underlying <textarea>. */
  className?: string;
  rows?: number;
  /** Forwarded to the <textarea> so callers (e.g. composer) can focus it. */
  textareaRef?: React.Ref<HTMLTextAreaElement>;
}

export function MarkdownEditor({
  value,
  onChange,
  id,
  placeholder,
  className,
  rows,
  textareaRef,
}: MarkdownEditorProps) {
  const t = useT();
  const [tab, setTab] = useState<EditorTab>(DEFAULT_TAB);

  // Clearing the value (e.g. the composer resetting after save) returns to the
  // edit tab so the next capture lands on the editable, focusable field rather
  // than a stale Preview selection.
  const wasEmptyRef = useRef(value.length === 0);
  useEffect(() => {
    const isEmpty = value.length === 0;
    if (isEmpty && !wasEmptyRef.current) setTab(DEFAULT_TAB);
    wasEmptyRef.current = isEmpty;
  }, [value]);

  return (
    <Tabs value={tab} onValueChange={(next) => setTab(next as EditorTab)} className="gap-2">
      <TabsList className="self-start">
        <TabsTrigger value="edit">{t("markdownEditor.edit")}</TabsTrigger>
        <TabsTrigger value="preview">{t("markdownEditor.preview")}</TabsTrigger>
      </TabsList>

      {/*
        forceMount keeps the labelled <Textarea> in the DOM while Preview is
        active. Without it Radix unmounts the inactive tab, which would break
        the caller's <Label htmlFor={id}> association and any focus via
        textareaRef. We hide the inactive panel with CSS instead.
      */}
      <TabsContent value="edit" forceMount className="data-[state=inactive]:hidden">
        <Textarea
          id={id}
          ref={textareaRef}
          value={value}
          rows={rows}
          placeholder={placeholder}
          className={cn("font-mono text-[0.8125rem] leading-relaxed", className)}
          onChange={(event) => onChange(event.target.value)}
        />
      </TabsContent>

      <TabsContent value="preview">
        {value.trim() ? (
          <Markdown className={cn("rounded-lg border border-input px-3 py-2", className)}>
            {value}
          </Markdown>
        ) : (
          <p className="rounded-lg border border-input px-3 py-2 text-sm text-muted-foreground">
            {t("markdownEditor.emptyPreview")}
          </p>
        )}
      </TabsContent>
    </Tabs>
  );
}
