"use client";

import { FolderPlus, SearchX } from "lucide-react";

import { AnimatedItem, AnimatedList } from "@/components/motion";
import { EmptyState } from "@/components/common";
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
  if (!projects.length) {
    if (filtered) {
      return (
        <EmptyState
          icon={SearchX}
          title="No matching projects"
          description="No projects match the current filters. Try clearing them or adjusting your search."
          action={
            <button
              type="button"
              onClick={onClearFilters}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Clear filters
            </button>
          }
        />
      );
    }
    return (
      <EmptyState
        icon={FolderPlus}
        title="No projects yet"
        description="Create your first project to start capturing notes, tasks and documents."
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
