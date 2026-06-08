"use client";

import { SWRConfig } from "swr";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LocaleProvider } from "@/i18n/locale-context";
import { swrFetcher } from "@/lib/api";

/**
 * Global client providers: locale (i18n), SWR (with the typed fetcher + sane
 * revalidation), the sonner toaster, and the tooltip provider.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
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
  );
}
