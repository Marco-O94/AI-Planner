"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import Link from "next/link";
import { toast } from "sonner";
import { Boxes, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/common";
import { useT } from "@/i18n/locale-context";
import { AnimatedItem, AnimatedList } from "@/components/motion";
import { api, ApiError } from "@/lib/api";
import type { DomainRead, ProjectRead } from "@/lib/types";

import { DomainDialog } from "./domain-dialog";
import {
  UbiquitousLanguageEditor,
  languageToEntries,
} from "./ubiquitous-language-editor";

interface DomainsButtonProps {
  project: ProjectRead;
  domains: DomainRead[] | undefined;
  isLoading: boolean;
}

/**
 * Compact "Domains (N)" entry for the header strip. Opens the full bounded-
 * context manager (list / create / edit / delete with vocabularies) in a
 * right-side Sheet so it stays out of the primary working flow.
 */
export function DomainsButton({ project, domains, isLoading }: DomainsButtonProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const count = domains?.length ?? 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Boxes className="size-3.5" />
          {t("project.domains.triggerLabel")}
          {!isLoading ? (
            <Badge
              variant="secondary"
              className="ml-0.5 h-5 min-w-5 justify-center px-1 tabular-nums"
            >
              {count}
            </Badge>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full gap-0 sm:max-w-lg"
        aria-describedby={undefined}
      >
        <SheetHeader className="gap-1">
          <SheetTitle>{t("project.domains.boundedContexts")}</SheetTitle>
          <SheetDescription>{t("project.domains.description")}</SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="px-4 pb-6">
            <DomainsManager
              project={project}
              domains={domains}
              isLoading={isLoading}
            />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

interface DomainsManagerProps {
  project: ProjectRead;
  domains: DomainRead[] | undefined;
  isLoading: boolean;
}

/** List / create / edit / delete bounded contexts with their vocabularies. */
function DomainsManager({ project, domains, isLoading }: DomainsManagerProps) {
  const t = useT();
  const { mutate } = useSWRConfig();
  const cacheKey = `/projects/${project.slug}/domains`;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DomainRead | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DomainRead | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(domain: DomainRead) {
    setEditing(domain);
    setDialogOpen(true);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.deleteDomain(pendingDelete.id);
      toast.success(t("project.domains.deleted", { name: pendingDelete.name }));
      await mutate(cacheKey);
      setPendingDelete(null);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : t("project.domains.deleteFailed"),
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-3.5" />
          {t("project.domains.newDomain")}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1].map((index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : !domains?.length ? (
        <EmptyState
          icon={Boxes}
          title={t("project.domains.emptyTitle")}
          description={t("project.domains.emptyDescription")}
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-3.5" />
              {t("project.domains.newDomain")}
            </Button>
          }
        />
      ) : (
        <AnimatedList>
          <Accordion type="multiple" className="w-full">
            {domains.map((domain) => (
              <AnimatedItem key={domain.id}>
                <AccordionItem value={domain.id} className="border-border">
                  <div className="flex items-center gap-1">
                    <AccordionTrigger className="flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{domain.name}</span>
                        {domain.ubiquitous_language &&
                        Object.keys(domain.ubiquitous_language).length ? (
                          <span className="text-xs text-muted-foreground">
                            {t("project.domains.termsCount", {
                              count: Object.keys(domain.ubiquitous_language).length,
                            })}
                          </span>
                        ) : null}
                      </span>
                    </AccordionTrigger>
                    <Button
                      asChild
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("project.domains.openAria", { name: domain.name })}
                    >
                      <Link href={`/projects/${project.slug}/domains/${domain.slug}`}>
                        <ChevronRight className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEdit(domain)}
                      aria-label={t("project.domains.editAria", { name: domain.name })}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setPendingDelete(domain)}
                      aria-label={t("project.domains.deleteAria", { name: domain.name })}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  <AccordionContent className="space-y-3">
                    {domain.description ? (
                      <p className="text-sm text-muted-foreground">{domain.description}</p>
                    ) : null}
                    <UbiquitousLanguageEditor
                      entries={languageToEntries(domain.ubiquitous_language)}
                      onChange={() => undefined}
                      readOnly
                    />
                  </AccordionContent>
                </AccordionItem>
              </AnimatedItem>
            ))}
          </Accordion>
        </AnimatedList>
      )}

      <DomainDialog
        projectSlug={project.slug}
        domain={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={() => mutate(cacheKey)}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("project.domains.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("project.domains.deleteDescription", {
                name: pendingDelete?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive/10 text-destructive hover:bg-destructive/20"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
