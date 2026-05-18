import "./Sidebar.css";

import type { LucideIcon } from "lucide-react";
import {
  BarChart2,
  BookOpen,
  Brain,
  Compass,
  Settings2,
  Trophy,
} from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  Icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: "discover", label: "Discover", Icon: Compass },
  { id: "library", label: "My Library", Icon: BookOpen },
  { id: "review", label: "Review", Icon: Brain },
  { id: "stats", label: "Stats", Icon: BarChart2 },
  { id: "achievements", label: "Achievements", Icon: Trophy },
];

const BOTTOM_ITEMS: NavItem[] = [
  { id: "settings", label: "Settings", Icon: Settings2 },
];

export function Sidebar() {
  // Placeholder: Discover is active until routing is implemented
  const activeId = "discover";

  return (
    <nav className="sidebar" aria-label="Main navigation">
      <div className="sidebar__section">
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <div
            key={id}
            className={`sidebar__nav-item${id === activeId ? " sidebar__nav-item--active" : ""}`}
            aria-current={id === activeId ? "page" : undefined}
          >
            <Icon className="sidebar__nav-icon" size={20} aria-hidden="true" />
            {label}
          </div>
        ))}
      </div>

      <div className="sidebar__divider" />

      <div className="sidebar__section sidebar__section--bottom">
        {BOTTOM_ITEMS.map(({ id, label, Icon }) => (
          <div
            key={id}
            className={`sidebar__nav-item${id === activeId ? " sidebar__nav-item--active" : ""}`}
          >
            <Icon className="sidebar__nav-icon" size={20} aria-hidden="true" />
            {label}
          </div>
        ))}
      </div>
    </nav>
  );
}
