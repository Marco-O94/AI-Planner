"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronsUpDown,
  Languages,
  Monitor,
  Moon,
  Settings,
  Sun,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/i18n";
import { useLocale, useT } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";

/**
 * Bottom-of-sidebar account block (shadcn "user nav" pattern). For now a single
 * local account — no email yet — kept as the future home for real auth. Opening
 * it reveals Settings (placeholder), a theme picker, and the language picker, so
 * those controls no longer clutter the rail.
 */
export function SidebarProfile({
  collapsed,
  menuSide = "right",
}: {
  collapsed: boolean;
  menuSide?: "right" | "top";
}) {
  const t = useT();
  const { locale, setLocale } = useLocale();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const name = t("nav.localUser");
  const isDark = mounted && resolvedTheme === "dark";

  const avatar = (
    <Avatar className="size-8 shrink-0">
      <AvatarFallback className="bg-primary/15 text-primary">
        <User className="size-4" />
      </AvatarFallback>
    </Avatar>
  );

  // Collapsed: a tooltip wraps the dropdown trigger. Both asChild Slots must
  // forward onto the same Button (TooltipTrigger → DropdownMenuTrigger → Button),
  // otherwise the click handler lands on the Tooltip root (no DOM node) and the
  // menu never opens.
  const trigger = collapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={name}
            className="mx-auto size-9 rounded-lg"
          >
            {avatar}
          </Button>
        </DropdownMenuTrigger>
      </TooltipTrigger>
      <TooltipContent side="right">{name}</TooltipContent>
    </Tooltip>
  ) : (
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        aria-label={name}
        className="h-auto w-full justify-start gap-2.5 rounded-lg px-2 py-2 text-left"
      >
        {avatar}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium leading-tight">
            {name}
          </span>
          <span className="block truncate text-xs leading-tight text-muted-foreground">
            {t("nav.localAccount")}
          </span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </Button>
    </DropdownMenuTrigger>
  );

  return (
    <DropdownMenu>
      {trigger}
      <DropdownMenuContent
        side={menuSide}
        align="end"
        sideOffset={8}
        className="w-56"
      >
        <DropdownMenuLabel className="flex items-center gap-2.5 py-2 text-foreground">
          {avatar}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium leading-tight">
              {name}
            </span>
            <span className="block truncate text-xs font-normal leading-tight text-muted-foreground">
              {t("nav.localAccount")}
            </span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings />
            {t("nav.settings")}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            {isDark ? <Moon /> : <Sun />}
            {t("common.theme")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={mounted ? theme : undefined}
              onValueChange={setTheme}
            >
              <DropdownMenuRadioItem value="light">
                <Sun />
                {t("nav.themeLight")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <Moon />
                {t("nav.themeDark")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                <Monitor />
                {t("nav.themeSystem")}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Languages />
            {t("nav.language")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={locale}
              onValueChange={(value) => setLocale(value as Locale)}
            >
              {LOCALES.map((code: Locale) => (
                <DropdownMenuRadioItem key={code} value={code}>
                  {LOCALE_NAMES[code]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
