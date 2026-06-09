"use client";

import useSWR from "swr";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { NoteTypeBadge } from "@/components/status-badge";
import type { NoteTypeRead } from "@/lib/types";

interface NoteTypePickerProps {
  projectSlug: string;
  /** Selected type slug. */
  value: string;
  onChange: (slug: string) => void;
  id?: string;
}

/** SWR-backed picker over the note types available to a project (global + project). */
export function NoteTypePicker({ projectSlug, value, onChange, id }: NoteTypePickerProps) {
  const { data, isLoading } = useSWR<NoteTypeRead[]>(
    `/projects/${projectSlug}/note-types`,
  );

  if (isLoading) return <Skeleton className="h-9 w-full" />;

  const types = data ?? [];

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {types.map((type) => (
          <SelectItem key={type.id} value={type.slug}>
            <span className="flex items-center gap-2">
              <NoteTypeBadge
                type={{
                  id: type.id,
                  key: type.key,
                  slug: type.slug,
                  name: type.name,
                  color: type.color,
                }}
              />
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
