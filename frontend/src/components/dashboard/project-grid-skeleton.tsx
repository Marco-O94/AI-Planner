import { Skeleton } from "@/components/ui/skeleton";

interface ProjectGridSkeletonProps {
  count?: number;
}

/** Placeholder grid that mirrors the project-card layout while data loads. */
export function ProjectGridSkeleton({ count = 6 }: ProjectGridSkeletonProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
        >
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-9 w-full" />
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <div className="flex gap-4 border-t border-border/60 pt-3">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
