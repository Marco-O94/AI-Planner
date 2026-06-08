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
import { useT } from "@/i18n/locale-context";
import { TECHNOLOGY_KINDS } from "@/lib/types";
import type { TechnologyInput, TechnologyKind } from "@/lib/types";
import type { GroupedTechnologies } from "./use-technologies";

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
  const t = useT();
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
            {t("dashboard.techPicker.add")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command>
            <CommandInput
              placeholder={t("dashboard.techPicker.searchPlaceholder")}
            />
            <CommandList>
              <CommandEmpty>{t("dashboard.techPicker.empty")}</CommandEmpty>
              {TECHNOLOGY_KINDS.map((kind) => {
                const items = grouped[kind];
                if (!items.length) return null;
                return (
                  <CommandGroup
                    key={kind}
                    heading={t(`dashboard.techPicker.kinds.${kind}`)}
                  >
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
                aria-label={t("dashboard.techPicker.remove", { name: item.name })}
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
