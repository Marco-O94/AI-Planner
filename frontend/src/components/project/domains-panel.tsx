"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import Link from "next/link";
import { toast } from "sonner";
import { Boxes, ChevronRight, Eye, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useT, type TranslateFn } from "@/i18n/locale-context";
import { AnimatedItem, AnimatedList } from "@/components/motion";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {domains.map((domain) => (
              <AnimatedItem key={domain.id}>
                <DomainRow
                  domain={domain}
                  projectSlug={project.slug}
                  expanded={expanded.has(domain.id)}
                  onToggle={() => toggleExpanded(domain.id)}
                  onEdit={() => openEdit(domain)}
                  onDelete={() => setPendingDelete(domain)}
                  t={t}
                />
              </AnimatedItem>
            ))}
          </div>
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

interface DomainRowProps {
  domain: DomainRead;
  projectSlug: string;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  t: TranslateFn;
}

/**
 * One bounded context as an expandable table row. The leading chevron only
 * appears when the row has something to reveal (a description or vocabulary);
 * the eye opens the dedicated domain page, pencil edits, trash deletes.
 */
function DomainRow({
  domain,
  projectSlug,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  t,
}: DomainRowProps) {
  const termCount = domain.ubiquitous_language
    ? Object.keys(domain.ubiquitous_language).length
    : 0;
  const hasDetails = Boolean(domain.description) || termCount > 0;

  return (
    <div className="bg-card">
      <div className="flex items-center gap-1 px-1.5 py-1.5 transition-colors hover:bg-muted/40">
        {hasDetails ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={t("project.domains.expandAria", { name: domain.name })}
            className="shrink-0 text-muted-foreground"
          >
            <ChevronRight
              className={cn(
                "size-4 transition-transform duration-200",
                expanded && "rotate-90",
              )}
            />
          </Button>
        ) : (
          <span className="size-7 shrink-0" aria-hidden />
        )}

        <button
          type="button"
          onClick={hasDetails ? onToggle : undefined}
          disabled={!hasDetails}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
            hasDetails && "cursor-pointer",
          )}
        >
          <span className="truncate font-medium">{domain.name}</span>
          {termCount > 0 ? (
            <Badge
              variant="secondary"
              className="h-5 shrink-0 px-1.5 text-xs tabular-nums"
            >
              {t("project.domains.termsCount", { count: termCount })}
            </Badge>
          ) : null}
        </button>

        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          aria-label={t("project.domains.openAria", { name: domain.name })}
          className="shrink-0"
        >
          <Link href={`/projects/${projectSlug}/domains/${domain.slug}`}>
            <Eye className="size-4" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onEdit}
          aria-label={t("project.domains.editAria", { name: domain.name })}
          className="shrink-0"
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          aria-label={t("project.domains.deleteAria", { name: domain.name })}
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {hasDetails && expanded ? (
        <div className="space-y-3 border-t border-border bg-muted/20 px-3 py-3">
          {domain.description ? (
            <p className="text-sm text-muted-foreground">{domain.description}</p>
          ) : null}
          {termCount > 0 ? (
            <UbiquitousLanguageEditor
              entries={languageToEntries(domain.ubiquitous_language)}
              onChange={() => undefined}
              readOnly
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
