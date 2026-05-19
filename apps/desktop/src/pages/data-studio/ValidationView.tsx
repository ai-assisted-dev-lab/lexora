import { Loader2 } from "lucide-react";

import { useAdminValidationSummary } from "@/hooks/useAdminValidationSummary";

interface CardData {
  label: string;
  value: number;
  hint: string;
  accent?: boolean;
}

export function ValidationView() {
  const { data, isLoading, error } = useAdminValidationSummary();

  if (error) {
    return (
      <div className="ds-panel__inner">
        <div className="ds-error" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="ds-panel__inner">
        <div className="ds-loading">
          <Loader2 size={16} className="ds-spin" aria-hidden="true" /> Loading
          validation summary…
        </div>
      </div>
    );
  }

  const cards: CardData[] = [
    {
      label: "Total words",
      value: data.totalWords,
      hint: "Catalog size",
      accent: true,
    },
    {
      label: "Missing Vietnamese meaning",
      value: data.missingMeanings,
      hint: "No definition_vi on any sense",
    },
    {
      label: "Missing English definition",
      value: data.missingDefinitions,
      hint: "Word has no sense rows at all",
    },
    {
      label: "Missing example",
      value: data.missingExamples,
      hint: "No example sentences attached",
    },
    {
      label: "Missing IPA",
      value: data.missingIpa,
      hint: "Neither ipa_us nor ipa_uk populated",
    },
    {
      label: "Missing audio",
      value: data.missingAudio,
      hint: "No pronunciation row",
    },
    {
      label: "Unverified",
      value: data.unverified,
      hint: "Default editorial state",
    },
    {
      label: "Needs review",
      value: data.needsReview,
      hint: "Flagged for follow-up",
    },
    {
      label: "Draft",
      value: data.draft,
      hint: "Work-in-progress entries",
    },
    {
      label: "Rejected",
      value: data.rejected,
      hint: "Quarantined entries",
    },
    {
      label: "Verified",
      value: data.verified,
      hint: "Approved by an editor",
    },
    {
      label: "Potential duplicates",
      value: data.potentialDuplicates,
      hint: "Same headword + part-of-speech",
    },
  ];

  return (
    <div className="ds-panel__inner">
      <p
        style={{
          color: "var(--color-text-muted)",
          fontSize: "0.875rem",
          margin: 0,
        }}
      >
        Lightweight counts from the local database. The full Data Quality
        Checker (auto-fix suggestions, duplicate clusters, AI content scanner)
        ships in a later prompt.
      </p>
      <div className="ds-validation-grid">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`ds-validation-card${c.accent ? " ds-validation-card--accent" : ""}`}
          >
            <span className="ds-validation-card__label">{c.label}</span>
            <span className="ds-validation-card__value">
              {c.value.toLocaleString()}
            </span>
            <span className="ds-validation-card__hint">{c.hint}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
