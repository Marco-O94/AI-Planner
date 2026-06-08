import type { DomainRead, ProjectRead } from "@/lib/types";

/**
 * Shared contract for the project-view tab components. The project page shell
 * renders each tab inside shadcn `Tabs` and passes these props. Every tab file
 * lives at `@/components/project/tabs/{name}-tab.tsx` and exports
 * `export function {Name}Tab(props: TabProps)`.
 */
export interface TabProps {
  project: ProjectRead;
  domains: DomainRead[];
  /** When set, scope the tab's content to this domain (used by the domain page). */
  domainId?: string;
}
