"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Loader2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import type { DocumentRead, DomainRead } from "@/lib/types";
import { cn } from "@/lib/utils";

import {
  ACCEPTED_EXTENSIONS,
  ACCEPTED_FILE_TYPES,
  MAX_FILE_SIZE,
  describeRejection,
  uploadDocumentWithProgress,
} from "./lib";

const NO_DOMAIN = "__none__";

interface DocumentUploaderProps {
  projectSlug: string;
  domains: DomainRead[];
  /** Pre-selected domain (domain page); hides the picker when set. */
  scopedDomainId?: string;
  onUploaded: (document: DocumentRead) => void;
}

/**
 * Drag-and-drop (or click) upload zone for a single document with a live
 * progress bar, plus optional tags and target-domain fields.
 */
export function DocumentUploader({
  projectSlug,
  domains,
  scopedDomainId,
  onUploaded,
}: DocumentUploaderProps) {
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [tags, setTags] = useState("");
  const [domainId, setDomainId] = useState(scopedDomainId ?? NO_DOMAIN);

  const isUploading = progress !== null;
  const effectiveDomainId = scopedDomainId ?? domainId;

  const handleUpload = useCallback(
    async (file: File) => {
      setUploadingName(file.name);
      setProgress(0);
      try {
        const created = await uploadDocumentWithProgress(
          projectSlug,
          file,
          {
            tags: tags.trim() || undefined,
            domain_id:
              effectiveDomainId && effectiveDomainId !== NO_DOMAIN
                ? effectiveDomainId
                : undefined,
          },
          setProgress,
        );
        toast.success(`Uploaded “${created.title}”`);
        setTags("");
        onUploaded(created);
      } catch (error) {
        toast.error(
          error instanceof ApiError ? error.message : "Upload failed",
        );
      } finally {
        setProgress(null);
        setUploadingName(null);
      }
    },
    [projectSlug, tags, effectiveDomainId, onUploaded],
  );

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        const code = rejections[0]?.errors[0]?.code ?? "";
        toast.error(describeRejection(code));
      }
      const file = accepted[0];
      if (file) void handleUpload(file);
    },
    [handleUpload],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    disabled: isUploading,
    noClick: true,
    noKeyboard: true,
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border/80 hover:border-border hover:bg-muted/30",
          isUploading && "pointer-events-none opacity-80",
        )}
      >
        <input {...getInputProps()} />

        {isUploading ? (
          <div className="w-full max-w-sm space-y-3">
            <div className="flex items-center justify-center gap-2 text-sm font-medium">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span className="truncate">Uploading {uploadingName}…</span>
            </div>
            <Progress value={progress ?? 0} className="h-1.5" />
            <p className="text-xs text-muted-foreground">{progress ?? 0}%</p>
          </div>
        ) : (
          <>
            <div className="grid size-11 place-items-center rounded-full bg-secondary text-muted-foreground">
              <UploadCloud
                className={cn(
                  "size-5 transition-colors",
                  isDragActive && "text-primary",
                )}
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {isDragActive
                  ? "Drop to upload"
                  : "Drag & drop a document here"}
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, DOCX, Markdown, or text · up to{" "}
                {formatBytes(MAX_FILE_SIZE)}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={open}>
              Choose file
            </Button>
          </>
        )}
      </div>

      {!isUploading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="document-tags" className="text-xs">
              Tags{" "}
              <span className="font-normal text-muted-foreground">
                (comma-separated, optional)
              </span>
            </Label>
            <div className="relative">
              <Input
                id="document-tags"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="spec, reference"
                className="h-8 pr-8"
              />
              {tags ? (
                <button
                  type="button"
                  onClick={() => setTags("")}
                  aria-label="Clear tags"
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          {!scopedDomainId && domains.length > 0 ? (
            <div className="space-y-1.5">
              <Label htmlFor="document-domain" className="text-xs">
                Domain{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Select value={domainId} onValueChange={setDomainId}>
                <SelectTrigger
                  id="document-domain"
                  className="h-8 w-full"
                  size="sm"
                >
                  <SelectValue placeholder="Project-level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_DOMAIN}>Project-level</SelectItem>
                  {domains.map((domain) => (
                    <SelectItem key={domain.id} value={domain.id}>
                      {domain.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Accepted: {ACCEPTED_EXTENSIONS.join(", ")}. Documents are indexed for
        search automatically after upload.
      </p>
    </div>
  );
}
