import { ChevronDown, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface UserProfileProps {
  name?: string;
  role?: string;
  onLogout?: () => Promise<void> | void;
}

function formatRole(role: string) {
  if (role === "owner") return "Admin";
  if (role === "learner") return "Learner";
  return role;
}

export function UserProfile({
  name = "User",
  role = "Learner",
  onLogout,
}: UserProfileProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = name;
  const displayRole = formatRole(role);
  const initial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  async function handleLogout() {
    setIsSigningOut(true);
    setIsOpen(false);
    await onLogout?.();
  }

  return (
    <div className="user-profile-menu" ref={menuRef}>
      <button
        className="user-profile"
        aria-label={`Open menu for ${displayName}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <div className="user-profile__avatar" aria-hidden="true">
          {initial}
        </div>
        <div className="user-profile__text">
          <span className="user-profile__name">{displayName}</span>
          <span className="user-profile__role">{displayRole}</span>
        </div>
        <ChevronDown
          size={14}
          className="user-profile__chevron"
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div className="user-profile__dropdown" role="menu">
          <div className="user-profile__dropdown-header">
            <span className="user-profile__dropdown-name">{displayName}</span>
            <span className="user-profile__dropdown-role">{displayRole}</span>
          </div>
          <button
            type="button"
            className="user-profile__logout"
            role="menuitem"
            onClick={handleLogout}
            disabled={isSigningOut}
          >
            <LogOut size={16} aria-hidden="true" />
            <span>{isSigningOut ? "Signing out..." : "Sign out"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
