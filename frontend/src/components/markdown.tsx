"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

import { cn } from "@/lib/utils";

/**
 * Render markdown with GitHub-flavored extensions and syntax-highlighted code
 * fences. Used for note/skill/artifact-file content.
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn(
        "prose prose-sm prose-neutral dark:prose-invert max-w-none",
        "prose-pre:bg-transparent prose-pre:p-0",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className: codeClass, children: codeChildren, ...props }) {
            const match = /language-(\w+)/.exec(codeClass ?? "");
            const text = String(codeChildren).replace(/\n$/, "");
            if (match) {
              return (
                <SyntaxHighlighter
                  language={match[1]}
                  style={oneLight}
                  customStyle={{
                    margin: 0,
                    borderRadius: "0.5rem",
                    fontSize: "0.8125rem",
                    background: "var(--muted)",
                  }}
                >
                  {text}
                </SyntaxHighlighter>
              );
            }
            return (
              <code className={cn("rounded bg-muted px-1.5 py-0.5 text-[0.85em]", codeClass)} {...props}>
                {codeChildren}
              </code>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Render a backend search snippet, converting `<em>...</em>` highlight markers
 * into styled marks. The snippet is treated as plain text otherwise (no HTML).
 */
export function HighlightedSnippet({
  snippet,
  className,
}: {
  snippet: string;
  className?: string;
}) {
  const parts = snippet.split(/(<em>.*?<\/em>)/g);
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {parts.map((part, index) => {
        const match = /^<em>(.*?)<\/em>$/.exec(part);
        if (match) {
          return (
            <mark key={index} className="rounded bg-primary/15 px-0.5 text-foreground">
              {match[1]}
            </mark>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </p>
  );
}
