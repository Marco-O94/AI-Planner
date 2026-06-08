"use client";

import { SWRConfig } from "swr";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LocaleProvider } from "@/i18n/locale-context";
import { swrFetcher } from "@/lib/api";

/**
 * Global client providers: theme (next-themes, outermost so the `.dark` class
 * is set before anything paints), locale (i18n), SWR (with the typed fetcher +
 * sane revalidation), the sonner toaster, and the tooltip provider.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <SWRConfig
          value={{
            fetcher: swrFetcher,
            revalidateOnFocus: false,
            shouldRetryOnError: false,
            dedupingInterval: 2000,
          }}
        >
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          <Toaster richColors closeButton position="bottom-right" />
        </SWRConfig>
      </LocaleProvider>
    </ThemeProvider>
  );
}
