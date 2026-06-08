"use client";

import { FileText, ListTodo, NotebookPen } from "lucide-react";

import { cn } from "@/lib/utils";

interface SourceLinksProps {
  noteIds: string[];
  taskIds: string[];
  documentIds: string[];
}

interface SourceGroupProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  ids: string[];
  hrefFor: (id: string) => string;
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

function SourceGroup({ icon: Icon, label, ids, hrefFor }: SourceGroupProps) {
  if (!ids.length) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" />
        <span>
          {label} ({ids.length})
        </span>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {ids.map((id) => (
          <li key={id}>
            <a
              href={hrefFor(id)}
              title={id}
              className={cn(
                "inline-flex items-center rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 font-mono text-[0.7rem] text-muted-foreground",
                "transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary",
              )}
            >
              {shortId(id)}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Links back to the source notes / tasks / documents that produced this version. */
export function SourceLinks({ noteIds, taskIds, documentIds }: SourceLinksProps) {
  const hasAny = noteIds.length || taskIds.length || documentIds.length;
  if (!hasAny) return null;

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-card p-4">
      <h4 className="text-sm font-medium">Source items</h4>
      <div className="grid gap-3 sm:grid-cols-3">
        <SourceGroup
          icon={NotebookPen}
          label="Notes"
          ids={noteIds}
          hrefFor={(id) => `/notes/${id}/artifacts`}
        />
        <SourceGroup
          icon={ListTodo}
          label="Tasks"
          ids={taskIds}
          hrefFor={(id) => `/tasks/${id}/artifacts`}
        />
        <SourceGroup
          icon={FileText}
          label="Documents"
          ids={documentIds}
          hrefFor={(id) => `/documents/${id}`}
        />
      </div>
    </div>
  );
}
