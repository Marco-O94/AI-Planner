"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScopeBadge } from "@/components/status-badge";
import { useT } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";
import type { ArtifactTypeRead, ProjectRead } from "@/lib/types";

import { ArtifactTypePicker } from "./artifact-type-picker";
import { buildMcpInstruction, McpInstructionBlock } from "./mcp-instruction";

type GenerationScope = "complete" | "selected";

interface GenerateDialogProps {
  project: ProjectRead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Generate-from-project flow: pick an artifact type + scope, then surface the
 * exact copyable MCP instruction to run in Claude Code. "Complete" uses all
 * notes + tasks; "selected" is a focused run the user wires up by hand.
 */
export function GenerateDialog({ project, open, onOpenChange }: GenerateDialogProps) {
  const t = useT();
  const [typeSlug, setTypeSlug] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ArtifactTypeRead | null>(null);
  const [scope, setScope] = useState<GenerationScope>("complete");
  const [title, setTitle] = useState("");

  const instruction = typeSlug
    ? buildMcpInstruction({
        projectSlug: project.slug,
        artifactTypeSlug: typeSlug,
        title,
      })
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            {t("project.generate.title")}
          </DialogTitle>
          <DialogDescription>{t("project.generate.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("project.generate.artifactType")}</Label>
            <ArtifactTypePicker
              projectSlug={project.slug}
              value={typeSlug}
              onChange={(slug, type) => {
                setTypeSlug(slug);
                setSelectedType(type);
              }}
            />
            {selectedType?.description ? (
              <p className="text-xs text-muted-foreground">{selectedType.description}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>{t("project.generate.scope")}</Label>
            <div className="grid grid-cols-2 gap-2">
              <ScopeOption
                label={t("project.generate.scopeComplete")}
                hint={t("project.generate.scopeCompleteHint")}
                active={scope === "complete"}
                onSelect={() => setScope("complete")}
              />
              <ScopeOption
                label={t("project.generate.scopeSelected")}
                hint={t("project.generate.scopeSelectedHint")}
                active={scope === "selected"}
                onSelect={() => setScope("selected")}
              />
            </div>
            {scope === "selected" ? (
              <p className="text-xs text-muted-foreground">
                {t("project.generate.selectedHelp")}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="generate-title">{t("project.generate.titleLabel")}</Label>
            <Input
              id="generate-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("project.generate.titlePlaceholder")}
            />
          </div>

          {instruction ? (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("project.generate.mcpInstruction")}</Label>
                  {selectedType ? <ScopeBadge scope={selectedType.scope} /> : null}
                </div>
                <McpInstructionBlock instruction={instruction} />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("project.generate.selectTypePrompt")}
            </p>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("project.generate.done")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ScopeOption({
  label,
  hint,
  active,
  onSelect,
}: {
  label: string;
  hint: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors",
        "hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        active
          ? "border-primary bg-primary/5 text-foreground"
          : "border-border text-muted-foreground",
      )}
    >
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className="text-xs">{hint}</span>
    </button>
  );
}
