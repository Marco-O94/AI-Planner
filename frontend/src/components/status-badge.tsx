"use client";

import { Badge } from "@/components/ui/badge";
import { useT } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";
import type {
  ArtifactStatus,
  NoteType,
  PhaseStatus,
  ProjectStatus,
  ScopeKind,
  TaskPriority,
  TaskStatus,
  TechnologyKind,
} from "@/lib/types";

type Tone = "neutral" | "violet" | "blue" | "green" | "amber" | "red" | "slate";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-secondary text-secondary-foreground border-transparent",
  violet: "bg-primary/10 text-primary border-primary/20",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  red: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  slate: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
};

function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <Badge variant="outline" className={cn("font-medium", TONE_CLASSES[tone])}>
      {children}
    </Badge>
  );
}

const TASK_STATUS_TONE: Record<TaskStatus, Tone> = {
  TODO: "slate",
  IN_PROGRESS: "blue",
  DONE: "green",
};
const TASK_PRIORITY_TONE: Record<TaskPriority, Tone> = {
  LOW: "slate",
  MEDIUM: "amber",
  HIGH: "red",
};
const PROJECT_STATUS_TONE: Record<ProjectStatus, Tone> = {
  ACTIVE: "green",
  PAUSED: "amber",
  ARCHIVED: "slate",
};
const ARTIFACT_STATUS_TONE: Record<ArtifactStatus, Tone> = {
  DRAFT: "amber",
  APPROVED: "green",
  ARCHIVED: "slate",
};
const PHASE_STATUS_TONE: Record<PhaseStatus, Tone> = {
  PENDING: "slate",
  IN_PROGRESS: "blue",
  DONE: "green",
};
const NOTE_TYPE_TONE: Record<NoteType, Tone> = {
  REQUIREMENT: "violet",
  CONSTRAINT: "red",
  DECISION: "green",
  QUESTION: "amber",
  SNIPPET: "blue",
  REFERENCE: "slate",
};
const TECH_KIND_TONE: Record<TechnologyKind, Tone> = {
  LANGUAGE: "violet",
  FRAMEWORK: "blue",
  DATABASE: "green",
  TOOL: "slate",
};

export const TaskStatusBadge = ({ status }: { status: TaskStatus }) => {
  const t = useT();
  return <Pill tone={TASK_STATUS_TONE[status]}>{t(`enums.taskStatus.${status}`)}</Pill>;
};
export const TaskPriorityBadge = ({ priority }: { priority: TaskPriority }) => {
  const t = useT();
  return <Pill tone={TASK_PRIORITY_TONE[priority]}>{t(`enums.taskPriority.${priority}`)}</Pill>;
};
export const ProjectStatusBadge = ({ status }: { status: ProjectStatus }) => {
  const t = useT();
  return <Pill tone={PROJECT_STATUS_TONE[status]}>{t(`enums.projectStatus.${status}`)}</Pill>;
};
export const ArtifactStatusBadge = ({ status }: { status: ArtifactStatus }) => {
  const t = useT();
  return <Pill tone={ARTIFACT_STATUS_TONE[status]}>{t(`enums.artifactStatus.${status}`)}</Pill>;
};
export const PhaseStatusBadge = ({ status }: { status: PhaseStatus }) => {
  const t = useT();
  return <Pill tone={PHASE_STATUS_TONE[status]}>{t(`enums.phaseStatus.${status}`)}</Pill>;
};
export const NoteTypeBadge = ({ type }: { type: NoteType }) => {
  const t = useT();
  return <Pill tone={NOTE_TYPE_TONE[type]}>{t(`enums.noteType.${type}`)}</Pill>;
};
export const TechKindBadge = ({
  kind,
  children,
}: {
  kind: TechnologyKind;
  children?: React.ReactNode;
}) => {
  const t = useT();
  return <Pill tone={TECH_KIND_TONE[kind]}>{children ?? t(`enums.techKind.${kind}`)}</Pill>;
};
export const ScopeBadge = ({ scope }: { scope: ScopeKind }) => {
  const t = useT();
  return (
    <Pill tone={scope === "GLOBAL" ? "violet" : "slate"}>{t(`enums.scope.${scope}`)}</Pill>
  );
};
