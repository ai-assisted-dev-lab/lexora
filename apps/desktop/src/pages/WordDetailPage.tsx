import "./word-detail/WordDetailPage.css";

import { motion } from "framer-motion";
import {
  Brain,
  ChevronLeft,
  CircleHelp,
  Headphones,
  Link2,
  MessageSquareText,
  Mic2,
  NotebookPen,
  Volume2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  Badge,
  Button,
  Card,
  ProgressBar,
  SectionHeader,
} from "@/components/ui";

import { SenseList } from "./word-detail/SenseList";
import type { WordDetailTab } from "./word-detail/types";
import { wordDetailMock } from "./word-detail/wordDetailMockData";

const tabs: Array<{
  id: WordDetailTab;
  label: string;
}> = [
  { id: "overview", label: "Overview" },
  { id: "pronunciation", label: "Pronunciation" },
  { id: "usage", label: "Usage" },
  { id: "network", label: "Word Network" },
  { id: "history", label: "Review History" },
  { id: "notes", label: "Notes" },
];

export function WordDetailPage() {
  const { wordId } = useParams<{ wordId: string }>();
  const [activeTab, setActiveTab] = useState<WordDetailTab>("overview");
  const word = wordDetailMock;

  const activeTabLabel = useMemo(
    () => tabs.find((tab) => tab.id === activeTab)?.label ?? "Overview",
    [activeTab],
  );

  return (
    <motion.div
      className="word-detail-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <h2 className="word-detail-page__title">Word Detail</h2>

      <Button asChild className="word-detail-back" variant="ghost">
        <Link to="/library/demo-deck">
          <ChevronLeft size={16} aria-hidden="true" />
          Back to Deck
        </Link>
      </Button>

      <Card className="word-detail-hero" variant="hero">
        <div className="word-detail-hero__main">
          <p className="word-detail-hero__eyebrow">
            Vocabulary entry {wordId ? `/${wordId}` : ""}
          </p>
          <div className="word-detail-hero__heading">
            <div>
              <h1>{word.headword}</h1>
              <p>
                {word.itemType} · {word.syllables} syllables · stress on{" "}
                {word.stress}
              </p>
            </div>
            <Button
              aria-label="Play pronunciation placeholder"
              type="button"
              variant="icon"
            >
              <Volume2 size={20} aria-hidden="true" />
            </Button>
          </div>

          <div className="word-detail-hero__ipa" aria-label="IPA">
            <span>UK {word.ipa.uk}</span>
            <span>US {word.ipa.us}</span>
          </div>

          <p className="word-detail-hero__meaning">
            {word.primaryVietnameseMeaning}
          </p>

          <div className="word-detail-hero__tags">
            <Badge>{word.level}</Badge>
            {word.tags.map((tag) => (
              <Badge key={tag} variant="muted">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        <aside className="word-detail-status" aria-label="Review status">
          <div>
            <Brain size={24} aria-hidden="true" />
            <span>Mastery placeholder</span>
          </div>
          <strong>{word.mastery}%</strong>
          <ProgressBar label="Word mastery" value={word.mastery} />
          <p>{word.reviewStatus}</p>
        </aside>
      </Card>

      <div
        className="word-detail-tabs"
        role="tablist"
        aria-label="Word detail tabs"
      >
        {tabs.map((tab) => (
          <button
            aria-controls={`word-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            className="word-detail-tab"
            id={`word-tab-button-${tab.id}`}
            key={tab.id}
            role="tab"
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card
        className="word-detail-panel"
        id={`word-tab-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`word-tab-button-${activeTab}`}
        variant="glass"
      >
        <SectionHeader
          title={activeTabLabel}
          description="Mock local content prepared for future SQLite word data."
        />

        {activeTab === "overview" && <SenseList senses={word.senses} />}

        {activeTab === "pronunciation" && (
          <div className="word-detail-pronunciation">
            <div className="word-detail-audio-card">
              <Headphones size={24} aria-hidden="true" />
              <div>
                <strong>Audio placeholder</strong>
                <p>No real audio is played in this mock.</p>
              </div>
              <Button
                aria-label="Preview audio placeholder"
                type="button"
                variant="icon"
              >
                <Volume2 size={18} aria-hidden="true" />
              </Button>
            </div>
            <div className="word-detail-pronunciation-grid">
              {word.pronunciationNotes.map((note) => (
                <Card key={note.label} variant="compact">
                  <Mic2 size={18} aria-hidden="true" />
                  <strong>{note.label}</strong>
                  <p>{note.value}</p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "usage" && (
          <div className="word-detail-usage-grid">
            <UsageList title="Collocations" items={word.collocations} />
            <UsageList
              title="Common Mistakes"
              items={word.commonMistakes}
              icon="help"
            />
          </div>
        )}

        {activeTab === "network" && (
          <div className="word-detail-network">
            <NetworkGroup title="Synonyms" items={word.synonyms} />
            <NetworkGroup title="Antonyms" items={word.antonyms} />
            <NetworkGroup title="Related Words" items={word.relatedWords} />
          </div>
        )}

        {activeTab === "history" && (
          <div className="word-detail-history">
            {word.reviewHistory.map((event) => (
              <article className="word-detail-history__row" key={event.date}>
                <span>{event.date}</span>
                <strong>{event.result}</strong>
                <p>{event.detail}</p>
              </article>
            ))}
          </div>
        )}

        {activeTab === "notes" && (
          <div className="word-detail-notes">
            <NotebookPen size={22} aria-hidden="true" />
            <div>
              <strong>Personal notes placeholder</strong>
              <p>{word.note}</p>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

interface UsageListProps {
  icon?: "help";
  items: string[];
  title: string;
}

function UsageList({ icon, items, title }: UsageListProps) {
  const Icon = icon === "help" ? CircleHelp : MessageSquareText;

  return (
    <Card className="word-detail-list-card" variant="compact">
      <div className="word-detail-list-card__title">
        <Icon size={18} aria-hidden="true" />
        <h3>{title}</h3>
      </div>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Card>
  );
}

interface NetworkGroupProps {
  items: string[];
  title: string;
}

function NetworkGroup({ items, title }: NetworkGroupProps) {
  return (
    <div className="word-detail-network__group">
      <h3>
        <Link2 size={16} aria-hidden="true" />
        {title}
      </h3>
      <div>
        {items.map((item) => (
          <Badge key={item} variant="muted">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}
