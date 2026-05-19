import "./discover/DiscoverPage.css";

import { motion } from "framer-motion";
import { AlertCircle, BookOpen, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Button, Card, EmptyState, SectionHeader } from "@/components/ui";
import { useDiscoverDecks } from "@/hooks/useDiscoverDecks";
import type { DiscoverDeckDto } from "@/services/commands/decks";

import { CatalogCard } from "./discover/CatalogCard";
import { FilterBar } from "./discover/FilterBar";
import type { CatalogDeck, CatalogTone } from "./discover/types";

// ── Tone palette (cycled by deck id) ─────────────────────────────────────────

const TONES: CatalogTone[] = ["azure", "cyan", "mint", "sky", "violet"];

function deriveTone(id: number): CatalogTone {
  return TONES[id % TONES.length];
}

// ── Standard CEFR levels used for filter detection ───────────────────────────

const CEFR_SET = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);

// ── DTO → presentation model ──────────────────────────────────────────────────

function toDisplay(dto: DiscoverDeckDto, index: number): CatalogDeck {
  return {
    id: dto.id,
    slug: dto.slug,
    title: dto.title,
    description: dto.description ?? "",
    level: dto.level ?? "A1",
    wordCount: dto.wordCount,
    tags: dto.tags,
    packName: dto.packName,
    installed: dto.installed,
    tone: deriveTone(dto.id),
    featured: index < 2,
    section: index % 2 === 0 ? "popular" : "recommended",
  };
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function DiscoverPage() {
  const { decks: rawDecks, isLoading, error, install, uninstall } =
    useDiscoverDecks();

  const [cefrLevel, setCefrLevel] = useState("All");
  const [tag, setTag] = useState("All");

  const decks: CatalogDeck[] = useMemo(
    () => rawDecks.map((d, i) => toDisplay(d, i)),
    [rawDecks],
  );

  // Derive filter options from actual data
  const cefrLevels = useMemo(() => {
    const levels = new Set(decks.map((d) => d.level).filter(Boolean));
    return ["All", ...Array.from(levels).sort()];
  }, [decks]);

  const tagOptions = useMemo(() => {
    const allTags = new Set(
      decks.flatMap((d) => d.tags.filter((t) => !CEFR_SET.has(t))),
    );
    return ["All", ...Array.from(allTags).sort()];
  }, [decks]);

  const filteredDecks = useMemo(
    () =>
      decks.filter(
        (deck) =>
          (cefrLevel === "All" || deck.level === cefrLevel) &&
          (tag === "All" || deck.tags.includes(tag)),
      ),
    [decks, cefrLevel, tag],
  );

  const featuredDecks = filteredDecks.filter((d) => d.featured);
  const popularDecks = filteredDecks.filter((d) => d.section === "popular");
  const recommendedDecks = filteredDecks.filter(
    (d) => d.section === "recommended",
  );

  if (isLoading) {
    return (
      <div className="discover-page discover-page--loading" aria-label="Loading catalog">
        <Loader2 size={28} className="discover-page__spinner" aria-hidden="true" />
        <p>Loading catalog…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="discover-page discover-page--error" aria-label="Catalog error">
        <AlertCircle size={28} aria-hidden="true" />
        <p>Could not load catalog: {error}</p>
      </div>
    );
  }

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
            conversation, and technology — all stored locally on your device.
          </p>
        </div>
        <div className="discover-hero__art" aria-hidden="true">
          <div className="discover-hero__tile discover-hero__tile--large">
            {decks[0]?.level ?? "A1"}
          </div>
          <div className="discover-hero__tile">{decks.length} decks</div>
          <div className="discover-hero__tile discover-hero__tile--soft">
            {decks.reduce((n, d) => n + d.wordCount, 0).toLocaleString()} words
          </div>
        </div>
      </Card>

      <FilterBar
        cefrLevels={cefrLevels}
        tags={tagOptions}
        selectedCefrLevel={cefrLevel}
        selectedTag={tag}
        onCefrLevelChange={setCefrLevel}
        onTagChange={setTag}
      />

      <section className="discover-section" aria-labelledby="featured-decks">
        <SectionHeader
          title="Featured Decks"
          description="High-signal packs for the next study session."
        />
        <div className="discover-featured-grid">
          {featuredDecks.map((deck) => (
            <CatalogCard
              deck={deck}
              key={deck.id}
              featured
              onInstall={install}
              onUninstall={uninstall}
            />
          ))}
        </div>
      </section>

      {filteredDecks.length > 0 ? (
        <>
          <section
            className="discover-section"
            aria-labelledby="popular-decks"
          >
            <SectionHeader
              title="Popular"
              description="Decks learners return to most often."
            />
            <div className="discover-catalog-grid">
              {popularDecks.map((deck) => (
                <CatalogCard
                  deck={deck}
                  key={deck.id}
                  onInstall={install}
                  onUninstall={uninstall}
                />
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
                <CatalogCard
                  deck={deck}
                  key={deck.id}
                  onInstall={install}
                  onUninstall={uninstall}
                />
              ))}
            </div>
          </section>
        </>
      ) : (
        <Card variant="glass">
          <EmptyState
            title="No decks match these filters"
            description="Try a broader CEFR level or remove the tag filter."
            icon={<BookOpen size={28} aria-hidden="true" />}
            actions={
              <Button
                className="discover-empty__action"
                variant="soft"
                onClick={() => {
                  setCefrLevel("All");
                  setTag("All");
                }}
              >
                Reset filters
              </Button>
            }
          />
        </Card>
      )}
    </motion.div>
  );
}
