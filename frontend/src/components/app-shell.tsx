"use client";

import { Sidebar } from "@/components/sidebar";

/**
 * App layout: a left book-tab {@link Sidebar} (brand + colored index tabs +
 * language/theme controls) beside the scrollable main content. On mobile the
 * sidebar becomes a hamburger-triggered drawer, so the top bar stays compact.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
