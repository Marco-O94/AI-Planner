"use client";

import useSWR from "swr";

import type { TechnologyKind, TechnologyRead } from "@/lib/types";

/** Technologies grouped by their kind, ready to power the filter selects + tech picker. */
export interface GroupedTechnologies {
  LANGUAGE: TechnologyRead[];
  FRAMEWORK: TechnologyRead[];
  DATABASE: TechnologyRead[];
  TOOL: TechnologyRead[];
}

const EMPTY_GROUPS: GroupedTechnologies = {
  LANGUAGE: [],
  FRAMEWORK: [],
  DATABASE: [],
  TOOL: [],
};

function group(technologies: TechnologyRead[]): GroupedTechnologies {
  return technologies.reduce<GroupedTechnologies>(
    (acc, tech) => ({ ...acc, [tech.kind]: [...acc[tech.kind], tech] }),
    { LANGUAGE: [], FRAMEWORK: [], DATABASE: [], TOOL: [] },
  );
}

export interface UseTechnologiesResult {
  technologies: TechnologyRead[];
  grouped: GroupedTechnologies;
  isLoading: boolean;
  error: unknown;
}

/** Fetches the technology catalogue once (SWR-cached) and groups it by kind. */
export function useTechnologies(): UseTechnologiesResult {
  const { data, isLoading, error } = useSWR<TechnologyRead[]>("/technologies");
  const technologies = data ?? [];

  return {
    technologies,
    grouped: data ? group(data) : EMPTY_GROUPS,
    isLoading,
    error,
  };
}

export const TECH_KIND_LABEL: Record<TechnologyKind, string> = {
  LANGUAGE: "Language",
  FRAMEWORK: "Framework",
  DATABASE: "Database",
  TOOL: "Tool",
};
