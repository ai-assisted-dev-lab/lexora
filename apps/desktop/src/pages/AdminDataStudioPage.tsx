import "./pages.css";

import {
  ArrowLeftRight,
  BookText,
  CheckSquare,
  FileText,
  LayoutGrid,
  Mic2,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui";
import { getAdminStats } from "@/services/commands/admin";
import type { AdminStats } from "@/services/commands/admin";

// ── Module registry ────────────────────────────────────────────────────────────

interface StudioModule {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

const STUDIO_MODULES: StudioModule[] = [
  {
    id: "vocabulary",
    icon: BookText,
    title: "Vocabulary Database",
    description:
      "Browse, search, and edit all words, senses, IPA transcriptions, and example sentences.",
  },
  {
    id: "decks",
    icon: LayoutGrid,
    title: "Deck Manager",
    description:
      "Create and organize packs and decks. Set difficulty, tags, and CEFR level assignments.",
  },
  {
    id: "validation",
    icon: CheckSquare,
    title: "Content Validation",
    description:
      "Run automated quality checks: missing IPA, duplicate words, and orphaned senses.",
  },
  {
    id: "import-export",
    icon: ArrowLeftRight,
    title: "Import / Export",
    description:
      "Bulk import CSV/JSON vocabulary packs. Export the full database or filtered subsets.",
  },
  {
    id: "provenance",
    icon: FileText,
    title: "Provenance",
    description:
      "Track content sources, attributions, and licence metadata for all bundled data.",
  },
  {
    id: "audio-ipa",
    icon: Mic2,
    title: "Audio / IPA Quality",
    description:
      "Manage pronunciation asset links, validate IPA strings, and flag missing audio.",
  },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function ModuleCard({ module }: { module: StudioModule }) {
  const Icon = module.icon;
  return (
    <div className="data-studio__module-card">
      <div className="data-studio__module-icon">
        <Icon size={18} aria-hidden="true" />
      </div>
      <p className="data-studio__module-name">{module.title}</p>
      <p className="data-studio__module-desc">{module.description}</p>
      <div className="data-studio__module-footer">
        <Badge variant="muted">Coming soon</Badge>
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="data-studio__stat">
      <span className="data-studio__stat-value">{value}</span>
      <span className="data-studio__stat-label">{label}</span>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function AdminDataStudioPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    getAdminStats().then(setStats).catch(() => {});
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
          Internal content management workspace. Changes here affect all users.
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

      {/* Module grid */}
      <div className="data-studio__body">
        <p className="data-studio__section-label">Modules</p>
        <div className="data-studio__modules">
          {STUDIO_MODULES.map((mod) => (
            <ModuleCard key={mod.id} module={mod} />
          ))}
        </div>
      </div>
    </div>
  );
}
