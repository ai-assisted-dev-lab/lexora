import { ExternalLink, Loader2, Mic2, RefreshCw, Volume2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  adminGetValidationSummary,
  adminListVocabulary,
  type AdminValidationSummary,
  type AdminVocabularyListItem,
  type AdminVocabularyPage,
} from "@/services/commands/admin";
import { formatTauriError } from "@/services/tauri";
import { useAuth } from "@/store/authContext";

import { VocabularyDetailDrawer } from "./VocabularyView";

const PAGE_SIZE = 25;

type Filter = "missing_ipa" | "missing_audio" | "missing_both";

const FILTER_OPTIONS: Array<{ value: Filter; label: string }> = [
  { value: "missing_ipa", label: "Missing IPA" },
  { value: "missing_audio", label: "Missing audio" },
  { value: "missing_both", label: "Missing both" },
];

function pct(part: number | undefined, total: number | undefined) {
  if (!total || !part) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

export function AudioIpaView() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<AdminValidationSummary | null>(null);
  const [items, setItems] = useState<AdminVocabularyPage | null>(null);
  const [filter, setFilter] = useState<Filter>("missing_ipa");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [openVocabularyId, setOpenVocabularyId] = useState<number | null>(null);

  const listInput = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(filter === "missing_ipa" || filter === "missing_both"
        ? { missingIpa: true }
        : {}),
      ...(filter === "missing_audio" || filter === "missing_both"
        ? { missingAudio: true }
        : {}),
    }),
    [filter, page, search],
  );

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    Promise.all([adminGetValidationSummary(), adminListVocabulary(listInput)])
      .then(([nextSummary, nextPage]) => {
        if (cancelled) return;
        setSummary(nextSummary);
        setItems(nextPage);
      })
      .catch((err) => {
        if (!cancelled) setError(formatTauriError(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listInput, refreshToken]);

  if (user?.role === "learner") {
    return (
      <div className="ds-panel__inner">
        <div className="ds-error" role="alert">
          Owner access is required to view the audio &amp; IPA dashboard.
        </div>
      </div>
    );
  }

  const total = summary?.totalWords ?? 0;
  const missingIpa = summary?.missingIpa ?? 0;
  const missingAudio = summary?.missingAudio ?? 0;
  const ipaCoverage = total - missingIpa;
  const audioCoverage = total - missingAudio;

  const cards = [
    {
      label: "Words tracked",
      value: total,
      hint: "Vocabulary entries in the corpus",
    },
    {
      label: "IPA coverage",
      value: ipaCoverage,
      hint: `${pct(ipaCoverage, total)} have IPA recorded`,
    },
    {
      label: "Audio coverage",
      value: audioCoverage,
      hint: `${pct(audioCoverage, total)} have a primary recording`,
    },
    {
      label: "Missing IPA",
      value: missingIpa,
      hint: `${pct(missingIpa, total)} of catalog`,
    },
    {
      label: "Missing audio",
      value: missingAudio,
      hint: `${pct(missingAudio, total)} of catalog`,
    },
  ];

  const resetPage = (setter: () => void) => {
    setter();
    setPage(1);
  };

  const totalPages = items?.totalPages ?? 0;
  const rows = items?.items ?? [];

  return (
    <div className="ds-panel__inner">
      <div className="ds-validation-header">
        <div>
          <h3>Audio &amp; IPA Coverage</h3>
          <p>
            Pinpoint vocabulary entries that still need an IPA transcription or
            a primary pronunciation recording.
          </p>
        </div>
        <div className="ds-validation-header__meta">
          <Mic2 size={16} aria-hidden="true" />
          <span>Pronunciation quality dashboard</span>
        </div>
      </div>

      <div className="ds-validation-grid" aria-label="Audio coverage summary">
        {cards.map((card) => (
          <div key={card.label} className="ds-validation-card">
            <span className="ds-validation-card__label">{card.label}</span>
            <span className="ds-validation-card__value">
              {card.value.toLocaleString()}
            </span>
            <span className="ds-validation-card__hint">{card.hint}</span>
          </div>
        ))}
      </div>

      <div className="ds-quality-toolbar" role="search">
        <label className="ds-field ds-field--grow" htmlFor="audio-search">
          <span className="ds-field__label">Search headwords</span>
          <input
            id="audio-search"
            className="ds-input"
            value={search}
            onChange={(event) => resetPage(() => setSearch(event.target.value))}
            placeholder="Search vocabulary…"
          />
        </label>

        <label className="ds-field" htmlFor="audio-filter">
          <span className="ds-field__label">Filter</span>
          <select
            id="audio-filter"
            className="ds-select"
            value={filter}
            onChange={(event) =>
              resetPage(() => setFilter(event.target.value as Filter))
            }
          >
            {FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="ds-quality-btn"
          onClick={() => setRefreshToken((value) => value + 1)}
          disabled={isLoading}
        >
          <RefreshCw size={14} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="ds-error" role="alert">
          {error}
        </div>
      )}

      {isLoading && !items ? (
        <div className="ds-loading">
          <Loader2 size={16} className="ds-spin" aria-hidden="true" />
          Loading audio coverage…
        </div>
      ) : rows.length === 0 && !error ? (
        <div className="ds-quality-empty">
          <Volume2 size={28} aria-hidden="true" />
          <h3>Coverage is complete</h3>
          <p>
            Every entry matching the current filter already has the requested
            pronunciation metadata.
          </p>
        </div>
      ) : (
        <>
          <div className="ds-table-wrap ds-quality-table-wrap">
            <table
              className="ds-table ds-quality-table"
              aria-label="Audio coverage gaps"
            >
              <thead>
                <tr>
                  <th>Headword</th>
                  <th>Type</th>
                  <th>CEFR</th>
                  <th>Pack/decks</th>
                  <th>IPA</th>
                  <th>Audio</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item: AdminVocabularyListItem) => (
                  <tr key={item.id}>
                    <td className="ds-table__headword">{item.headword}</td>
                    <td className="ds-table__muted">{item.type}</td>
                    <td>{item.cefrLevel ?? "-"}</td>
                    <td className="ds-table__muted">
                      {item.deckCount} deck{item.deckCount === 1 ? "" : "s"}
                    </td>
                    <td>
                      <span
                        className={`ds-quality-severity ds-quality-severity--${
                          item.missing.ipa ? "high" : "low"
                        }`}
                      >
                        {item.missing.ipa ? "Missing" : "OK"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`ds-quality-severity ds-quality-severity--${
                          item.missing.audio ? "high" : "low"
                        }`}
                      >
                        {item.missing.audio ? "Missing" : "OK"}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ds-quality-icon-btn"
                        onClick={() => setOpenVocabularyId(item.id)}
                      >
                        <ExternalLink size={14} aria-hidden="true" />
                        <span>Open</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ds-pagination">
            <span>{items?.total.toLocaleString()} entries</span>
            <div className="ds-pager-buttons">
              <button
                type="button"
                className="ds-pager-btn"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page <= 1 || isLoading}
              >
                Previous
              </button>
              <span className="ds-quality-page">
                Page {page} of {totalPages || 1}
              </span>
              <button
                type="button"
                className="ds-pager-btn"
                onClick={() => setPage((value) => value + 1)}
                disabled={page >= totalPages || isLoading}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {openVocabularyId !== null && (
        <VocabularyDetailDrawer
          id={openVocabularyId}
          onClose={() => setOpenVocabularyId(null)}
          onSaved={() => setRefreshToken((value) => value + 1)}
        />
      )}
    </div>
  );
}
