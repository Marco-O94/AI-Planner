"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";

/**
 * Compact light/dark toggle for the sidebar footer (sits next to the language
 * switcher). Cycles between light and dark, resolving the system preference on
 * first click. Guards against the next-themes hydration mismatch by rendering a
 * neutral placeholder until mounted.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useT();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const label = t("common.theme");

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("size-8", className)}
        aria-label={label}
        disabled
      >
        <Sun className="size-4" aria-hidden />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("size-8", className)}
      aria-label={label}
      title={label}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? (
        <Moon className="size-4" aria-hidden />
      ) : (
        <Sun className="size-4" aria-hidden />
      )}
    </Button>
  );
}
