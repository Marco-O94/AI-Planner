"use client";

/**
 * Click / drag-and-drop zone for picking a single `.md` file. Purely
 * presentational — validation and parsing live in the parent SkillUpload.
 */

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

import { cn } from "@/lib/utils";

interface SkillDropzoneProps {
  onFile: (file: File) => void;
}

export function SkillDropzone({ onFile }: SkillDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function pick() {
    inputRef.current?.click();
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={pick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            pick();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-accent/40",
        )}
      >
        <div className="mb-3 grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">
          <UploadCloud className="size-6" />
        </div>
        <p className="text-sm font-medium">Drop a .md file or click to browse</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Frontmatter is parsed automatically
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".md,text/markdown"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
    </>
  );
}
