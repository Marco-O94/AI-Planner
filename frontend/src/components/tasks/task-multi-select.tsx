"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { useT } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";
import type { TaskRead } from "@/lib/types";

interface TaskMultiSelectProps {
  /** Tasks the user can pick from (already excludes the task being edited). */
  options: TaskRead[];
  /** Currently-selected dependency task ids. */
  value: string[];
  onChange: (value: string[]) => void;
}

/** Searchable multi-select for choosing task dependencies. */
export function TaskMultiSelect({ options, value, onChange }: TaskMultiSelectProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const selected = options.filter((task) => value.includes(task.id));

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
            disabled={options.length === 0}
          >
            <span className="truncate text-muted-foreground">
              {options.length === 0
                ? t("tasks.deps.noOptions")
                : value.length > 0
                  ? t(
                      value.length === 1
                        ? "tasks.deps.countOne"
                        : "tasks.deps.count",
                      { count: value.length },
                    )
                  : t("tasks.deps.select")}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command>
            <CommandInput placeholder={t("tasks.deps.searchPlaceholder")} />
            <CommandList>
              <CommandEmpty>{t("tasks.deps.noResults")}</CommandEmpty>
              <CommandGroup>
                {options.map((task) => {
                  const isSelected = value.includes(task.id);
                  return (
                    <CommandItem
                      key={task.id}
                      value={`${task.title} ${task.id}`}
                      onSelect={() => toggle(task.id)}
                    >
                      <Check
                        className={cn(
                          "size-4 shrink-0 transition-opacity",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="truncate">{task.title}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((task) => (
            <Badge key={task.id} variant="secondary" className="gap-1 font-normal">
              <span className="max-w-[12rem] truncate">{task.title}</span>
              <button
                type="button"
                aria-label={t("tasks.deps.removeDependency", { title: task.title })}
                onClick={() => toggle(task.id)}
                className="rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
