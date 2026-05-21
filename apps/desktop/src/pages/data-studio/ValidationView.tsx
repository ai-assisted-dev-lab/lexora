import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  adminGetDataQualitySummary,
  adminListDataQualityIssues,
  adminRunDataQualityScan,
  type DataQualityCategory,
  type DataQualityEntityType,
  type DataQualityIssue,
  type DataQualityIssuePage,
  type DataQualitySeverity,
  type DataQualitySummary,
} from "@/services/commands/admin";
import { formatTauriError } from "@/services/tauri";
import { useAuth } from "@/store/authContext";

import { VocabularyDetailDrawer } from "./VocabularyView";

const CATEGORY_OPTIONS: Array<{ value: DataQualityCategory; label: string }> = [
  { value: "missing_field", label: "Missing field" },
  { value: "duplicate", label: "Duplicate" },
  { value: "conflict", label: "Conflict" },
  { value: "broken_reference", label: "Broken reference" },
  { value: "provenance", label: "Provenance" },
  { value: "suspicious_content", label: "Suspicious content" },
];

const SEVERITY_OPTIONS: Array<{ value: DataQualitySeverity; label: string }> = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const ENTITY_OPTIONS: Array<{ value: DataQualityEntityType; label: string }> = [
  { value: "vocabulary_item", label: "Vocabulary item" },
  { value: "vocabulary_sense", label: "Vocabulary sense" },
  { value: "pronunciation", label: "Pronunciation" },
  { value: "deck", label: "Deck" },
  { value: "deck_item", label: "Deck item" },
  { value: "asset", label: "Asset" },
  { value: "relation", label: "Relation" },
];

const PAGE_SIZE = 25;

