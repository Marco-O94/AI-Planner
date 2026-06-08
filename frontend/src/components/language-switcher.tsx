"use client";

import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n";
import { useLocale, useT } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";

/** Compact EN/IT segmented toggle for the app header. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  const t = useT();

  return (
    <div
      role="group"
      aria-label={t("nav.language")}
      className={cn(
        "inline-flex items-center rounded-md border border-border/80 bg-background p-0.5",
        className,
      )}
    >
      {LOCALES.map((code: Locale) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            aria-pressed={active}
            onClick={() => setLocale(code)}
            className={cn(
              "rounded px-2 py-0.5 text-xs font-medium transition-colors",
              active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {LOCALE_LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}
