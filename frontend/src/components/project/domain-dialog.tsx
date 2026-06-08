"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, ApiError } from "@/lib/api";
import type { DomainCreate, DomainRead, DomainUpdate } from "@/lib/types";

import {
  UbiquitousLanguageEditor,
  entriesToLanguage,
  languageToEntries,
  type TermEntry,
} from "./ubiquitous-language-editor";

interface DomainDialogProps {
  projectSlug: string;
  /** When set the dialog edits this domain; otherwise it creates a new one. */
  domain: DomainRead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

/** Create or edit a bounded context, including its ubiquitous-language table. */
export function DomainDialog({
  projectSlug,
  domain,
  open,
  onOpenChange,
  onSaved,
}: DomainDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{domain ? "Edit domain" : "New domain"}</DialogTitle>
          <DialogDescription>
            Bounded contexts scope notes, tasks and documents.
          </DialogDescription>
        </DialogHeader>
        {/* Keyed so the form re-initializes whenever the dialog opens for a
            different (or new) domain, without a setState-in-effect resync. */}
        {open ? (
          <DomainForm
            key={domain?.id ?? "new"}
            projectSlug={projectSlug}
            domain={domain}
            onSaved={onSaved}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

interface DomainFormProps {
  projectSlug: string;
  domain: DomainRead | null;
  onSaved: () => void;
  onCancel: () => void;
}

function DomainForm({ projectSlug, domain, onSaved, onCancel }: DomainFormProps) {
  const [name, setName] = useState(domain?.name ?? "");
  const [description, setDescription] = useState(domain?.description ?? "");
  const [terms, setTerms] = useState<TermEntry[]>(() =>
    languageToEntries(domain?.ubiquitous_language),
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Domain name is required.");
      return;
    }
    setSaving(true);
    const language = entriesToLanguage(terms);
    const payload = {
      name: trimmed,
      description: description.trim() || null,
      ubiquitous_language: Object.keys(language).length ? language : null,
    };
    try {
      if (domain) {
        await api.updateDomain(domain.id, payload as DomainUpdate);
        toast.success("Domain updated.");
      } else {
        await api.createDomain(projectSlug, payload as DomainCreate);
        toast.success("Domain created.");
      }
      onSaved();
      onCancel();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not save the domain.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="domain-name">Name</Label>
          <Input
            id="domain-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="domain-description">Description</Label>
        <Textarea
          id="domain-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Ubiquitous language</Label>
        <ScrollArea className="max-h-64">
          <div className="pr-3">
            <UbiquitousLanguageEditor entries={terms} onChange={setTerms} />
          </div>
        </ScrollArea>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {domain ? "Save domain" : "Create domain"}
        </Button>
      </div>
    </div>
  );
}
