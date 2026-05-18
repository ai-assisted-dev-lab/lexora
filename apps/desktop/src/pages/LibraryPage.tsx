import "./library/LibraryPage.css";

import { motion } from "framer-motion";
import { BookOpen, Compass, LibraryBig, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  Button,
  Card,
  EmptyState,
  SectionHeader,
  StatCard,
} from "@/components/ui";

import { LibraryFilterBar } from "./library/LibraryFilterBar";
import { installedDecks, libraryFilters } from "./library/libraryMockData";
import { LibraryShelf } from "./library/LibraryShelf";
import type { LibraryFilter } from "./library/types";

function matchesFilter(
  filter: LibraryFilter,
  deck: (typeof installedDecks)[number],
) {
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

  const filteredDecks = useMemo(
    () => installedDecks.filter((deck) => matchesFilter(filter, deck)),
    [filter],
  );

  const continueLearning = installedDecks.filter((deck) => deck.progress < 100);
  const recentlyStudied = [...installedDecks].sort(
    (a, b) => a.lastStudiedRank - b.lastStudiedRank,
  );
  const favorites = installedDecks.filter((deck) => deck.favorite);
  const weakDecks = installedDecks.filter((deck) => deck.weak);
  const dueToday = installedDecks.reduce(
    (total, deck) => total + deck.dueCount,
    0,
  );

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
          label="Due today"
          value={String(dueToday)}
          meta="reviews queued"
        />
        <StatCard
          label="Average mastery"
          value={`${Math.round(
            installedDecks.reduce((total, deck) => total + deck.mastery, 0) /
              installedDecks.length,
          )}%`}
          meta="across installed decks"
        />
        <StatCard
          label="Favorites"
          value={String(favorites.length)}
          meta="pinned collections"
        />
        <StatCard
          label="Weak decks"
          value={String(weakDecks.length)}
          meta="need focus"
        />
      </section>

      <LibraryFilterBar
        filters={libraryFilters}
        selectedFilter={filter}
        onFilterChange={setFilter}
      />

      {filter === "All" ? (
        <div className="library-shelves">
          <LibraryShelf title="Continue Learning" decks={continueLearning} />
          <LibraryShelf
            title="Recently Studied"
            decks={recentlyStudied.slice(0, 4)}
          />
          <LibraryShelf
            title="Favorites"
            description="Pinned decks you return to most often."
            decks={favorites}
          />
          <LibraryShelf
            title="Weak Decks"
            description="Collections with lower mastery or higher due pressure."
            decks={weakDecks}
          />
          <LibraryShelf title="All Decks" decks={installedDecks} dense />
        </div>
      ) : filteredDecks.length > 0 ? (
        <section className="library-filtered" aria-label={`${filter} Decks`}>
          <SectionHeader
            title={`${filter} Decks`}
            description="Filtered view of your installed collection."
          />
          <div className="library-grid">
            {filteredDecks.map((deck) => (
              <LibraryShelf.Card deck={deck} key={deck.id} />
            ))}
          </div>
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
