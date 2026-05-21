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

export interface RouteConfig {
  path: string;
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
    label: "Home",
    icon: Home,
    requiresAuth: true,
    requiresOwner: false,
    showInSidebar: true,
    sidebarSection: "main",
  },
  {
    path: "/discover",
    label: "Discover",
    icon: Compass,
    requiresAuth: true,
    requiresOwner: false,
    showInSidebar: true,
    sidebarSection: "main",
  },
  {
    path: "/library",
    label: "My Library",
    icon: BookOpen,
    requiresAuth: true,
    requiresOwner: false,
    showInSidebar: true,
    sidebarSection: "main",
  },
  {
    path: "/review",
    label: "Review",
    icon: Brain,
    requiresAuth: true,
    requiresOwner: false,
    showInSidebar: true,
    sidebarSection: "main",
  },
  {
    path: "/stats",
    label: "Stats",
    icon: BarChart2,
    requiresAuth: true,
    requiresOwner: false,
    showInSidebar: true,
    sidebarSection: "main",
  },
  {
    path: "/achievements",
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
    label: "Deck Detail",
    requiresAuth: true,
    requiresOwner: false,
    showInSidebar: false,
  },
  {
    path: "/word/:wordId",
    label: "Word Detail",
    requiresAuth: true,
    requiresOwner: false,
    showInSidebar: false,
  },
  {
    path: "/study/session",
    label: "Study Session",
    requiresAuth: true,
    requiresOwner: false,
    showInSidebar: false,
  },
  {
    path: "/search",
    label: "Search",
    icon: Search,
    requiresAuth: true,
    requiresOwner: false,
    showInSidebar: false,
  },
  {
    path: "/weak-words",
    label: "Weak Words",
    requiresAuth: true,
    requiresOwner: false,
    showInSidebar: false,
  },
  {
    path: "/profile",
    label: "Profile",
    requiresAuth: true,
    requiresOwner: false,
    showInSidebar: false,
  },

  /* ── Owner-only — never visible to normal users ──────────────────── */
  {
    path: "/admin/data-studio",
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

export function getPageLabel(pathname: string): string {
  for (const route of ROUTE_CONFIGS) {
    if (!route.path.includes(":")) {
      if (route.path === pathname) return route.label;
    } else {
      const pattern = new RegExp(
        "^" + route.path.replace(/:[^/]+/g, "[^/]+") + "$",
      );
      if (pattern.test(pathname)) return route.label;
    }
  }
  return "Lexora";
}
