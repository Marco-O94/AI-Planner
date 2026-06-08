"use client";

import { CheckCircle2, FileWarning, MinusCircle, PlusCircle } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { useT } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";
import { fileLabel } from "./lib";
import type { ManifestCoverageRead } from "@/lib/types";

interface ManifestCoverageProps {
  coverage: ManifestCoverageRead;
}

interface CoverageRowProps {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  label: string;
  paths: string[];
}

function CoverageRow({ icon: Icon, tone, label, paths }: CoverageRowProps) {
  const t = useT();
  if (!paths.length) return null;
  return (
    <div className="space-y-1.5">
      <div className={cn("flex items-center gap-1.5 text-xs font-medium", tone)}>
        <Icon className="size-3.5" />
        <span>
          {t("artifacts.coverage.countLabel", { label, count: paths.length })}
        </span>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {paths.map((path) => (
          <li
            key={path}
            title={path}
            className="rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 font-mono text-[0.7rem] text-muted-foreground"
          >
            {fileLabel(path)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Manifest-coverage indicator: present / missing / extra against the declared file set. */
export function ManifestCoverage({ coverage }: ManifestCoverageProps) {
  const t = useT();
  const declared = coverage.present.length + coverage.missing.length;
  const percent = declared ? Math.round((coverage.present.length / declared) * 100) : 100;

  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h4 className="text-sm font-medium">{t("artifacts.coverage.title")}</h4>
          <p className="text-xs text-muted-foreground">
            {coverage.is_complete
              ? t("artifacts.coverage.complete")
              : t("artifacts.coverage.partial", {
                  present: coverage.present.length,
                  declared,
                })}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
            coverage.is_complete
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
          )}
        >
          {coverage.is_complete ? (
            <CheckCircle2 className="size-3.5" />
          ) : (
            <FileWarning className="size-3.5" />
          )}
          {coverage.is_complete
            ? t("artifacts.coverage.completeBadge")
            : t("artifacts.coverage.incompleteBadge")}
        </span>
      </div>

      <Progress value={percent} className="h-1.5" />

      <div className="grid gap-3 sm:grid-cols-3">
        <CoverageRow
          icon={CheckCircle2}
          tone="text-emerald-600 dark:text-emerald-400"
          label="Present"
          paths={coverage.present}
        />
        <CoverageRow
          icon={MinusCircle}
          tone="text-amber-600 dark:text-amber-400"
          label="Missing"
          paths={coverage.missing}
        />
        <CoverageRow
          icon={PlusCircle}
          tone="text-blue-600 dark:text-blue-400"
          label="Extra"
          paths={coverage.extra}
        />
      </div>
    </div>
  );
}
