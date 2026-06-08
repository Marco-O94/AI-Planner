"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ai-planner-sidebar";
const COLLAPSED_VALUE = "collapsed";
const EXPANDED_VALUE = "expanded";

interface SidebarCollapsedState {
  /** Whether the sidebar is collapsed to an icon-only rail. */
  collapsed: boolean;
  /** Whether the persisted value has been read on the client yet. */
  hydrated: boolean;
  toggle: () => void;
  setCollapsed: (next: boolean) => void;
}

/**
 * Persisted collapsed state for the book-tab sidebar.
 *
 * SSR renders expanded (deterministic); on mount we align to the value stored
 * in localStorage under "ai-planner-sidebar". When nothing is stored we default
 * to collapsed on small viewports so the rail stays usable on mobile.
 */
export function useSidebarCollapsed(): SidebarCollapsedState {
  const [collapsed, setCollapsedState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let initial = false;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === COLLAPSED_VALUE) {
        initial = true;
      } else if (stored === EXPANDED_VALUE) {
        initial = false;
      } else if (typeof window !== "undefined" && window.matchMedia) {
        // No explicit preference: collapse by default on narrow screens.
        initial = window.matchMedia("(max-width: 767px)").matches;
      }
    } catch {
      /* storage unavailable */
    }
    setCollapsedState(initial);
    setHydrated(true);
  }, []);

  const persist = useCallback((next: boolean) => {
    setCollapsedState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? COLLAPSED_VALUE : EXPANDED_VALUE);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? COLLAPSED_VALUE : EXPANDED_VALUE);
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  return { collapsed, hydrated, toggle, setCollapsed: persist };
}
