"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Plus, X } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TechKindBadge } from "@/components/status-badge";
import { titleCase } from "@/lib/format";
import { useT } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";
import {
  TECHNOLOGY_KINDS,
  type ProjectTechnologyRead,
  type TechnologyInput,
  type TechnologyKind,
  type TechnologyRead,
} from "@/lib/types";

interface TechPickerProps {
  attached: ProjectTechnologyRead[];
  onAttach: (input: TechnologyInput) => Promise<void>;
  onDetach: (technologyId: string) => Promise<void>;
  busy?: boolean;
}

/**
 * Edits a project's technology stack: shows attached technologies (with their
 * pinned version) and a combobox to attach a known technology or type a new
 * one with an optional version.
 */
export function TechPicker({ attached, onAttach, onDetach, busy }: TechPickerProps) {
  const t = useT();
  const { data: catalog } = useSWR<TechnologyRead[]>("/technologies");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<TechnologyKind>("LANGUAGE");
  const [version, setVersion] = useState("");

  const attachedNames = useMemo(
    () => new Set(attached.map((tech) => tech.name.toLowerCase())),
    [attached],
  );

  const suggestions = useMemo(() => {
    const items = catalog ?? [];
    return items.filter((tech) => !attachedNames.has(tech.name.toLowerCase()));
  }, [catalog, attachedNames]);

  async function attach(name: string, techKind: TechnologyKind) {
    const trimmed = name.trim();
    if (!trimmed) return;
    await onAttach({ kind: techKind, name: trimmed, version: version.trim() || null });
    setSearch("");
    setVersion("");
    setOpen(false);
  }

  const canCreateNew =
    search.trim().length > 0 &&
    !suggestions.some((tech) => tech.name.toLowerCase() === search.trim().toLowerCase());

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {attached.length ? (
          attached.map((tech) => (
            <span
              key={tech.id}
              className="group/tech inline-flex items-center gap-1"
            >
              <TechKindBadge kind={tech.kind}>
                {tech.name}
                {tech.version ? (
                  <span className="ml-1 opacity-70">{tech.version}</span>
                ) : null}
              </TechKindBadge>
              <button
                type="button"
                disabled={busy}
                onClick={() => onDetach(tech.id)}
                aria-label={t("project.tech.removeAria", { name: tech.name })}
                className="grid size-4 place-items-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
              >
                <X className="size-3" />
              </button>
            </span>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">{t("project.tech.empty")}</p>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" disabled={busy}>
            <Plus className="size-3.5" />
            {t("project.tech.addTechnology")}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <div className="grid grid-cols-2 gap-2 border-b border-border p-2.5">
            <div className="space-y-1">
              <Label className="text-xs">{t("project.tech.kind")}</Label>
              <div className="flex flex-wrap gap-1">
                {TECHNOLOGY_KINDS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setKind(option)}
                    className={cn(
                      "rounded-md border px-2 py-0.5 text-xs transition-colors",
                      kind === option
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {titleCase(option)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="tech-version" className="text-xs">
                {t("project.tech.version")}
              </Label>
              <Input
                id="tech-version"
                value={version}
                onChange={(event) => setVersion(event.target.value)}
                placeholder={t("project.tech.versionPlaceholder")}
                className="h-7"
              />
            </div>
          </div>
          <Command shouldFilter>
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder={t("project.tech.searchPlaceholder")}
            />
            <CommandList>
              {!canCreateNew ? (
                <CommandEmpty>{t("project.tech.noMatches")}</CommandEmpty>
              ) : null}
              {canCreateNew ? (
                <CommandGroup heading={t("project.tech.createNew")}>
                  <CommandItem
                    value={`create-${search}`}
                    onSelect={() => attach(search, kind)}
                  >
                    <Plus className="size-3.5" />
                    {t("project.tech.addAs", {
                      name: search.trim(),
                      kind: titleCase(kind),
                    })}
                  </CommandItem>
                </CommandGroup>
              ) : null}
              {suggestions.length ? (
                <CommandGroup heading={t("project.tech.known")}>
                  {suggestions.map((tech) => (
                    <CommandItem
                      key={tech.id}
                      value={tech.name}
                      onSelect={() => attach(tech.name, tech.kind)}
                    >
                      <TechKindBadge kind={tech.kind} />
                      <span>{tech.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
