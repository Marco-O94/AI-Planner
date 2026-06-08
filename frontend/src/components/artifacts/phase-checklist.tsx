"use client";

import { useState } from "react";
import { ListChecks } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/common";
import { PhaseStatusBadge } from "@/components/status-badge";
import { AnimatedItem, AnimatedList } from "@/components/motion";
import { useT } from "@/i18n/locale-context";
import { api, ApiError } from "@/lib/api";
import { titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { PhaseRead, PhaseStatus } from "@/lib/types";

const PHASE_STATUSES: PhaseStatus[] = ["PENDING", "IN_PROGRESS", "DONE"];

interface PhaseChecklistProps {
  artifactId: string;
  phases: PhaseRead[];
  onChanged: () => void;
}

interface PhaseRowProps {
  artifactId: string;
  phase: PhaseRead;
  onChanged: () => void;
}

function PhaseRow({ artifactId, phase, onChanged }: PhaseRowProps) {
  const [pending, setPending] = useState(false);

  async function changeStatus(status: PhaseStatus) {
    if (status === phase.status) return;
    setPending(true);
    try {
      await api.updatePhase(artifactId, phase.id, { status });
      toast.success(`Phase marked ${titleCase(status)}`);
      onChanged();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not update phase");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-card px-3 py-2.5 transition-colors",
        phase.status === "DONE" && "bg-emerald-500/[0.04]",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border/70 text-xs font-medium text-muted-foreground">
          {phase.order_index + 1}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{phase.title}</p>
          {phase.note ? (
            <p className="truncate text-xs text-muted-foreground">{phase.note}</p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <PhaseStatusBadge status={phase.status} />
        <Select
          value={phase.status}
          onValueChange={(value) => changeStatus(value as PhaseStatus)}
          disabled={pending}
        >
          <SelectTrigger className="h-8 w-[140px]" aria-label={`Set status for ${phase.title}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PHASE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {titleCase(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/** Execution checklist for plan-like artifacts: each phase status is flippable. */
export function PhaseChecklist({ artifactId, phases, onChanged }: PhaseChecklistProps) {
  if (!phases.length) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No execution phases"
        description="This artifact does not declare an execution checklist."
      />
    );
  }

  const ordered = [...phases].sort((a, b) => a.order_index - b.order_index);
  const done = ordered.filter((phase) => phase.status === "DONE").length;
  const percent = Math.round((done / ordered.length) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-medium">Execution checklist</h4>
        <span className="text-xs text-muted-foreground">
          {done} / {ordered.length} done
        </span>
      </div>
      <Progress value={percent} className="h-1.5" />
      <AnimatedList className="space-y-2">
        {ordered.map((phase) => (
          <AnimatedItem key={phase.id} layout>
            <PhaseRow artifactId={artifactId} phase={phase} onChanged={onChanged} />
          </AnimatedItem>
        ))}
      </AnimatedList>
    </div>
  );
}
