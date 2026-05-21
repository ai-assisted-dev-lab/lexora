import { ExternalLink, FileSearch, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  adminListDataQualityIssues,
  adminRunDataQualityScan,
  type DataQualityIssue,
  type DataQualityIssuePage,
  type DataQualitySeverity,
} from "@/services/commands/admin";
import { formatTauriError } from "@/services/tauri";
import { useAuth } from "@/store/authContext";

import { VocabularyDetailDrawer } from "./VocabularyView";

const PAGE_SIZE = 25;

const SEVERITY_OPTIONS: Array<{ value: DataQualitySeverity; label: string }> = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

function labelFromValue(value: string | null | undefined) {
  if (!value) return "All";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function ProvenanceView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [issuePage, setIssuePage] = useState<DataQualityIssuePage | null>(null);
  const [severity, setSeverity] = useState<DataQualitySeverity | "">("");
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
      category: "provenance" as const,
      ...(severity ? { severity } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
    }),
    [page, search, severity],
  );

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    adminListDataQualityIssues(listInput)
      .then((nextPage) => {
        if (!cancelled) setIssuePage(nextPage);
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
          Owner access is required to view the provenance audit.
        </div>
      </div>
    );
  }

  const runScan = async () => {
    setIsScanning(true);
    setError(null);
    setStatus(null);
    try {
      const result = await adminRunDataQualityScan({
        categories: ["provenance"],
        ...(severity ? { severity: [severity] } : {}),
        limit: PAGE_SIZE,
      });
      setStatus(
        `Provenance scan completed. ${result.totalIssues.toLocaleString()} entries flagged.`,
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
          <h3>Provenance Audit</h3>
          <p>
            Track where each vocabulary entry came from. Missing source pack
            references, suspicious imports, and undocumented edits land here.
          </p>
        </div>
        <div className="ds-validation-header__meta">
          <FileSearch size={16} aria-hidden="true" />
          <span>Owner-only source-of-truth audit</span>
        </div>
      </div>

      <div className="ds-quality-toolbar" role="search">
        <label className="ds-field ds-field--grow" htmlFor="prov-search">
          <span className="ds-field__label">Search entries</span>
          <input
            id="prov-search"
            className="ds-input"
            value={search}
            onChange={(event) => resetPage(() => setSearch(event.target.value))}
            placeholder="Headword or message…"
          />
        </label>

        <label className="ds-field" htmlFor="prov-severity">
          <span className="ds-field__label">Severity</span>
          <select
            id="prov-severity"
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
            <FileSearch size={14} aria-hidden="true" />
          )}
          Run provenance scan
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
          Loading provenance entries…
        </div>
      ) : !hasIssues && !error ? (
        <div className="ds-quality-empty">
          <FileSearch size={28} aria-hidden="true" />
          <h3>Provenance is clean</h3>
          <p>
            Every entry in the current filter has a recorded source pack and a
            traceable edit history.
          </p>
        </div>
      ) : (
        <>
          <div className="ds-table-wrap ds-quality-table-wrap">
            <table
              className="ds-table ds-quality-table"
              aria-label="Provenance issues"
            >
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Entity</th>
                  <th>Field</th>
                  <th>Issue</th>
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
                    <td className="ds-table__headword">
                      {issue.entityLabel ?? issue.entityId}
                    </td>
                    <td>{issue.field ? labelFromValue(issue.field) : "-"}</td>
                    <td className="ds-quality-table__message">
                      {issue.message}
                    </td>
                    <td className="ds-quality-table__message">
                      {issue.recommendation ?? "-"}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ds-quality-icon-btn"
                        onClick={() => openIssueTarget(issue)}
                        disabled={!issue.navigationTarget}
                      >
                        <ExternalLink size={14} aria-hidden="true" />
                        <span>{issue.navigationTarget?.label ?? "Locate"}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ds-pagination">
            <span>{issuePage?.total.toLocaleString()} entries</span>
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
