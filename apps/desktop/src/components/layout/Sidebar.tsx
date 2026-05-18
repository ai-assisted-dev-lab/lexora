import "./Sidebar.css";

import type { LucideIcon } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import { SIDEBAR_BOTTOM_ITEMS, SIDEBAR_MAIN_ITEMS } from "@/router/routes";

interface SidebarLinkProps {
  path: string;
  label: string;
  Icon?: LucideIcon;
}

function SidebarLink({ path, label, Icon }: SidebarLinkProps) {
  const { pathname } = useLocation();
  const isActive = pathname === path;

  return (
    <NavLink
      to={path}
      className={`sidebar__nav-item${isActive ? " sidebar__nav-item--active" : ""}`}
      aria-current={isActive ? "page" : undefined}
    >
      {Icon && (
        <Icon className="sidebar__nav-icon" size={20} aria-hidden="true" />
      )}
      {label}
    </NavLink>
  );
}

export function Sidebar() {
  return (
    <nav className="sidebar" aria-label="Main navigation">
      <div className="sidebar__section">
        {SIDEBAR_MAIN_ITEMS.map(({ path, label, icon: Icon }) => (
          <SidebarLink key={path} path={path} label={label} Icon={Icon} />
        ))}
      </div>

      <div className="sidebar__divider" />

      <div className="sidebar__section sidebar__section--bottom">
        {SIDEBAR_BOTTOM_ITEMS.map(({ path, label, icon: Icon }) => (
          <SidebarLink key={path} path={path} label={label} Icon={Icon} />
        ))}
      </div>
    </nav>
  );
}
