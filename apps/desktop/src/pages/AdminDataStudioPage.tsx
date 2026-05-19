import "./pages.css";
import "./data-studio/data-studio.css";

import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BookText,
  CheckSquare,
  FileText,
  LayoutGrid,
  Mic2,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui";
import { DecksView } from "@/pages/data-studio/DecksView";
import { ValidationView } from "@/pages/data-studio/ValidationView";
import { VocabularyView } from "@/pages/data-studio/VocabularyView";
import type { AdminStats } from "@/services/commands/admin";
import { getAdminStats } from "@/services/commands/admin";

// ── Tabs ────────────────────────────────────────────────────────────────────

type TabId =
  | "vocabulary"
  | "decks"
  | "validation"
  | "provenance"
  | "audio-ipa"
  | "import-export";

interface TabDef {
  id: TabId;
  label: string;
  icon: LucideIcon;
  enabled: boolean;
}

const TABS: TabDef[] = [
  { id: "vocabulary", label: "Vocabulary", icon: BookText, enabled: true },
  { id: "decks", label: "Decks", icon: LayoutGrid, enabled: true },
  { id: "validation", label: "Validation", icon: CheckSquare, enabled: true },
  { id: "provenance", label: "Provenance", icon: FileText, enabled: false },
  { id: "audio-ipa", label: "Audio / IPA", icon: Mic2, enabled: false },
  {
    id: "import-export",
    label: "Import / Export",
    icon: ArrowLeftRight,
    enabled: false,
  },
];

// ── Header stats ────────────────────────────────────────────────────────────

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="data-studio__stat">
      <span className="data-studio__stat-value">{value.toLocaleString()}</span>
      <span className="data-studio__stat-label">{label}</span>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export function AdminDataStudioPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [active, setActive] = useState<TabId>("vocabulary");

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch(() => {
        // tests / preview without Tauri — header stats are optional
      });
  }, []);

  return (
    <div className="data-studio">
      {/* Header */}
      <div className="data-studio__header">
        <div className="data-studio__owner-badge">
          <ShieldCheck size={14} aria-hidden="true" />
          <Badge variant="muted">Owner Only</Badge>
        </div>
        <h2 className="data-studio__title">Data Studio</h2>
        <p className="data-studio__desc">
          Internal vocabulary database management. Changes here affect every
          learner using this database.
        </p>

        {stats && (
          <div className="data-studio__stats" aria-label="Database overview">
            <StatItem label="Users" value={stats.userCount} />
            <StatItem label="Words" value={stats.wordCount} />
            <StatItem label="Decks" value={stats.deckCount} />
            <StatItem label="Packs" value={stats.packCount} />
          </div>
        )}
      </div>

      {/* Tabbed body */}
      <div className="ds-shell">
        <nav
          className="ds-tabs"
          role="tablist"
          aria-label="Data Studio modules"
        >
          <div className="ds-tabs__heading">Modules</div>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const selected = active === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`ds-tabpanel-${tab.id}`}
                id={`ds-tab-${tab.id}`}
                className="ds-tab"
                onClick={() => tab.enabled && setActive(tab.id)}
                disabled={!tab.enabled}
                title={tab.enabled ? tab.label : `${tab.label} — coming soon`}
              >
                <Icon size={14} aria-hidden="true" />
                <span>{tab.label}</span>
                {!tab.enabled && (
                  <span className="ds-tab__count">soon</span>
                )}
              </button>
            );
          })}
        </nav>

        <section
          className="ds-panel"
          role="tabpanel"
          id={`ds-tabpanel-${active}`}
          aria-labelledby={`ds-tab-${active}`}
        >
          {active === "vocabulary" && <VocabularyView />}
          {active === "decks" && <DecksView />}
          {active === "validation" && <ValidationView />}
          {active === "provenance" && (
            <PlaceholderView title="Provenance audit" tab="Provenance" />
          )}
          {active === "audio-ipa" && (
            <PlaceholderView title="Audio & IPA quality" tab="Audio / IPA" />
          )}
          {active === "import-export" && (
            <PlaceholderView
              title="Import & export pipelines"
              tab="Import / Export"
            />
          )}
        </section>
      </div>
    </div>
  );
}

function PlaceholderView({ title, tab }: { title: string; tab: string }) {
  return (
    <div className="ds-panel__inner">
      <div className="ds-placeholder">
        <h3 className="ds-placeholder__title">{title}</h3>
        <p>
          The {tab} module ships in a later prompt. The current MVP covers
          Vocabulary, Decks, and Validation.
        </p>
      </div>
    </div>
  );
}
