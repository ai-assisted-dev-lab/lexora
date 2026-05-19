import "./CommandPalette.css";

import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  BarChart2,
  BookOpen,
  Brain,
  Compass,
  Home,
  Library,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trophy,
  User,
} from "lucide-react";
import {
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import {
  search,
  type SearchResult,
  type SearchResultGroup,
} from "@/services/commands/search";
import { useAuth } from "@/store/authContext";

interface PaletteCommand {
  id: string;
  label: string;
  description: string;
  section: "Navigate" | "Study" | "Admin";
  icon: LucideIcon;
  route: string;
  ownerOnly?: boolean;
  keywords?: string[];
}

interface PaletteItem {
  id: string;
  label: string;
  description: string;
  section: string;
  icon: LucideIcon;
  route: string;
  badge?: string;
}

const NAVIGATION_COMMANDS: PaletteCommand[] = [
  {
    id: "nav-home",
    label: "Home",
    description: "Open the learning dashboard.",
    section: "Navigate",
    icon: Home,
    route: "/home",
    keywords: ["dashboard"],
  },
  {
    id: "nav-discover",
    label: "Discover",
    description: "Browse available vocabulary decks.",
    section: "Navigate",
    icon: Compass,
    route: "/discover",
    keywords: ["catalog", "decks"],
  },
  {
    id: "nav-library",
    label: "My Library",
    description: "Open your installed decks.",
    section: "Navigate",
    icon: Library,
    route: "/library",
    keywords: ["owned", "collection"],
  },
  {
    id: "nav-review",
    label: "Review",
    description: "Open the Smart Review overview.",
    section: "Navigate",
    icon: Brain,
    route: "/review",
    keywords: ["fsrs", "study"],
  },
  {
    id: "nav-stats",
    label: "Stats",
    description: "View learning progress and retention.",
    section: "Navigate",
    icon: BarChart2,
    route: "/stats",
    keywords: ["analytics", "progress"],
  },
  {
    id: "nav-achievements",
    label: "Achievements",
    description: "See unlocked milestones.",
    section: "Navigate",
    icon: Trophy,
    route: "/achievements",
    keywords: ["badges"],
  },
  {
    id: "nav-settings",
    label: "Settings",
    description: "Adjust account, review, and pronunciation preferences.",
    section: "Navigate",
    icon: Settings2,
    route: "/settings",
    keywords: ["preferences"],
  },
  {
    id: "nav-profile",
    label: "Profile",
    description: "Open your local learner profile.",
    section: "Navigate",
    icon: User,
    route: "/profile",
    keywords: ["account"],
  },
  {
    id: "study-smart-review",
    label: "Start Smart Review",
    description: "Begin a flashcard review session.",
    section: "Study",
    icon: Sparkles,
    route: "/study/session?mode=flashcard",
    keywords: ["session", "flashcards", "learn"],
  },
  {
    id: "admin-data-studio",
    label: "Data Studio",
    description: "Manage vocabulary packs and content.",
    section: "Admin",
    icon: ShieldCheck,
    route: "/admin/data-studio",
    ownerOnly: true,
    keywords: ["admin", "owner", "content"],
  },
];

const SEARCH_DEBOUNCE_MS = 160;
const SEARCH_LIMIT = 6;

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function commandMatches(command: PaletteCommand, query: string): boolean {
  if (!query) return true;
  const haystack = [
    command.label,
    command.description,
    command.section,
    ...(command.keywords ?? []),
  ]
    .join(" ")
    .toLocaleLowerCase();
  return haystack.includes(query);
}

function commandToItem(command: PaletteCommand): PaletteItem {
  return {
    id: command.id,
    label: command.label,
    description: command.description,
    section: command.section,
    icon: command.icon,
    route: command.route,
  };
}

function searchResultToItem(result: SearchResult): PaletteItem {
  return {
    id: `search-${result.resultType}-${result.id}`,
    label: result.title,
    description:
      result.subtitle ??
      result.snippet ??
      result.deckTitle ??
      result.packTitle ??
      "Open search result.",
    section: "Search Results",
    icon: result.resultType === "deck" ? BookOpen : Search,
    route: result.route,
    badge: result.resultType === "deck" ? "Deck" : "Word",
  };
}

function flattenSearchGroups(groups: SearchResultGroup[]): PaletteItem[] {
  return groups.flatMap((group) => group.results.map(searchResultToItem));
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchItems, setSearchItems] = useState<PaletteItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const normalizedQuery = normalize(query);

  const visibleCommands = useMemo(
    () =>
      NAVIGATION_COMMANDS.filter((command) => {
        if (command.ownerOnly && user?.role !== "owner") return false;
        return commandMatches(command, normalizedQuery);
      }).map(commandToItem),
    [normalizedQuery, user?.role],
  );

  const items = useMemo(
    () => [...visibleCommands, ...searchItems],
    [searchItems, visibleCommands],
  );

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || normalizedQuery.length < 2) {
      setSearchItems([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    setSearchError(null);

    const timeout = window.setTimeout(() => {
      search(normalizedQuery, { limit: SEARCH_LIMIT })
        .then((response) => {
          if (cancelled) return;
          setSearchItems(flattenSearchGroups(response.groups));
        })
        .catch(() => {
          if (cancelled) return;
          setSearchItems([]);
          setSearchError("Search is unavailable.");
        })
        .finally(() => {
          if (!cancelled) {
            setIsSearching(false);
          }
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [isOpen, normalizedQuery]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, isOpen]);

  useEffect(() => {
    if (activeIndex > items.length - 1) {
      setActiveIndex(Math.max(items.length - 1, 0));
    }
  }, [activeIndex, items.length]);

  function closePalette() {
    setIsOpen(false);
    setQuery("");
    setSearchItems([]);
    setSearchError(null);
    setActiveIndex(0);
  }

  function activateItem(item: PaletteItem | undefined) {
    if (!item) return;
    closePalette();
    navigate(item.route);
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closePalette();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, items.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      activateItem(items[activeIndex]);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(items.length - 1, 0));
    }
  }

  const groupedItems = items.reduce<Array<[string, PaletteItem[]]>>(
    (groups, item) => {
      const current = groups[groups.length - 1];
      if (current?.[0] === item.section) {
        current[1].push(item);
      } else {
        groups.push([item.section, [item]]);
      }
      return groups;
    },
    [],
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="command-palette"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
        >
          <button
            className="command-palette__scrim"
            type="button"
            aria-label="Close command palette"
            onClick={closePalette}
          />
          <motion.div
            className="command-palette__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="command-palette-title"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            onKeyDown={handleDialogKeyDown}
          >
            <div className="command-palette__search">
              <Search size={18} aria-hidden="true" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search commands, words, decks..."
                aria-label="Command palette search"
                aria-controls="command-palette-results"
                aria-activedescendant={items[activeIndex]?.id}
              />
              <div className="command-palette__shortcut" aria-hidden="true">
                <kbd>Esc</kbd>
              </div>
            </div>

            <div className="command-palette__title-row">
              <h2 id="command-palette-title">Command Palette</h2>
              <span>{isSearching ? "Searching..." : `${items.length} items`}</span>
            </div>

            <div
              id="command-palette-results"
              className="command-palette__results"
              role="listbox"
              aria-label="Command palette results"
            >
              {groupedItems.map(([section, sectionItems]) => (
                <div className="command-palette__group" key={section}>
                  <p className="command-palette__section">{section}</p>
                  {sectionItems.map((item) => {
                    const absoluteIndex = items.findIndex(
                      (candidate) => candidate.id === item.id,
                    );
                    const Icon = item.icon;
                    const isActive = absoluteIndex === activeIndex;

                    return (
                      <button
                        id={item.id}
                        key={item.id}
                        type="button"
                        className={`command-palette__item${
                          isActive ? " command-palette__item--active" : ""
                        }`}
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => setActiveIndex(absoluteIndex)}
                        onClick={() => activateItem(item)}
                      >
                        <span className="command-palette__icon">
                          <Icon size={17} aria-hidden="true" />
                        </span>
                        <span className="command-palette__copy">
                          <span className="command-palette__label">
                            {item.label}
                          </span>
                          <span className="command-palette__description">
                            {item.description}
                          </span>
                        </span>
                        {item.badge && (
                          <span className="command-palette__badge">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}

              {items.length === 0 && (
                <div className="command-palette__empty" role="status">
                  No commands or search results.
                </div>
              )}

              {searchError && (
                <div className="command-palette__status" role="status">
                  {searchError}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
