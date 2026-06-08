"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import Link from "next/link";
import { toast } from "sonner";
import {
  Boxes,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { EmptyState } from "@/components/common";
import { AnimatedItem, AnimatedList } from "@/components/motion";
import { api, ApiError } from "@/lib/api";
import type { DomainRead, ProjectRead } from "@/lib/types";

import { DomainDialog } from "./domain-dialog";
import {
  UbiquitousLanguageEditor,
  languageToEntries,
} from "./ubiquitous-language-editor";

interface DomainsPanelProps {
  project: ProjectRead;
  domains: DomainRead[] | undefined;
  isLoading: boolean;
}

/** List / create / edit / delete bounded contexts with their vocabularies. */
export function DomainsPanel({ project, domains, isLoading }: DomainsPanelProps) {
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
      toast.success(`Deleted "${pendingDelete.name}".`);
      await mutate(cacheKey);
      setPendingDelete(null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not delete the domain.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card className="gap-0">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">Bounded contexts</CardTitle>
          <CardDescription>Domains scope your notes, tasks and documents.</CardDescription>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-3.5" />
          New domain
        </Button>
      </CardHeader>

      <CardContent className="pt-4">
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1].map((index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : !domains?.length ? (
          <EmptyState
            icon={Boxes}
            title="No domains yet"
            description="Add a bounded context to organize work by sub-domain."
            action={
              <Button size="sm" onClick={openCreate}>
                <Plus className="size-3.5" />
                New domain
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
                              {Object.keys(domain.ubiquitous_language).length} terms
                            </span>
                          ) : null}
                        </span>
                      </AccordionTrigger>
                      <Button
                        asChild
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Open ${domain.name}`}
                      >
                        <Link href={`/projects/${project.slug}/domains/${domain.slug}`}>
                          <ChevronRight className="size-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(domain)}
                        aria-label={`Edit ${domain.name}`}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setPendingDelete(domain)}
                        aria-label={`Delete ${domain.name}`}
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
      </CardContent>

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
            <AlertDialogTitle>Delete domain?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{pendingDelete?.name}&quot; will be removed. Notes and tasks scoped to
              it are not deleted but lose their domain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive/10 text-destructive hover:bg-destructive/20"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
