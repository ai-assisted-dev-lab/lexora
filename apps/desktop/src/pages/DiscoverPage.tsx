import "./discover/DiscoverPage.css";

import { motion } from "framer-motion";
import {
  AlertCircle,
  BookOpen,
  CloudOff,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button, Card, EmptyState, SectionHeader } from "@/components/ui";

import { CatalogCard } from "./discover/CatalogCard";
import {
  catalogDecks,
  categoryFilters,
  cefrFilters,
  topicFilters,
} from "./discover/discoverMockData";
import { FilterBar } from "./discover/FilterBar";
import type { CatalogFilter } from "./discover/types";

function filterMatches(filter: CatalogFilter, values: string[]) {
  return filter === "All" || values.includes(filter);
}

export function DiscoverPage() {
  const [category, setCategory] = useState<CatalogFilter>("All");
  const [cefrLevel, setCefrLevel] = useState<CatalogFilter>("All");
  const [topic, setTopic] = useState<CatalogFilter>("All");

  const filteredDecks = useMemo(
    () =>
      catalogDecks.filter(
        (deck) =>
          filterMatches(category, deck.categories) &&
          filterMatches(cefrLevel, [deck.level]) &&
          filterMatches(topic, deck.topics),
      ),
    [category, cefrLevel, topic],
  );

  const featuredDecks = filteredDecks.filter((deck) => deck.featured);
  const popularDecks = filteredDecks.filter(
    (deck) => deck.section === "popular",
  );
  const recommendedDecks = filteredDecks.filter(
    (deck) => deck.section === "recommended",
  );

  return (
    <motion.div
      className="discover-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <Card className="discover-hero" variant="hero">
        <div>
          <p className="discover-hero__eyebrow">Local-first catalog</p>
          <h2>Discover focused English-Vietnamese decks.</h2>
          <p>
            Browse curated packs for exams, work, academic reading, daily
            conversation, and technology. These mock catalog entries are ready
            for a future SQLite-backed source.
          </p>
        </div>
        <div className="discover-hero__art" aria-hidden="true">
          <div className="discover-hero__tile discover-hero__tile--large">
            IELTS
          </div>
          <div className="discover-hero__tile">B2</div>
          <div className="discover-hero__tile discover-hero__tile--soft">
            2,840 words
          </div>
        </div>
      </Card>

      <FilterBar
        categories={categoryFilters}
        cefrLevels={cefrFilters}
        topics={topicFilters}
        selectedCategory={category}
        selectedCefrLevel={cefrLevel}
        selectedTopic={topic}
        onCategoryChange={setCategory}
        onCefrLevelChange={setCefrLevel}
        onTopicChange={setTopic}
      />

      <section className="discover-section" aria-labelledby="featured-decks">
        <SectionHeader
          title="Featured Decks"
          description="High-signal packs for the next study session."
        />
        <div className="discover-featured-grid">
          {featuredDecks.map((deck) => (
            <CatalogCard deck={deck} key={deck.id} featured />
          ))}
        </div>
      </section>

      {filteredDecks.length > 0 ? (
        <>
          <section className="discover-section" aria-labelledby="popular-decks">
            <SectionHeader
              title="Popular"
              description="Decks learners return to most often."
            />
            <div className="discover-catalog-grid">
              {popularDecks.map((deck) => (
                <CatalogCard deck={deck} key={deck.id} />
              ))}
            </div>
          </section>

          <section
            className="discover-section"
            aria-labelledby="recommended-decks"
          >
            <SectionHeader
              title="New / Recommended"
              description="Fresh local-first catalog picks for your level."
            />
            <div className="discover-catalog-grid">
              {recommendedDecks.map((deck) => (
                <CatalogCard deck={deck} key={deck.id} />
              ))}
            </div>
          </section>
        </>
      ) : (
        <Card variant="glass">
          <EmptyState
            title="No decks match these filters"
            description="Try a broader CEFR level or remove one topic filter."
            icon={<BookOpen size={28} aria-hidden="true" />}
            actions={
              <Button
                className="discover-empty__action"
                variant="soft"
                onClick={() => {
                  setCategory("All");
                  setCefrLevel("All");
                  setTopic("All");
                }}
              >
                Reset filters
              </Button>
            }
          />
        </Card>
      )}

      <section
        className="discover-state-row"
        aria-label="Catalog visual states"
      >
        <Card className="discover-state-card" variant="compact">
          <Loader2 size={20} aria-hidden="true" />
          <div>
            <h3>Loading state</h3>
            <p>Catalog cards will appear here from the local database.</p>
          </div>
        </Card>
        <Card className="discover-state-card" variant="compact">
          <Sparkles size={20} aria-hidden="true" />
          <div>
            <h3>Empty state</h3>
            <p>No decks yet for this filter combination.</p>
          </div>
        </Card>
        <Card className="discover-state-card" variant="compact">
          <AlertCircle size={20} aria-hidden="true" />
          <div>
            <h3>Error state</h3>
            <p>Local catalog index could not be read.</p>
          </div>
        </Card>
        <Card className="discover-state-card" variant="compact">
          <CloudOff size={20} aria-hidden="true" />
          <div>
            <h3>Offline ready</h3>
            <p>Discover never depends on a remote store in V1.</p>
          </div>
        </Card>
      </section>
    </motion.div>
  );
}
