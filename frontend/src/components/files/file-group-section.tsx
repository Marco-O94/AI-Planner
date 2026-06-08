"use client";

import { FolderGit2 } from "lucide-react";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { AnimatedItem, AnimatedList } from "@/components/motion";
import type { FileEntryRead, FileGroupRead } from "@/lib/types";

import { FileRow } from "./file-row";

interface FileGroupSectionProps {
  group: FileGroupRead;
  onOpen: (entry: FileEntryRead) => void;
}

/** One collapsible project section listing its saved files. */
export function FileGroupSection({ group, onOpen }: FileGroupSectionProps) {
  return (
    <AccordionItem
      value={group.project_slug}
      className="overflow-hidden rounded-xl border bg-card shadow-sm"
    >
      <AccordionTrigger className="px-4 hover:no-underline">
        <span className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary">
            <FolderGit2 className="size-4" />
          </span>
          <span className="font-medium text-foreground">{group.project_name}</span>
          <Badge variant="secondary" className="font-normal tabular-nums">
            {group.files.length}
          </Badge>
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-3 pb-3">
        <AnimatedList className="flex flex-col gap-2">
          {group.files.map((entry) => (
            <AnimatedItem key={`${entry.kind}-${entry.id}`}>
              <FileRow entry={entry} onOpen={onOpen} />
            </AnimatedItem>
          ))}
        </AnimatedList>
      </AccordionContent>
    </AccordionItem>
  );
}
