"use client";

/**
 * Global settings page. Hosts app-wide catalogues and preferences. The first
 * section manages the global Technologies catalogue (languages, frameworks,
 * databases, tools) used to tag projects. Built to host future settings.
 */

import { PageHeader } from "@/components/common";
import { FadeIn } from "@/components/motion";
import { TechnologiesManager } from "@/components/technologies/technologies-manager";
import { useT } from "@/i18n/locale-context";

export default function SettingsPage() {
  const t = useT();
  return (
    <FadeIn className="space-y-10">
      <PageHeader
        title={t("settings.page.title")}
        description={t("settings.page.description")}
      />
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">
            {t("settings.technologies.title")}
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {t("settings.technologies.description")}
          </p>
        </div>
        <TechnologiesManager />
      </section>
    </FadeIn>
  );
}
