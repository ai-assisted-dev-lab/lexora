import "./library/LibraryPage.css";

import { motion } from "framer-motion";
import {
  AlertCircle,
  BarChart2,
  BookOpen,
  Clock,
  Compass,
  LibraryBig,
  Loader2,
  Star,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  Button,
  Card,
  EmptyState,
  SectionHeader,
  StatCard,
} from "@/components/ui";
import { useLibraryDecks } from "@/hooks/useLibraryDecks";
import type { LibraryDeckDto } from "@/services/commands/decks";

import { LibraryFilterBar } from "./library/LibraryFilterBar";
import { LibraryShelf } from "./library/LibraryShelf";
import type {
  InstalledDeck,
  LibraryDeckTone,
  LibraryFilter,
} from "./library/types";

const libraryFilters: LibraryFilter[] = [
  "All",
  "In Progress",
  "Completed",
  "Weak",
  "Favorites",
];

const TONES: LibraryDeckTone[] = ["azure", "cyan", "mint", "sky", "violet"];
const INITIAL_RENDER_LIMIT = 24;
const RENDER_INCREMENT = 24;
const SHELF_PREVIEW_LIMIT = 8;

function deriveTone(id: number): LibraryDeckTone {
  return TONES[id % TONES.length];
}

function formatLastStudied(value: string | null): string {
  if (!value) {
    return "New deck";
  }

  const studiedAt = new Date(value);
  if (Number.isNaN(studiedAt.getTime())) {
    return "Studied";
  }

  const now = Date.now();
  const elapsedDays = Math.max(
    0,
    Math.floor((now - studiedAt.getTime()) / 86_400_000),
  );

  if (elapsedDays === 0) {
    return "Today";
  }
  if (elapsedDays === 1) {
    return "Yesterday";
  }
  if (elapsedDays < 7) {
    return `${elapsedDays} days ago`;
  }
  return studiedAt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function rankLastStudied(value: string | null): number {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : -time;
}

function toInstalledDeck(dto: LibraryDeckDto): InstalledDeck {
  const hasProgressData =
    dto.masteredCount > 0 || dto.dueCount > 0 || dto.accuracy > 0;

  return {
    id: dto.id,
    slug: dto.slug,
    title: dto.title,
    description: dto.description ?? "Installed deck ready for offline study.",
    level: dto.level ?? "New",
    wordCount: dto.wordCount,
    progress: dto.progress,
    mastery: dto.progress,
    masteredCount: dto.masteredCount,
    dueCount: dto.dueCount,
    accuracy: dto.accuracy,
    lastStudied: formatLastStudied(dto.lastStudied),
    lastStudiedRank: rankLastStudied(dto.lastStudied),
    status: dto.progress >= 100 ? "completed" : "in-progress",
    favorite: false,
    weak: dto.dueCount > 0 || (hasProgressData && dto.accuracy < 60),
    tags: dto.tags,
    tone: deriveTone(dto.id),
  };
}

function matchesFilter(filter: LibraryFilter, deck: InstalledDeck) {
  switch (filter) {
    case "Completed":
      return deck.status === "completed";
    case "Favorites":
      return deck.favorite;
    case "In Progress":
      return deck.status === "in-progress";
    case "Weak":
      return deck.weak;
    case "All":
    default:
      return true;
  }
}

export function LibraryPage() {
  const [filter, setFilter] = useState<LibraryFilter>("All");
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_RENDER_LIMIT);
  const { decks: rawDecks, error, isLoading } = useLibraryDecks();

  const installedDecks = useMemo(
    () => rawDecks.map((deck) => toInstalledDeck(deck)),
    [rawDecks],
  );

  const filteredDecks = useMemo(
    () => installedDecks.filter((deck) => matchesFilter(filter, deck)),
    [filter, installedDecks],
  );
  const visibleFilteredDecks = useMemo(
    () => filteredDecks.slice(0, visibleLimit),
    [filteredDecks, visibleLimit],
  );

  const continueLearning = installedDecks
    .filter((deck) => deck.progress < 100)
    .slice(0, SHELF_PREVIEW_LIMIT);
  const recentlyStudied = [...installedDecks].sort(
    (a, b) => a.lastStudiedRank - b.lastStudiedRank,
  );
  const favorites = installedDecks.filter((deck) => deck.favorite);
  const weakDecks = installedDecks.filter((deck) => deck.weak);
  const visibleAllDecks = installedDecks.slice(0, visibleLimit);
  const hasMoreAllDecks = visibleLimit < installedDecks.length;
  const hasMoreFilteredDecks = visibleLimit < filteredDecks.length;
  const dueToday = installedDecks.reduce(
    (total, deck) => total + deck.dueCount,
    0,
  );
  const averageMastery =
    installedDecks.length > 0
      ? Math.round(
          installedDecks.reduce((total, deck) => total + deck.mastery, 0) /
            installedDecks.length,
        )
      : 0;

  if (isLoading) {
    return (
      <div
        className="library-page library-page--loading"
        aria-label="Loading library"
      >
        <Loader2
          size={28}
          className="library-page__spinner"
          aria-hidden="true"
        />
        <p>Loading library...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="library-page library-page--error"
        aria-label="Library error"
      >
        <AlertCircle size={28} aria-hidden="true" />
        <p>Could not load library: {error}</p>
      </div>
    );
  }

  return (
    <motion.div
      className="library-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <h2 className="library-page__title">My Library</h2>
      <Card className="library-hero" variant="hero">
        <div className="library-hero__content">
          <p className="library-hero__eyebrow">My collection</p>
          <h2>Your installed learning decks, ready offline.</h2>
          <p>
            Continue from recent sessions, revisit favorite decks, or target
            weak collections that need another pass.
          </p>
          <div className="library-hero__actions">
            <Button type="button" variant="primary">
              <BookOpen size={16} aria-hidden="true" />
              Continue Learning
            </Button>
            <Button asChild variant="secondary">
              <Link to="/discover">
                <Compass size={16} aria-hidden="true" />
                Browse Discover
              </Link>
            </Button>
          </div>
        </div>
        <div className="library-hero__cover" aria-hidden="true">
          <div className="library-hero__stack library-hero__stack--one" />
          <div className="library-hero__stack library-hero__stack--two" />
          <div className="library-hero__stack library-hero__stack--three">
            <LibraryBig size={54} />
            <span>{installedDecks.length} decks installed</span>
          </div>
        </div>
      </Card>

      <section className="library-summary" aria-label="Library summary">
        <StatCard
          icon={<Clock size={18} aria-hidden="true" />}
          label="Due today"
          value={String(dueToday)}
          meta="reviews queued"
        />
        <StatCard
          icon={<BarChart2 size={18} aria-hidden="true" />}
          label="Average mastery"
          value={`${averageMastery}%`}
          meta="across installed decks"
        />
        <StatCard
          icon={<Star size={18} aria-hidden="true" />}
          label="Favorites"
          value={String(favorites.length)}
          meta="pinned collections"
        />
        <StatCard
          icon={<AlertCircle size={18} aria-hidden="true" />}
          label="Weak decks"
          value={String(weakDecks.length)}
          meta="need focus"
        />
      </section>

      <LibraryFilterBar
        filters={libraryFilters}
        selectedFilter={filter}
        onFilterChange={(next) => {
          setFilter(next);
          setVisibleLimit(INITIAL_RENDER_LIMIT);
        }}
      />

      {installedDecks.length === 0 ? (
        <Card className="library-empty-card" variant="glass">
          <EmptyState
            title="No decks installed yet"
            description="Open Discover to add a deck to your offline learning collection."
            icon={<LibraryBig size={30} aria-hidden="true" />}
            actions={
              <Button asChild variant="primary">
                <Link to="/discover">
                  <Compass size={16} aria-hidden="true" />
                  Open Discover
                </Link>
              </Button>
            }
          />
        </Card>
      ) : filter === "All" ? (
        <div className="library-shelves">
          <LibraryShelf title="Continue Learning" decks={continueLearning} />
          <LibraryShelf
            title="Recently Studied"
            decks={recentlyStudied.slice(0, 4)}
          />
          <LibraryShelf
            title="Favorites"
            description="Pinned decks you return to most often."
            decks={favorites.slice(0, SHELF_PREVIEW_LIMIT)}
          />
          <LibraryShelf
            title="Weak Decks"
            description="Collections with lower mastery or higher due pressure."
            decks={weakDecks.slice(0, SHELF_PREVIEW_LIMIT)}
          />
          <LibraryShelf title="All Decks" decks={visibleAllDecks} dense />
          {hasMoreAllDecks && (
            <div className="library-load-more">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setVisibleLimit((current) => current + RENDER_INCREMENT)
                }
              >
                Load more decks
              </Button>
            </div>
          )}
        </div>
      ) : filteredDecks.length > 0 ? (
        <section className="library-filtered" aria-label={`${filter} Decks`}>
          <SectionHeader
            title={`${filter} Decks`}
            description="Filtered view of your installed collection."
          />
          <div className="library-grid">
            {visibleFilteredDecks.map((deck) => (
              <LibraryShelf.Card deck={deck} key={deck.id} />
            ))}
          </div>
          {hasMoreFilteredDecks && (
            <div className="library-load-more">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setVisibleLimit((current) => current + RENDER_INCREMENT)
                }
              >
                Load more decks
              </Button>
            </div>
          )}
        </section>
      ) : (
        <Card variant="glass">
          <EmptyState
            title={`No ${filter.toLowerCase()} decks yet`}
            description="Build your collection from Discover, then installed decks will appear here."
            icon={<Star size={28} aria-hidden="true" />}
            actions={
              <Button asChild variant="soft">
                <Link to="/discover">Open Discover</Link>
              </Button>
            }
          />
        </Card>
      )}
    </motion.div>
  );
}
