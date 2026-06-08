"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Page title block with optional description and right-aligned actions. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Centered empty state with optional icon and call-to-action. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 px-6 py-16 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="mb-4 grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">
          <Icon className="size-6" />
        </div>
      ) : null}
      <h3 className="text-base font-medium">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function TagList({ tags, className }: { tags: string[]; className?: string }) {
  if (!tags?.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="font-normal">
          #{tag}
        </Badge>
      ))}
    </div>
  );
}

/** Copy-to-clipboard button with a transient check state. */
export function CopyButton({
  value,
  label = "Copy",
  className,
  size = "sm",
}: {
  value: string;
  label?: string;
  className?: string;
  size?: "sm" | "default" | "icon";
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={copy}
      className={className}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {size !== "icon" ? <span>{copied ? "Copied" : label}</span> : null}
    </Button>
  );
}
