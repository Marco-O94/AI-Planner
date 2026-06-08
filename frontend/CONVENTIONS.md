# Frontend conventions (READ FIRST)

ProjectNotes frontend. Next.js **16.2.7** (App Router, Turbopack), React **19.2**,
TypeScript, Tailwind **v4**, shadcn/ui, framer-motion, SWR. The foundation is
already built and **builds green** — you build feature surfaces on top of it.

## Next.js 16 — breaking changes you MUST respect

- **`params` / `searchParams` are async (Promises).** In **client components**
  (almost everything here, because we use SWR + interactivity), DO NOT take
  `params` as a prop. Instead use the navigation hooks:
  ```tsx
  "use client";
  import { useParams, useSearchParams, useRouter, usePathname } from "next/navigation";
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  ```
  Only in a **server component** page would you do `async function Page({ params }: { params: Promise<{ slug: string }> })` and `await params`.
- **Turbopack is the default** for `next dev` / `next build`. Do not add webpack config.
- Mark any file using hooks/state/events/browser APIs with `"use client";` at the top.
- Do NOT run `npm install`, `npm run build`, or `next build`. Deps are already
  installed; the foundation owns `package.json`. The integrator builds at the end.

## Foundation you import (do NOT modify these files)

- `@/lib/types` — all backend types (`ProjectRead`, `NoteRead`, `TaskRead`,
  `DocumentRead`, `SkillRead`, `ArtifactTypeRead`, `ArtifactRead`,
  `ArtifactDetailRead`, `DomainRead`, `TemplateRead`, `SearchHitRead`,
  `FileGroupRead`, enums + the `NOTE_TYPES`/`TASK_STATUSES`/… arrays).
- `@/lib/api` — `api` (typed method per endpoint), `apiFetch`, `swrFetcher`
  (the SWR global fetcher), `apiUrl`, `ApiError`, `API_URL`.
- `@/lib/format` — `formatDate`, `formatDateTime`, `formatBytes`, `titleCase`,
  `stripHighlights`.
- `@/lib/utils` — `cn`.
- `@/hooks/use-debounce` — `useDebounce`.
- `@/components/ui/*` — shadcn components: button, input, textarea, select,
  command, dialog, card, badge, tabs, dropdown-menu, sonner, switch, separator,
  scroll-area, checkbox, progress, accordion, label, tooltip, popover, skeleton,
  sheet, table, alert-dialog, avatar, input-group.
- `@/components/motion` — `AnimatedList`, `AnimatedItem`, `FadeIn`,
  `AnimatePresence`, `motion`, `fadeSlideUp`.
- `@/components/status-badge` — `TaskStatusBadge`, `TaskPriorityBadge`,
  `ProjectStatusBadge`, `ArtifactStatusBadge`, `PhaseStatusBadge`,
  `NoteTypeBadge`, `TechKindBadge`, `ScopeBadge`.
- `@/components/common` — `PageHeader`, `EmptyState`, `TagList`, `CopyButton`.
- `@/components/markdown` — `Markdown` (renders markdown + code), `HighlightedSnippet`
  (renders backend `<em>` search snippets safely).
- `@/components/project/types` — `TabProps` (the project-tab contract).

## Data fetching

Use SWR with the global fetcher (key = backend path string):
```tsx
import useSWR from "swr";
import { api } from "@/lib/api";
import type { ProjectRead } from "@/lib/types";

const { data: projects, isLoading, error, mutate } = useSWR<ProjectRead[]>("/projects");
```
For writes call `api.*` then `mutate()` (optimistic where the plan asks).
Show toasts with sonner: `import { toast } from "sonner"`.
Handle errors: `catch (e) { toast.error(e instanceof ApiError ? e.message : "Something went wrong"); }`.
Loading → shadcn `Skeleton`; empty → `EmptyState`; never leave a blank screen.

## Animation

Wrap lists in `<AnimatedList>` with `<AnimatedItem>` children (subtle stagger
fade+slide). Animate dialogs/sheets with shadcn defaults; use `AnimatePresence`
for add/remove and `layout` on `AnimatedItem` for board moves. Keep it tasteful
— no bounce.

## Style / quality

- Tailwind v4 utility classes + the design tokens (`bg-primary`, `text-muted-foreground`,
  `border-border`, `bg-card`, etc.). Accent is violet (primary). Don't hardcode hex.
- Intentional hierarchy (scale contrast), real hover/focus/active states, no
  template-default card grids. Responsive (capture must work on mobile).
- Strong typing: no `any`; type component props with an `interface`; explicit
  types on exported functions. Immutable updates. Files < 300 lines — split if larger.
- No `console.log`.

## Backend

Base URL via `NEXT_PUBLIC_API_URL` (already wired; `api`/`apiFetch` use it).
Backend runs at `http://localhost:8088` in local dev. Search modes are
`lexical` | `semantic` | `hybrid`. Backend search snippets contain `<em>` marks —
render with `HighlightedSnippet`.
```
