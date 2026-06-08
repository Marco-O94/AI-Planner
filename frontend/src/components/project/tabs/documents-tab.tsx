"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { FileText, FolderUp, Search } from "lucide-react";
import { toast } from "sonner";

import { DeleteDocumentDialog } from "@/components/documents/delete-document-dialog";
import { DocumentPreviewSheet } from "@/components/documents/document-preview-sheet";
import { DocumentRow } from "@/components/documents/document-row";
import { DocumentUploader } from "@/components/documents/document-uploader";
import {
  DOCUMENT_KIND_FILTERS,
  filterDocuments,
  type DocumentKindFilter,
} from "@/components/documents/filter";
import { EmptyState } from "@/components/common";
import { AnimatedItem, AnimatedList, AnimatePresence } from "@/components/motion";
import type { TabProps } from "@/components/project/types";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { ApiError, api } from "@/lib/api";
import type { DocumentRead } from "@/lib/types";

/** Documents tab: upload, list (with indexed state), preview, and delete. */
export function DocumentsTab({ project, domains, domainId }: TabProps) {
  const swrKey = `/projects/${project.slug}/documents`;
  const { data, isLoading, error, mutate } = useSWR<DocumentRead[]>(swrKey, () =>
    api.listDocuments(project.slug),
  );

  const [rawQuery, setRawQuery] = useState("");
  const query = useDebounce(rawQuery, 200);
  const [kind, setKind] = useState<DocumentKindFilter>("ALL");
  const [previewDoc, setPreviewDoc] = useState<DocumentRead | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DocumentRead | null>(null);

  const documents = useMemo(() => data ?? [], [data]);

  const visible = useMemo(
    () => filterDocuments(documents, { query, kind, domainId }),
    [documents, query, kind, domainId],
  );

  // Count within scope (domain), before search/kind narrowing.
  const scopedCount = useMemo(
    () => filterDocuments(documents, { query: "", kind: "ALL", domainId }).length,
    [documents, domainId],
  );

  function handleUploaded(created: DocumentRead) {
    void mutate(
      (current) => [created, ...(current ?? []).filter((d) => d.id !== created.id)],
      { revalidate: true },
    );
  }

  async function handleDelete(document: DocumentRead) {
    try {
      await api.deleteDocument(document.id);
      void mutate(
        (current) => (current ?? []).filter((d) => d.id !== document.id),
        { revalidate: false },
      );
      toast.success(`Deleted “${document.title}”`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not delete document");
      throw e;
    }
  }

  return (
    <div className="space-y-6">
      <DocumentUploader
        projectSlug={project.slug}
        domains={domains}
        scopedDomainId={domainId}
        onUploaded={handleUploaded}
      />

      <DocumentsList
        isLoading={isLoading}
        error={error}
        visible={visible}
        scopedCount={scopedCount}
        rawQuery={rawQuery}
        onQueryChange={setRawQuery}
        kind={kind}
        onKindChange={setKind}
        domains={domains}
        showDomain={!domainId}
        onPreview={setPreviewDoc}
        onRequestDelete={setPendingDelete}
        onRetry={() => void mutate()}
      />

      <DocumentPreviewSheet
        document={previewDoc}
        onOpenChange={(open) => {
          if (!open) setPreviewDoc(null);
        }}
      />

      <DeleteDocumentDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        documentTitle={pendingDelete?.title ?? ""}
        onConfirm={async () => {
          if (pendingDelete) await handleDelete(pendingDelete);
        }}
      />
    </div>
  );
}

interface DocumentsListProps {
  isLoading: boolean;
  error: unknown;
  visible: DocumentRead[];
  scopedCount: number;
  rawQuery: string;
  onQueryChange: (value: string) => void;
  kind: DocumentKindFilter;
  onKindChange: (value: DocumentKindFilter) => void;
  domains: TabProps["domains"];
  showDomain: boolean;
  onPreview: (document: DocumentRead) => void;
  onRequestDelete: (document: DocumentRead) => void;
  onRetry: () => void;
}

function DocumentsList({
  isLoading,
  error,
  visible,
  scopedCount,
  rawQuery,
  onQueryChange,
  kind,
  onKindChange,
  domains,
  showDomain,
  onPreview,
  onRequestDelete,
  onRetry,
}: DocumentsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2.5">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-[4.75rem] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={FileText}
        title="Couldn’t load documents"
        description={error instanceof ApiError ? error.message : "Please try again."}
        action={
          <button
            type="button"
            onClick={onRetry}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Retry
          </button>
        }
      />
    );
  }

  if (scopedCount === 0) {
    return (
      <EmptyState
        icon={FolderUp}
        title="No documents yet"
        description="Drop a PDF, DOCX, Markdown, or text file above. It will be indexed for search automatically."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={rawQuery}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search documents by name or tag…"
            className="h-8 pl-8"
            aria-label="Search documents"
          />
        </div>
        <Select
          value={kind}
          onValueChange={(value) => onKindChange(value as DocumentKindFilter)}
        >
          <SelectTrigger size="sm" className="h-8 w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_KIND_FILTERS.map((option) => (
              <SelectItem key={option} value={option}>
                {option === "ALL" ? "All types" : option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matches"
          description="No documents match the current search or type filter."
        />
      ) : (
        <AnimatedList className="space-y-2.5">
          <AnimatePresence initial={false}>
            {visible.map((document) => (
              <AnimatedItem key={document.id} layout>
                <DocumentRow
                  document={document}
                  domains={domains}
                  showDomain={showDomain}
                  onPreview={onPreview}
                  onDelete={onRequestDelete}
                />
              </AnimatedItem>
            ))}
          </AnimatePresence>
        </AnimatedList>
      )}
    </div>
  );
}
