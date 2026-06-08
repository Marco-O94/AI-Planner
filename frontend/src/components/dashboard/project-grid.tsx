"use client";

import { FolderPlus, SearchX } from "lucide-react";

import { AnimatedItem, AnimatedList } from "@/components/motion";
import { EmptyState } from "@/components/common";
import { useT } from "@/i18n/locale-context";
import type { ProjectRead } from "@/lib/types";
import { ProjectCard } from "./project-card";

interface ProjectGridProps {
  projects: ProjectRead[];
  /** True when filters are narrowing — changes the empty-state copy. */
  filtered: boolean;
  /** Slot for the "New project" action in the unfiltered empty state. */
  createAction?: React.ReactNode;
  onClearFilters: () => void;
}

const GRID_CLASS = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

export function ProjectGrid({
  projects,
  filtered,
  createAction,
  onClearFilters,
}: ProjectGridProps) {
  const t = useT();
  if (!projects.length) {
    if (filtered) {
      return (
        <EmptyState
          icon={SearchX}
          title={t("dashboard.emptyFiltered.title")}
          description={t("dashboard.emptyFiltered.description")}
          action={
            <button
              type="button"
              onClick={onClearFilters}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("dashboard.filters.clear")}
            </button>
          }
        />
      );
    }
    return (
      <EmptyState
        icon={FolderPlus}
        title={t("dashboard.empty.title")}
        description={t("dashboard.empty.description")}
        action={createAction}
      />
    );
  }

  return (
    <AnimatedList className={GRID_CLASS}>
      {projects.map((project) => (
        <AnimatedItem key={project.id} className="h-full">
          <ProjectCard project={project} />
        </AnimatedItem>
      ))}
    </AnimatedList>
  );
}