function labelFromValue(value: string | null | undefined) {
  if (!value) return "All";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatCount(value: number | undefined) {
  return (value ?? 0).toLocaleString();
}

export function ValidationView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DataQualitySummary | null>(null);
  const [issuePage, setIssuePage] = useState<DataQualityIssuePage | null>(null);
  const [category, setCategory] = useState<DataQualityCategory | "">("");
  const [severity, setSeverity] = useState<DataQualitySeverity | "">("");
  const [entityType, setEntityType] = useState<DataQualityEntityType | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [openVocabularyId, setOpenVocabularyId] = useState<number | null>(null);

  const listInput = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      ...(category ? { category } : {}),
      ...(severity ? { severity } : {}),
      ...(entityType ? { entityType } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
    }),
    [category, entityType, page, search, severity],
  );

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      adminGetDataQualitySummary(),
      adminListDataQualityIssues(listInput),
    ])
      .then(([nextSummary, nextPage]) => {
        if (cancelled) return;
        setSummary(nextSummary);
        setIssuePage(nextPage);
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
          Owner access is required to view Data Quality Checker results.
        </div>
      </div>
    );
  }

  const cards = [
    {
      label: "Critical issues",
      value: summary?.quickCounts.critical,
      hint: "Broken references and unsafe records",
      tone: "critical",
    },
    {
      label: "High issues",
      value: summary?.quickCounts.high,
      hint: "Learning-blocking data gaps",
      tone: "high",
    },
    {
      label: "Missing meanings",
      value: summary?.quickCounts.missingMeanings,
      hint: "No Vietnamese meaning",
      tone: "default",
    },
    {
      label: "Missing IPA/audio",
      value: summary?.quickCounts.missingIpaAudio,
      hint: "Pronunciation metadata gaps",
      tone: "default",
    },
    {
      label: "Duplicates",
      value: summary?.quickCounts.duplicates,
      hint: "Exact and near duplicate groups",
      tone: "default",
    },
    {
      label: "Unverified entries",
      value: summary?.quickCounts.unverifiedEntries,
      hint: "Editorial backlog",
      tone: "default",
    },
  ];

  const runScan = async () => {
    setIsScanning(true);
    setError(null);
    setStatus(null);
    try {
      const result = await adminRunDataQualityScan({
        ...(category ? { categories: [category] } : {}),
        ...(severity ? { severity: [severity] } : {}),
        limit: PAGE_SIZE,
      });
      setSummary(result.summary);
      setStatus(
        `Scan completed at ${result.scannedAt}. ${result.totalIssues.toLocaleString()} matching issues found.`,
      );
      setPage(1);
      setRefreshToken((value) => value + 1);
    } catch (err) {
      setError(formatTauriError(err));
    } finally {
      setIsScanning(false);
    }
  };

  const resetPage = (setter: () => void) => {
    setter();
    setPage(1);
  };

  const openIssueTarget = (issue: DataQualityIssue) => {
    const target = issue.navigationTarget;
    if (!target) return;
    if (target.targetType === "vocabulary_item") {
      const id = Number(target.targetId);
      if (Number.isFinite(id)) setOpenVocabularyId(id);
      return;
    }
    if (target.targetType === "deck") {
      navigate(`/library/${target.targetId}`);
    }
  };

  const totalPages = issuePage?.totalPages ?? 0;
  const hasIssues = (issuePage?.items.length ?? 0) > 0;

  return (
    <div className="ds-panel__inner">
      <div className="ds-validation-header">
        <div>
          <h3>Data Quality Checker</h3>
          <p>
            Offline scan of vocabulary, deck, audio, reference, provenance, and
            suspicious content records.
          </p>
        </div>
        <div className="ds-validation-header__meta">
          <ShieldAlert size={16} aria-hidden="true" />
          <span>Owner-only native validation</span>
        </div>
      </div>

      <div className="ds-validation-grid" aria-label="Validation summary">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`ds-validation-card ds-validation-card--${card.tone}`}
          >
            <span className="ds-validation-card__label">{card.label}</span>
            <span className="ds-validation-card__value">
              {formatCount(card.value)}
            </span>
            <span className="ds-validation-card__hint">{card.hint}</span>
          </div>
        ))}
      </div>

      <div
        className="ds-quality-toolbar"
        role="search"
        aria-label="Issue filters"
      >
        <label className="ds-field ds-field--grow" htmlFor="dq-search">
          <span className="ds-field__label">Search issues</span>
          <span className="ds-input-with-icon">
            <Search size={14} aria-hidden="true" />
            <input
              id="dq-search"
              className="ds-input"
              value={search}
              onChange={(event) =>
                resetPage(() => setSearch(event.target.value))
              }
              placeholder="Headword, field, message..."
            />
          </span>
        </label>

        <label className="ds-field" htmlFor="dq-category">
          <span className="ds-field__label">Category</span>
          <select
            id="dq-category"
            className="ds-select"
            value={category}
            onChange={(event) =>
              resetPage(() =>
                setCategory(event.target.value as DataQualityCategory | ""),
              )
            }
          >
            <option value="">All categories</option>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="ds-field" htmlFor="dq-severity">
          <span className="ds-field__label">Severity</span>
          <select
            id="dq-severity"
            className="ds-select"
            value={severity}
            onChange={(event) =>
              resetPage(() =>
                setSeverity(event.target.value as DataQualitySeverity | ""),
              )
            }
          >
            <option value="">All severities</option>
            {SEVERITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="ds-field" htmlFor="dq-entity">
          <span className="ds-field__label">Entity</span>
          <select
            id="dq-entity"
            className="ds-select"
            value={entityType}
            onChange={(event) =>
              resetPage(() =>
                setEntityType(event.target.value as DataQualityEntityType | ""),
              )
            }
          >
            <option value="">All entities</option>
            {ENTITY_OPTIONS.map((option) => (
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
          disabled={isLoading || isScanning}
        >
          <RefreshCw size={14} aria-hidden="true" />
          Refresh
        </button>
        <button
          type="button"
          className="ds-quality-btn ds-quality-btn--primary"
          onClick={runScan}
          disabled={isLoading || isScanning}
        >
          {isScanning ? (
            <Loader2 size={14} className="ds-spin" aria-hidden="true" />
          ) : (
            <ShieldAlert size={14} aria-hidden="true" />
          )}
          Run scan
        </button>
      </div>

      {status && (
        <div className="ds-feedback ds-feedback--success">{status}</div>
      )}
      {error && (
        <div className="ds-error" role="alert">
          {error}
        </div>
      )}

      {isLoading && !issuePage ? (
        <div className="ds-loading">
          <Loader2 size={16} className="ds-spin" aria-hidden="true" />
          Loading quality issues...
        </div>
      ) : !hasIssues && !error ? (
        <div className="ds-quality-empty">
          <CheckCircle2 size={28} aria-hidden="true" />
          <h3>No issues found</h3>
          <p>
            The current filters did not return missing, duplicate, conflicting,
            suspicious, or broken records.
          </p>
        </div>
      ) : (
        <>
          <div className="ds-table-wrap ds-quality-table-wrap">
            <table
              className="ds-table ds-quality-table"
              aria-label="Quality issues"
            >
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Category</th>
                  <th>Entity label</th>
                  <th>Entity type</th>
                  <th>Field</th>
                  <th>Message</th>
                  <th>Recommendation</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {issuePage?.items.map((issue) => (
                  <tr key={issue.id}>
                    <td>
                      <span
                        className={`ds-quality-severity ds-quality-severity--${issue.severity}`}
                      >
                        {issue.severity}
                      </span>
                    </td>
                    <td>{labelFromValue(issue.category)}</td>
                    <td className="ds-table__headword">
                      {issue.entityLabel ?? issue.entityId}
                    </td>
                    <td className="ds-table__muted">
                      {labelFromValue(issue.entityType)}
                    </td>
                    <td>{issue.field ? labelFromValue(issue.field) : "-"}</td>
                    <td className="ds-quality-table__message">
                      {issue.message}
                    </td>
                    <td className="ds-quality-table__message">
                      {issue.recommendation ?? "-"}
                    </td>
                    <td>
                      <div className="ds-quality-actions">
                        <button
                          type="button"
                          className="ds-quality-icon-btn"
                          onClick={() => openIssueTarget(issue)}
                          disabled={!issue.navigationTarget}
                          title={
                            issue.navigationTarget?.label ??
                            "No direct editor target"
                          }
                        >
                          <ExternalLink size={14} aria-hidden="true" />
                          <span>
                            {issue.navigationTarget?.label ?? "Locate"}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="ds-quality-placeholder-btn"
                          disabled
                          title="Reviewed state requires persistent issue storage"
                        >
                          Reviewed
                        </button>
                        <button
                          type="button"
                          className="ds-quality-placeholder-btn"
                          disabled
                          title="Ignore state requires persistent issue storage"
                        >
                          Ignore
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ds-pagination">
            <span>
              {issuePage?.total.toLocaleString()} issues
              {summary?.lastScanTime
                ? ` / last scan ${summary.lastScanTime}`
                : ""}
            </span>
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

      {summary && summary.topIssueTypes.length > 0 && (
        <div className="ds-quality-top-types">
          <span>Top issue types</span>
          {summary.topIssueTypes.map((item) => (
            <span key={item.issueType}>
              {item.label}: {item.count.toLocaleString()}
            </span>
          ))}
        </div>
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
