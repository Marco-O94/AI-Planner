"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * App-wide theme provider. Wraps next-themes with the class strategy so the
 * `.dark` variant (and our night-indigo token set) toggles on <html>. Defaults
 * to the system preference and avoids transition flashes on theme switch.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
