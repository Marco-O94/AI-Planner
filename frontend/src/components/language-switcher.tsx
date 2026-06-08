"use client";

import { Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALES, LOCALE_LABELS, LOCALE_NAMES, type Locale } from "@/i18n";
import { useLocale, useT } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";

/** Icon button that opens a popup to pick the UI language. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  const t = useT();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("nav.language")}
          title={t("nav.language")}
          className={cn("relative text-muted-foreground hover:text-foreground", className)}
        >
          <Languages className="size-4" />
          <span className="absolute -bottom-0.5 -right-0.5 rounded bg-secondary px-1 text-[9px] font-semibold leading-tight text-foreground">
            {LOCALE_LABELS[locale]}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>{t("nav.language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
