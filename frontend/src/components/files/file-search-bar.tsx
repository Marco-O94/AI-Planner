"use client";

import { Loader2, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useT } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";
import type { SearchMode } from "@/lib/types";

import { SEARCH_MODE_OPTIONS } from "./types";

interface FileSearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  isSearching: boolean;
}

/**
 * Prominent in-file content search: a debounced text input plus a segmented mode
 * toggle (exact / by meaning / hybrid). The parent debounces the query value.
 */
export function FileSearchBar({
  query,
  onQueryChange,
  mode,
  onModeChange,
  isSearching,
}: FileSearchBarProps) {
  const t = useT();
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <InputGroup className="h-10 flex-1 rounded-xl text-base shadow-sm">
        <InputGroupAddon>
          {isSearching ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <Search className="size-4 text-muted-foreground" />
          )}
        </InputGroupAddon>
        <InputGroupInput
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t("files.search.placeholder")}
          aria-label={t("files.search.ariaLabel")}
          autoComplete="off"
          spellCheck={false}
        />
        {query ? (
          <InputGroupAddon align="inline-end">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onQueryChange("")}
              aria-label={t("files.search.clearAriaLabel")}
            >
              <X className="size-4" />
            </Button>
          </InputGroupAddon>
        ) : null}
      </InputGroup>

      <div
        role="radiogroup"
        aria-label={t("files.search.modeGroupAriaLabel")}
        className="inline-flex shrink-0 rounded-xl border border-border bg-card p-1 shadow-sm"
      >
        {SEARCH_MODE_OPTIONS.map((option) => {
          const active = option.value === mode;
          return (
            <Tooltip key={option.value}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onModeChange(option.value)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {t(option.labelKey)}
                </button>
              </TooltipTrigger>
              <TooltipContent>{t(option.hintKey)}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
