/**
 * Shared helpers for the Documents surface: accepted file types, friendly
 * type/extension labels, and an XHR-based uploader that exposes real upload
 * progress (the foundation's `api.uploadDocument` uses `fetch`, which cannot
 * report progress events).
 */

import type { Accept } from "react-dropzone";

import { API_URL, ApiError } from "@/lib/api";
import type { DocumentRead } from "@/lib/types";

/** MIME types + extensions accepted by the backend ingestor. */
export const ACCEPTED_FILE_TYPES: Accept = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/markdown": [".md", ".markdown"],
  "text/plain": [".txt"],
};

export const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".md", ".markdown", ".txt"];

/** 25 MB upload ceiling, matching the backend's request size budget. */
export const MAX_FILE_SIZE = 25 * 1024 * 1024;

/** Short, human label for a document's kind, derived from mime/filename. */
export function documentKindLabel(mimeType: string, filename: string): string {
  const ext = fileExtension(filename);
  if (mimeType === "application/pdf" || ext === "pdf") return "PDF";
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    return "DOCX";
  }
  if (mimeType === "text/markdown" || ext === "md" || ext === "markdown") {
    return "Markdown";
  }
  if (mimeType === "text/plain" || ext === "txt") return "Text";
  return ext ? ext.toUpperCase() : "File";
}

/** Lower-case extension without the dot, or empty string. */
export function fileExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot < 0 || dot === filename.length - 1) return "";
  return filename.slice(dot + 1).toLowerCase();
}

/** True when the document has been vectorized/indexed for search. */
export function isIndexed(document: DocumentRead): boolean {
  return Boolean(document.indexed_at);
}

export interface UploadExtra {
  title?: string;
  domain_id?: string;
  tags?: string;
}

/**
 * Upload a single document with progress reporting. Resolves with the created
 * `DocumentRead`. Rejects with an `ApiError` on non-2xx responses so callers can
 * surface a friendly message.
 */
export function uploadDocumentWithProgress(
  slug: string,
  file: File,
  extra: UploadExtra,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
): Promise<DocumentRead> {
  return new Promise<DocumentRead>((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    if (extra.title) form.append("title", extra.title);
    if (extra.domain_id) form.append("domain_id", extra.domain_id);
    if (extra.tags) form.append("tags", extra.tags);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/projects/${slug}/documents`);
    xhr.responseType = "text";

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        try {
          resolve(JSON.parse(xhr.responseText) as DocumentRead);
        } catch {
          reject(new ApiError(xhr.status, "Malformed upload response", null));
        }
        return;
      }
      reject(parseXhrError(xhr));
    };

    xhr.onerror = () =>
      reject(new ApiError(0, "Network error during upload", null));
    xhr.onabort = () =>
      reject(new ApiError(0, "Upload cancelled", null));

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    xhr.send(form);
  });
}

function parseXhrError(xhr: XMLHttpRequest): ApiError {
  let message = `${xhr.status} ${xhr.statusText || "Upload failed"}`;
  let detail: unknown = null;
  try {
    const body = JSON.parse(xhr.responseText);
    detail = body?.detail ?? body;
    if (typeof body?.detail === "string") message = body.detail;
  } catch {
    /* non-JSON error body */
  }
  return new ApiError(xhr.status, message, detail);
}

/** Friendly message for a rejected (wrong type/too large) drop. */
export function describeRejection(errorCode: string): string {
  switch (errorCode) {
    case "file-too-large":
      return "File is too large (max 25 MB).";
    case "file-invalid-type":
      return "Unsupported file type. Use PDF, DOCX, Markdown, or text.";
    case "too-many-files":
      return "Too many files dropped at once.";
    default:
      return "File could not be accepted.";
  }
}
