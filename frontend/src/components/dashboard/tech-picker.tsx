"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TechKindBadge } from "@/components/status-badge";
import { TECHNOLOGY_KINDS } from "@/lib/types";
import type { TechnologyInput, TechnologyKind } from "@/lib/types";
import { TECH_KIND_LABEL, type GroupedTechnologies } from "./use-technologies";

interface TechPickerProps {
  /** Currently selected technologies (controlled). */
  value: TechnologyInput[];
  onChange: (value: TechnologyInput[]) => void;
  grouped: GroupedTechnologies;
  disabled?: boolean;
}

function isSelected(value: TechnologyInput[], kind: TechnologyKind, name: string): boolean {
  return value.some((item) => item.kind === kind && item.name === name);
}

/** Searchable, grouped multi-select that maps the tech catalogue to TechnologyInput[]. */
export function TechPicker({ value, onChange, grouped, disabled }: TechPickerProps) {
  const [open, setOpen] = useState(false);

  function toggle(kind: TechnologyKind, name: string) {
    if (isSelected(value, kind, name)) {
      onChange(value.filter((item) => !(item.kind === kind && item.name === name)));
    } else {
      onChange([...value, { kind, name }]);
    }
  }

  function remove(kind: TechnologyKind, name: string) {
    onChange(value.filter((item) => !(item.kind === kind && item.name === name)));
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="w-full justify-start text-muted-foreground"
          >
            <Plus className="size-4" />
            Add technologies
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command>
            <CommandInput placeholder="Search technologies…" />
            <CommandList>
              <CommandEmpty>No technology found.</CommandEmpty>
              {TECHNOLOGY_KINDS.map((kind) => {
                const items = grouped[kind];
                if (!items.length) return null;
                return (
                  <CommandGroup key={kind} heading={TECH_KIND_LABEL[kind]}>
                    {items.map((tech) => (
                      <CommandItem
                        key={tech.id}
                        value={`${kind} ${tech.name}`}
                        onSelect={() => toggle(kind, tech.name)}
                        data-checked={isSelected(value, kind, tech.name)}
                      >
                        {tech.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item) => (
            <TechKindBadge key={`${item.kind}-${item.name}`} kind={item.kind}>
              {item.name}
              <button
                type="button"
                onClick={() => remove(item.kind, item.name)}
                aria-label={`Remove ${item.name}`}
                className="ml-0.5 -mr-0.5 rounded-full outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
              >
                <X className="size-3" />
              </button>
            </TechKindBadge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
