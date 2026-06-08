/** Client-side filtering for the documents list (search + kind + domain scope). */

import type { DocumentRead } from "@/lib/types";

import { documentKindLabel } from "./lib";

export type DocumentKindFilter = "ALL" | "PDF" | "DOCX" | "Markdown" | "Text";

export const DOCUMENT_KIND_FILTERS: DocumentKindFilter[] = [
  "ALL",
  "PDF",
  "DOCX",
  "Markdown",
  "Text",
];

export interface DocumentFilters {
  query: string;
  kind: DocumentKindFilter;
  /** When set, only documents belonging to this domain are kept. */
  domainId?: string;
}

/** Apply search, kind, and domain filters immutably; returns a new array. */
export function filterDocuments(
  documents: DocumentRead[],
  filters: DocumentFilters,
): DocumentRead[] {
  const needle = filters.query.trim().toLowerCase();

  return documents.filter((document) => {
    if (filters.domainId && document.domain_id !== filters.domainId) {
      return false;
    }
    if (
      filters.kind !== "ALL" &&
      documentKindLabel(document.mime_type, document.filename) !== filters.kind
    ) {
      return false;
    }
    if (!needle) return true;
    const haystack = [
      document.title,
      document.filename,
      document.tags.join(" "),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}
