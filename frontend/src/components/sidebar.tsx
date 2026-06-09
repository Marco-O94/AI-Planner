"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookMarked,
  ChevronLeft,
  FileText,
  FolderGit2,
  LayoutGrid,
  Layers,
  Menu,
  Settings,
  Sparkles,
} from "lucide-react";

import { SidebarProfile } from "@/components/sidebar-profile";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { useT, type TranslateFn } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  /** Key into the `nav` dictionary namespace. */
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Tailwind background utility for this book-index tab (theme-provided token). */
  tabClass: string;
  /** Match this exact path only (else prefix-match). */
  exact?: boolean;
}

const NAV: NavItem[] = [
  {
    href: "/",
    labelKey: "nav.projects",
    icon: LayoutGrid,
    tabClass: "bg-tab-projects",
    exact: true,
  },
  { href: "/files", labelKey: "nav.files", icon: FileText, tabClass: "bg-tab-files" },
  {
    href: "/artifact-types",
    labelKey: "nav.artifactTypes",
    icon: Layers,
    tabClass: "bg-tab-artifact-types",
  },
  {
    href: "/templates",
    labelKey: "nav.templates",
    icon: FolderGit2,
    tabClass: "bg-tab-templates",
  },
  { href: "/skills", labelKey: "nav.skills", icon: Sparkles, tabClass: "bg-tab-skills" },
  {
    href: "/settings",
    labelKey: "nav.settings",
    icon: Settings,
    tabClass: "bg-tab-settings",
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** A single colored book-index bookmark tab. */
function BookTab({
  item,
  active,
  collapsed,
  label,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  label: string;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  const tab = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? undefined : label}
      className={cn(
        // Flush to the LEFT edge, rounded on its RIGHT (outer) end — a tab
        // protruding from the book spine.
        "group relative flex items-center gap-3 rounded-l-none rounded-r-2xl py-2.5 pr-3 text-sm font-medium text-white outline-none transition-all duration-200",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        item.tabClass,
        collapsed ? "justify-center pl-3" : "pl-4",
        active
          // Active = full color, wider/raised, extends toward the content.
          ? "translate-x-0 opacity-100 shadow-md ring-1 ring-white/15 saturate-100"
          // Inactive = same color, dimmed/translucent so the active one pops.
          : "-translate-x-1 opacity-55 saturate-[0.6] hover:translate-x-0 hover:opacity-90 hover:saturate-100",
        // Active tab grows toward the content on expanded rails.
        active && !collapsed ? "mr-[-0.5rem]" : null,
      )}
    >
      <Icon className="size-[1.15rem] shrink-0 drop-shadow-sm" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  if (!collapsed) return tab;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{tab}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

/** The brand mark + wordmark shown at the top of the sidebar. */
function Brand({ collapsed, t }: { collapsed: boolean; t: TranslateFn }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2 font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md",
        collapsed && "justify-center",
      )}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <BookMarked className="size-4" />
      </span>
      {!collapsed && (
        <span className="truncate text-base">{t("nav.brand")}</span>
      )}
    </Link>
  );
}

/** Shared inner content for both the fixed rail and the mobile drawer. */
function SidebarNav({
  collapsed,
  pathname,
  t,
  onNavigate,
}: {
  collapsed: boolean;
  pathname: string;
  t: TranslateFn;
  onNavigate?: () => void;
}) {
  return (
    <nav
      aria-label={t("nav.primary")}
      className={cn("flex flex-col gap-2", collapsed ? "pr-2" : "pr-3")}
    >
      {NAV.map((item) => (
        <BookTab
          key={item.href}
          item={item}
          active={isActive(pathname, item)}
          collapsed={collapsed}
          label={t(item.labelKey)}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const t = useT();
  const { collapsed, toggle } = useSidebarCollapsed();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile: hamburger opens a left drawer (expanded book tabs). */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/80 bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={t("nav.openMenu")}>
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[min(90vw,18rem)] gap-0 bg-card p-0"
            showCloseButton={false}
          >
            <SheetTitle className="sr-only">{t("nav.brand")}</SheetTitle>
            <div className="flex h-full flex-col gap-6 py-5 pl-4">
              <Brand collapsed={false} t={t} />
              <SidebarNav
                collapsed={false}
                pathname={pathname}
                t={t}
                onNavigate={() => setMobileOpen(false)}
              />
              <div className="mt-auto border-t border-border/60 pr-4 pt-3">
                <SidebarProfile collapsed={false} menuSide="top" />
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <Brand collapsed={false} t={t} />
      </div>

      {/* Desktop: fixed/sticky left rail of colored book-index tabs. */}
      <aside
        data-collapsed={collapsed}
        className={cn(
          "sticky top-0 z-30 hidden h-screen shrink-0 flex-col gap-6 border-r border-border/80 bg-card py-5 pl-4 transition-[width] duration-200 md:flex",
          collapsed ? "w-[4.75rem]" : "w-60",
        )}
      >
        {/* Collapse toggle: a round control pinned to the right border seam, so
            it sits in the same spot whether the rail is open or collapsed. */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={toggle}
          aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
          aria-expanded={!collapsed}
          className="absolute -right-3 top-6 z-10 size-6 rounded-full border bg-card text-muted-foreground shadow-sm hover:text-foreground"
        >
          <ChevronLeft
            className={cn("size-3.5 transition-transform duration-200", collapsed && "rotate-180")}
          />
        </Button>

        <div
          className={cn(
            "flex items-center",
            // Collapsed: cancel the rail's left padding so the glyph centers on
            // the full width, aligned with the nav icons and avatar below.
            collapsed ? "-ml-4 w-[4.75rem] justify-center" : "pr-3",
          )}
        >
          <Brand collapsed={collapsed} t={t} />
        </div>

        <SidebarNav collapsed={collapsed} pathname={pathname} t={t} />

        <div className={cn("mt-auto border-t border-border/60 pt-3", collapsed ? "px-1" : "pr-3")}>
          <SidebarProfile collapsed={collapsed} />
        </div>
      </aside>
    </>
  );
}
