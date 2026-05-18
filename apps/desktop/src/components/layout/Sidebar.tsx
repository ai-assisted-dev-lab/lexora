import "./Sidebar.css";

import type { LucideIcon } from "lucide-react";
import { BookOpen, ChevronLeft, ChevronRight, Flame, User } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { SIDEBAR_BOTTOM_ITEMS, SIDEBAR_MAIN_ITEMS } from "@/router/routes";

const AUTO_COLLAPSE_BREAKPOINT = 1024;

interface SidebarLinkProps {
  path: string;
  label: string;
  Icon?: LucideIcon;
  isCollapsed: boolean;
}

function SidebarLink({ path, label, Icon, isCollapsed }: SidebarLinkProps) {
  const { pathname } = useLocation();
  const isActive = pathname === path;

  return (
    <NavLink
      to={path}
      className={`sidebar__nav-item${isActive ? " sidebar__nav-item--active" : ""}`}
      aria-current={isActive ? "page" : undefined}
      title={isCollapsed ? label : undefined}
    >
      {Icon && (
        <Icon className="sidebar__nav-icon" size={20} aria-hidden="true" />
      )}
      {!isCollapsed && <span className="sidebar__nav-label">{label}</span>}
    </NavLink>
  );
}

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < AUTO_COLLAPSE_BREAKPOINT) {
        setIsCollapsed(true);
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <nav
      className={`sidebar${isCollapsed ? " sidebar--collapsed" : ""}`}
      aria-label="Main navigation"
    >
      <div className="sidebar__brand">
        <div className="sidebar__brand-mark" aria-hidden="true">
          <BookOpen size={18} />
          <span className="sidebar__brand-badge">L</span>
        </div>
        {!isCollapsed && (
          <div className="sidebar__brand-text">
            <span className="sidebar__wordmark">Lexora</span>
            <span className="sidebar__subtitle">EN ↔ VI</span>
          </div>
        )}
        <button
          className="sidebar__toggle"
          onClick={() => setIsCollapsed((c) => !c)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight size={14} aria-hidden="true" />
          ) : (
            <ChevronLeft size={14} aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="sidebar__section">
        {SIDEBAR_MAIN_ITEMS.map(({ path, label, icon: Icon }) => (
          <SidebarLink
            key={path}
            path={path}
            label={label}
            Icon={Icon}
            isCollapsed={isCollapsed}
          />
        ))}
      </div>

      <div className="sidebar__divider" />

      <div className="sidebar__section sidebar__section--bottom">
        {SIDEBAR_BOTTOM_ITEMS.map(({ path, label, icon: Icon }) => (
          <SidebarLink
            key={path}
            path={path}
            label={label}
            Icon={Icon}
            isCollapsed={isCollapsed}
          />
        ))}

        <div
          className="sidebar__profile-card"
          data-testid="sidebar-profile"
          title={isCollapsed ? "Profile" : undefined}
        >
          <div className="sidebar__profile-avatar">
            <User size={14} aria-hidden="true" />
          </div>
          {!isCollapsed && (
            <div className="sidebar__profile-info">
              <span className="sidebar__profile-name">User</span>
              <span className="sidebar__profile-streak">
                <Flame size={11} aria-hidden="true" />
                0 day streak
              </span>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
