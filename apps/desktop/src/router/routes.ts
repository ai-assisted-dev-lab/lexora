import type { LucideIcon } from "lucide-react";
import {
  BarChart2,
  BookOpen,
  Brain,
  Compass,
  Home,
  Search,
  Settings2,
  Trophy,
} from "lucide-react";

import i18n from "@/i18n";

export interface RouteConfig {
  path: string;
  /** i18n translation key under the `nav` namespace. */
  labelKey: string;
  /** English fallback used when translation is unavailable (e.g. tests). */
  label: string;
  icon?: LucideIcon;
  requiresAuth: boolean;
  requiresOwner: boolean;
  showInSidebar: boolean;
  sidebarSection?: "main" | "bottom";
}

export const ROUTE_CONFIGS: RouteConfig[] = [
  /* ── Sidebar — main section ──────────────────────────────────────── */
  {
    path: "/home",
    labelKey: "nav.home",
    label: "Home",
    icon: Home,
    requiresAuth: true,
    requiresOwner: false,
    showInSidebar: true,
    sidebarSection: "main",
  },
  {
    path: "/discover",
    labelKey: "nav.discover",
    label: "Discover",
    icon: Compass,
    requiresAuth: true,
    requiresOwner: false,
    showInSidebar: true,
    sidebarSection: "main",
  },
  {
    path: "/library",
    labelKey: "nav.library",
    label: "My Library",
    icon: BookOpen,
    requiresAuth: true,
    requiresOwner: false,
    showInSidebar: true,
    sidebarSection: "main",
  },
  {
    path: "/review",
    labelKey: "nav.review",
    label: "Review",
    icon: Brain,
    requiresAuth: true,
    requiresOwner: false,
    showInSidebar: true,
    sidebarSection: "main",
  },
  {
    path: "/stats",
    labelKey: "nav.stats",
    label: "Stats",
    icon: BarChart2,
    requiresAuth: true,
    requiresOwner: false,
    showInSidebar: true,
    sidebarSection: "main",
  },
  {
    path: "/achievements",
    labelKey: "nav.achievements",
    label: "Achievements",
    icon: Trophy,
    requiresAuth: true,
    requiresOwner: false,
    showInSidebar: true,
    sidebarSection: "main",
  },

  /* ── Sidebar — bottom section ────────────────────────────────────── */
  {
    path: "/settings",
    labelKey: "nav.settings",
    label: "Settings",
    icon: Settings2,
    requiresAuth: true,
    requiresOwner: false,
    showInSidebar: true,
    sidebarSection: "bottom",
  },

  /* ── Authenticated, not in sidebar ──────────────────────────────── */
  {
    path: "/library/:deckId",
    labelKey: "nav.deckDetail",
    label: "Deck Detail",
    requiresAuth: true,
    requiresOwner: false,
    showInSidebar: false,
  },
  {
    path: "/word/:wordId",
    labelKey: "nav.wordDetail",
    label: "Word Detail",
    requiresAuth: true,
    requiresOwner: false,
    showInSidebar: false,
  },
  {
    path: "/study/session",
    labelKey: "nav.studySession",
    label: "Study Session",
    requiresAuth: true,
    requiresOwner: false,
    showInSidebar: false,
  },
  {
    path: "/search",
    labelKey: "nav.search",
    label: "Search",
    icon: Search,
    requiresAuth: true,
    requiresOwner: false,
    showInSidebar: false,
  },
  {
    path: "/weak-words",
    labelKey: "nav.weakWords",
    label: "Weak Words",
    requiresAuth: true,
    requiresOwner: false,
    showInSidebar: false,
  },
  {
    path: "/profile",
    labelKey: "nav.profile",
    label: "Profile",
    requiresAuth: true,
    requiresOwner: false,
    showInSidebar: false,
  },

  /* ── Owner-only — never visible to normal users ──────────────────── */
  {
    path: "/admin/data-studio",
    labelKey: "nav.dataStudio",
    label: "Data Studio",
    requiresAuth: true,
    requiresOwner: true,
    showInSidebar: false,
  },
];

export const SIDEBAR_MAIN_ITEMS = ROUTE_CONFIGS.filter(
  (r) => r.showInSidebar && r.sidebarSection === "main",
);

export const SIDEBAR_BOTTOM_ITEMS = ROUTE_CONFIGS.filter(
  (r) => r.showInSidebar && r.sidebarSection === "bottom",
);

/**
 * Returns the translated label for a route. Falls back to the English label
 * when i18n is not initialised (tests) or the key is missing.
 */
export function translateRouteLabel(route: RouteConfig): string {
  if (!i18n?.isInitialized) return route.label;
  const translated = i18n.t(route.labelKey);
  return translated === route.labelKey ? route.label : translated;
}

export function getPageLabel(pathname: string): string {
  for (const route of ROUTE_CONFIGS) {
    if (!route.path.includes(":")) {
      if (route.path === pathname) return translateRouteLabel(route);
    } else {
      const pattern = new RegExp(
        "^" + route.path.replace(/:[^/]+/g, "[^/]+") + "$",
      );
      if (pattern.test(pathname)) return translateRouteLabel(route);
    }
  }
  return "Lexora";
}
