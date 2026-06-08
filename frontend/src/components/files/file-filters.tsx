"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Tag, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";
import type { ProjectRead, SearchKind } from "@/lib/types";

import {
  ALL_KINDS,
  ALL_PROJECTS,
  FILE_KIND_OPTIONS,
} from "./types";

interface FileFiltersProps {
  projects: ProjectRead[];
  projectSlug: string;
  onProjectChange: (slug: string) => void;
  kind: SearchKind | typeof ALL_KINDS;
  onKindChange: (kind: SearchKind | typeof ALL_KINDS) => void;
  tag: string;
  onTagChange: (tag: string) => void;
  availableTags: string[];
}

/** Project scope + kind + tag filters for the explorer. */
export function FileFilters({
  projects,
  projectSlug,
  onProjectChange,
  kind,
  onKindChange,
  tag,
  onTagChange,
  availableTags,
}: FileFiltersProps) {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={projectSlug} onValueChange={onProjectChange}>
        <SelectTrigger className="w-[180px]" aria-label={t("files.filters.projectAriaLabel")}>
          <SelectValue placeholder={t("files.filters.allProjects")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_PROJECTS}>{t("files.filters.allProjects")}</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.slug} value={project.slug}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={kind}
        onValueChange={(value) => onKindChange(value as SearchKind | typeof ALL_KINDS)}
      >
        <SelectTrigger className="w-[150px]" aria-label={t("files.filters.kindAriaLabel")}>
          <SelectValue placeholder={t("files.filters.anyKind")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_KINDS}>{t("files.filters.anyKind")}</SelectItem>
          {FILE_KIND_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {t(option.labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <TagFilter
        tag={tag}
        onTagChange={onTagChange}
        availableTags={availableTags}
      />
    </div>
  );
}

interface TagFilterProps {
  tag: string;
  onTagChange: (tag: string) => void;
  availableTags: string[];
}

function TagFilter({ tag, onTagChange, availableTags }: TagFilterProps) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-8 justify-between gap-2", tag ? "w-[150px]" : "w-[130px]")}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <Tag className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{tag ? `#${tag}` : t("files.filters.anyTag")}</span>
          </span>
          {tag ? (
            <X
              className="size-3.5 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={(event) => {
                event.stopPropagation();
                onTagChange("");
              }}
            />
          ) : (
            <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t("files.filters.filterTagPlaceholder")} />
          <CommandList>
            <CommandEmpty>{t("files.filters.noTagsFound")}</CommandEmpty>
            <CommandGroup>
              {availableTags.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={(value) => {
                    onTagChange(value === tag ? "" : value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "size-4",
                      tag === option ? "opacity-100" : "opacity-0",
                    )}
                  />
                  #{option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
