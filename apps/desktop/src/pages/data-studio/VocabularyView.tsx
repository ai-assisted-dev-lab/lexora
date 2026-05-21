import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Save,
  Search,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/ui";
import { useAdminVocabulary } from "@/hooks/useAdminVocabulary";
import type {
  AdminCefrLevel,
  AdminReviewStatus,
  AdminVocabularyDetail,
  AdminVocabularyListInput,
  AdminVocabularyListItem,
  AdminVocabularyPatch,
  AdminWordType,
} from "@/services/commands/admin";
import {
  adminGetVocabularyItem,
  adminUpdateVocabularyItem,
} from "@/services/commands/admin";
import { formatTauriError } from "@/services/tauri";

const TYPES: AdminWordType[] = [
  "word",
  "phrase",
  "idiom",
  "phrasal_verb",
  "collocation",
];

const CEFR_LEVELS: AdminCefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const REVIEW_STATUSES: AdminReviewStatus[] = [
  "verified",
  "unverified",
  "needs_review",
  "rejected",
  "draft",
];

const TYPE_LABEL: Record<AdminWordType, string> = {
  word: "Word",
  phrase: "Phrase",
  idiom: "Idiom",
  phrasal_verb: "Phrasal verb",
  collocation: "Collocation",
};

const STATUS_LABEL: Record<AdminReviewStatus, string> = {
  verified: "Verified",
  unverified: "Unverified",
  needs_review: "Needs review",
  rejected: "Rejected",
  draft: "Draft",
};

function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function VocabularyView() {
  const [search, setSearch] = useState<string>("");
  const [type, setType] = useState<AdminWordType | "">("");
  const [cefr, setCefr] = useState<AdminCefrLevel | "">("");
  const [status, setStatus] = useState<AdminReviewStatus | "">("");
  const [missingIpa, setMissingIpa] = useState(false);
  const [missingAudio, setMissingAudio] = useState(false);
  const [missingExample, setMissingExample] = useState(false);
  const [missingMeaning, setMissingMeaning] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [activeId, setActiveId] = useState<number | null>(null);

  const debouncedSearch = useDebounced(search, 250);

  // Reset to page 1 whenever a filter or search term changes.
  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    type,
    cefr,
    status,
    missingIpa,
    missingAudio,
    missingExample,
    missingMeaning,
  ]);

  const input: AdminVocabularyListInput = useMemo(
    () => ({
      page,
      pageSize,
      search: debouncedSearch || undefined,
      type: type || undefined,
      cefrLevel: cefr || undefined,
      reviewStatus: status || undefined,
      missingIpa: missingIpa || undefined,
      missingAudio: missingAudio || undefined,
      missingExample: missingExample || undefined,
      missingMeaning: missingMeaning || undefined,
    }),
    [
      page,
      pageSize,
      debouncedSearch,
      type,
      cefr,
      status,
      missingIpa,
      missingAudio,
      missingExample,
      missingMeaning,
    ],
  );

  const { data, isLoading, error, refetch } = useAdminVocabulary(input);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const allVisibleSelected =
    items.length > 0 && items.every((it) => selectedIds.has(it.id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        items.forEach((it) => next.delete(it.id));
      } else {
        items.forEach((it) => next.add(it.id));
      }
      return next;
    });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  return (
    <div className="ds-panel__inner">
      {/* Filters */}
      <div className="ds-filters" role="search" aria-label="Vocabulary filters">
        <div className="ds-field ds-field--grow">
          <label className="ds-field__label" htmlFor="ds-search">
            Headword
          </label>
          <div style={{ position: "relative" }}>
            <Search
              size={14}
              aria-hidden="true"
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-text-subtle)",
              }}
            />
            <input
              id="ds-search"
              className="ds-input"
              type="search"
              placeholder="Search headwords…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 30, width: "100%" }}
            />
          </div>
        </div>

        <div className="ds-field">
          <label className="ds-field__label" htmlFor="ds-type">
            Type
          </label>
          <select
            id="ds-type"
            className="ds-select"
            value={type}
            onChange={(e) => setType(e.target.value as AdminWordType | "")}
          >
            <option value="">All types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>

        <div className="ds-field">
          <label className="ds-field__label" htmlFor="ds-cefr">
            CEFR
          </label>
          <select
            id="ds-cefr"
            className="ds-select"
            value={cefr}
            onChange={(e) => setCefr(e.target.value as AdminCefrLevel | "")}
          >
            <option value="">Any level</option>
            {CEFR_LEVELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="ds-field">
          <label className="ds-field__label" htmlFor="ds-status">
            Review status
          </label>
          <select
            id="ds-status"
            className="ds-select"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as AdminReviewStatus | "")
            }
          >
            <option value="">All statuses</option>
            {REVIEW_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="ds-checks">
          <MissingCheckbox
            label="Missing IPA"
            checked={missingIpa}
            onChange={setMissingIpa}
          />
          <MissingCheckbox
            label="Missing audio"
            checked={missingAudio}
            onChange={setMissingAudio}
          />
          <MissingCheckbox
            label="Missing example"
            checked={missingExample}
            onChange={setMissingExample}
          />
          <MissingCheckbox
            label="Missing meaning"
            checked={missingMeaning}
            onChange={setMissingMeaning}
          />
        </div>
      </div>

      {/* Selection toolbar */}
      {selectedIds.size > 0 && (
        <div className="ds-selection-bar" role="status" aria-live="polite">
          <strong>{selectedIds.size}</strong> selected
          <div className="ds-selection-bar__actions">
            <button
              type="button"
              className="ds-selection-bar__btn"
              disabled
              title="Batch actions arrive in a later prompt"
            >
              Set status
            </button>
            <button
              type="button"
              className="ds-selection-bar__btn"
              disabled
              title="Batch actions arrive in a later prompt"
            >
              Add tag
            </button>
            <button
              type="button"
              className="ds-selection-bar__btn"
              disabled
              title="Batch actions arrive in a later prompt"
            >
              Assign deck
            </button>
            <button
              type="button"
              className="ds-selection-bar__btn"
              disabled
              title="Batch actions arrive in a later prompt"
            >
              Mark verified
            </button>
            <button
              type="button"
              className="ds-selection-bar__btn"
              onClick={clearSelection}
              style={{ cursor: "pointer", opacity: 1 }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {error ? (
        <div className="ds-error" role="alert">
          {error}
        </div>
      ) : isLoading && !data ? (
        <div className="ds-loading">
          <Loader2 size={16} className="ds-spin" aria-hidden="true" /> Loading
          vocabulary…
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No vocabulary matches"
          description="Try clearing a filter or broadening the search."
        />
      ) : (
        <div className="ds-table-wrap">
          <table className="ds-table" aria-label="Vocabulary records">
            <thead>
              <tr>
                <th className="ds-table__check" scope="col">
                  <input
                    type="checkbox"
                    aria-label="Select all rows on this page"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th scope="col">Headword</th>
                <th scope="col">Type</th>
                <th scope="col">POS</th>
                <th scope="col">CEFR</th>
                <th scope="col">Vietnamese meaning</th>
                <th scope="col">English definition</th>
                <th scope="col">Status</th>
                <th scope="col">Missing</th>
                <th scope="col">Decks</th>
                <th scope="col">Updated</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <VocabularyRow
                  key={item.id}
                  item={item}
                  selected={selectedIds.has(item.id)}
                  active={activeId === item.id}
                  onToggle={() => toggleSelect(item.id)}
                  onOpen={() => setActiveId(item.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && total > 0 && (
        <div className="ds-pagination" aria-label="Pagination">
          <span>
            Page <strong>{data.page}</strong> of{" "}
            <strong>{Math.max(totalPages, 1)}</strong> · {items.length} of{" "}
            {total.toLocaleString()} records
          </span>
          <div className="ds-pager-buttons">
            <button
              type="button"
              className="ds-pager-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={data.page <= 1 || isLoading}
            >
              <ChevronLeft size={14} aria-hidden="true" /> Prev
            </button>
            <button
              type="button"
              className="ds-pager-btn"
              onClick={() => setPage((p) => p + 1)}
              disabled={data.page >= totalPages || isLoading}
            >
              Next <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {activeId != null && (
        <VocabularyDetailDrawer
          id={activeId}
          onClose={() => setActiveId(null)}
          onSaved={() => {
            void refetch();
          }}
        />
      )}
    </div>
  );
}

function MissingCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className={`ds-check${checked ? " ds-check--active" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function VocabularyRow({
  item,
  selected,
  active,
  onToggle,
  onOpen,
}: {
  item: AdminVocabularyListItem;
  selected: boolean;
  active: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <tr
      aria-selected={selected}
      className={active ? "ds-row--active" : undefined}
      onClick={onOpen}
    >
      <td className="ds-table__check" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`Select ${item.headword}`}
        />
      </td>
      <td className="ds-table__headword">{item.headword}</td>
      <td>
        <span className="ds-badge ds-badge--type">
          {TYPE_LABEL[item.type] ?? item.type}
        </span>
      </td>
      <td className="ds-table__muted">{item.partOfSpeech ?? "—"}</td>
      <td className="ds-table__muted">{item.cefrLevel ?? "—"}</td>
      <td className="ds-table__muted">
        {item.primaryVietnameseMeaning ?? (
          <span style={{ opacity: 0.5 }}>—</span>
        )}
      </td>
      <td className="ds-table__muted">
        {item.primaryEnglishDefinition ?? (
          <span style={{ opacity: 0.5 }}>—</span>
        )}
      </td>
      <td>
        <span className={`ds-badge ds-badge--${item.reviewStatus}`}>
          {STATUS_LABEL[item.reviewStatus] ?? item.reviewStatus}
        </span>
      </td>
      <td>
        <MissingDots flags={item.missing} />
      </td>
      <td className="ds-table__muted">{item.deckCount}</td>
      <td className="ds-table__muted">
        <span title={item.updatedAt}>{item.updatedAt.slice(0, 10)}</span>
      </td>
    </tr>
  );
}

function MissingDots({ flags }: { flags: AdminVocabularyListItem["missing"] }) {
  const entries: {
    key: string;
    label: string;
    on: boolean;
    critical?: boolean;
  }[] = [
    {
      key: "meaning",
      label: "Vietnamese meaning",
      on: flags.meaning,
      critical: true,
    },
    {
      key: "definition",
      label: "English definition",
      on: flags.definition,
      critical: true,
    },
    { key: "example", label: "Example", on: flags.example },
    { key: "ipa", label: "IPA", on: flags.ipa },
    { key: "audio", label: "Audio", on: flags.audio },
  ];
  return (
    <div className="ds-missing-dots" aria-label="Missing data indicators">
      {entries.map((e) => (
        <span
          key={e.key}
          className={`ds-dot${e.on ? (e.critical ? " ds-dot--critical" : " ds-dot--on") : ""}`}
          title={`${e.label}: ${e.on ? "missing" : "present"}`}
        />
      ))}
    </div>
  );
}

// ── Detail drawer ──────────────────────────────────────────────────────────

interface DrawerProps {
  id: number;
  onClose: () => void;
  onSaved: () => void;
}

export function VocabularyDetailDrawer({ id, onClose, onSaved }: DrawerProps) {
  const [detail, setDetail] = useState<AdminVocabularyDetail | null>(null);
  const [form, setForm] = useState<AdminVocabularyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminGetVocabularyItem(id)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        setForm(d);
      })
      .catch((err) => {
        if (!cancelled) setError(formatTauriError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const dirty = useMemo(() => {
    if (!detail || !form) return false;
    return (
      form.headword !== detail.headword ||
      form.type !== detail.type ||
      (form.partOfSpeech ?? "") !== (detail.partOfSpeech ?? "") ||
      (form.cefrLevel ?? "") !== (detail.cefrLevel ?? "") ||
      (form.ipaUk ?? "") !== (detail.ipaUk ?? "") ||
      (form.ipaUs ?? "") !== (detail.ipaUs ?? "") ||
      form.reviewStatus !== detail.reviewStatus ||
      (form.primaryDefinitionEn ?? "") !== (detail.primaryDefinitionEn ?? "") ||
      (form.primaryDefinitionVi ?? "") !== (detail.primaryDefinitionVi ?? "") ||
      (form.primaryExampleEn ?? "") !== (detail.primaryExampleEn ?? "") ||
      (form.primaryExampleVi ?? "") !== (detail.primaryExampleVi ?? "")
    );
  }, [form, detail]);

  const setField = <K extends keyof AdminVocabularyDetail>(
    key: K,
    value: AdminVocabularyDetail[K],
  ) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const buildPatch = (): AdminVocabularyPatch => {
    if (!detail || !form) return {};
    const patch: AdminVocabularyPatch = {};
    if (form.headword !== detail.headword) patch.headword = form.headword;
    if (form.type !== detail.type) patch.type = form.type;
    if ((form.partOfSpeech ?? "") !== (detail.partOfSpeech ?? "")) {
      patch.partOfSpeech = form.partOfSpeech ?? "";
    }
    if ((form.cefrLevel ?? "") !== (detail.cefrLevel ?? "")) {
      patch.cefrLevel = (form.cefrLevel ?? "") as AdminCefrLevel | "";
    }
    if ((form.ipaUk ?? "") !== (detail.ipaUk ?? "")) {
      patch.ipaUk = form.ipaUk ?? "";
    }
    if ((form.ipaUs ?? "") !== (detail.ipaUs ?? "")) {
      patch.ipaUs = form.ipaUs ?? "";
    }
    if (form.reviewStatus !== detail.reviewStatus) {
      patch.reviewStatus = form.reviewStatus;
    }
    if (
      (form.primaryDefinitionEn ?? "") !== (detail.primaryDefinitionEn ?? "")
    ) {
      patch.primaryDefinitionEn = form.primaryDefinitionEn ?? "";
    }
    if (
      (form.primaryDefinitionVi ?? "") !== (detail.primaryDefinitionVi ?? "")
    ) {
      patch.primaryDefinitionVi = form.primaryDefinitionVi ?? "";
    }
    if ((form.primaryExampleEn ?? "") !== (detail.primaryExampleEn ?? "")) {
      patch.primaryExampleEn = form.primaryExampleEn ?? "";
    }
    if ((form.primaryExampleVi ?? "") !== (detail.primaryExampleVi ?? "")) {
      patch.primaryExampleVi = form.primaryExampleVi ?? "";
    }
    return patch;
  };

  const handleSave = async () => {
    if (!form || !dirty) return;
    if (!form.headword.trim()) {
      setError("Headword cannot be empty");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await adminUpdateVocabularyItem(id, buildPatch());
      setDetail(updated);
      setForm(updated);
      setSuccess("Saved");
      onSaved();
    } catch (err) {
      setError(formatTauriError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="ds-drawer-backdrop" onClick={onClose} />
      <aside
        className="ds-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ds-drawer-title"
      >
        <header className="ds-drawer__header">
          <div>
            <h2 id="ds-drawer-title" className="ds-drawer__title">
              {form?.headword || (loading ? "Loading…" : "Vocabulary item")}
            </h2>
            <p className="ds-drawer__sub">
              {detail
                ? `ID #${detail.id}${detail.packName ? ` · ${detail.packName}` : ""} · ${detail.senseCount} sense${detail.senseCount === 1 ? "" : "s"}`
                : "Owner-only editor"}
            </p>
          </div>
          <button
            type="button"
            className="ds-drawer__close"
            aria-label="Close detail panel"
            onClick={onClose}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <div className="ds-drawer__body">
          {loading || !form ? (
            <div className="ds-loading">
              <Loader2 size={14} className="ds-spin" aria-hidden="true" />{" "}
              Loading record…
            </div>
          ) : (
            <>
              {error && (
                <div className="ds-feedback ds-feedback--error" role="alert">
                  {error}
                </div>
              )}
              {success && !dirty && (
                <div className="ds-feedback ds-feedback--success">
                  {success}
                </div>
              )}

              <div className="ds-form-section-title">Identity</div>
              <div className="ds-form-grid">
                <Field label="Headword">
                  <input
                    className="ds-input"
                    value={form.headword}
                    onChange={(e) => setField("headword", e.target.value)}
                  />
                </Field>
                <Field label="Type">
                  <select
                    className="ds-select"
                    value={form.type}
                    onChange={(e) =>
                      setField("type", e.target.value as AdminWordType)
                    }
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Part of speech">
                  <input
                    className="ds-input"
                    value={form.partOfSpeech ?? ""}
                    placeholder="e.g. noun, verb"
                    onChange={(e) => setField("partOfSpeech", e.target.value)}
                  />
                </Field>
                <Field label="CEFR level">
                  <select
                    className="ds-select"
                    value={form.cefrLevel ?? ""}
                    onChange={(e) =>
                      setField(
                        "cefrLevel",
                        e.target.value
                          ? (e.target.value as AdminCefrLevel)
                          : null,
                      )
                    }
                  >
                    <option value="">— none —</option>
                    {CEFR_LEVELS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="ds-form-section-title">Pronunciation</div>
              <div className="ds-form-grid">
                <Field label="IPA (UK)">
                  <input
                    className="ds-input"
                    value={form.ipaUk ?? ""}
                    placeholder="/əˈplaɪ/"
                    onChange={(e) => setField("ipaUk", e.target.value)}
                  />
                </Field>
                <Field label="IPA (US)">
                  <input
                    className="ds-input"
                    value={form.ipaUs ?? ""}
                    placeholder="/əˈplaɪ/"
                    onChange={(e) => setField("ipaUs", e.target.value)}
                  />
                </Field>
                <Field label="Primary audio">
                  <span
                    className="ds-input"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      color: form.primaryAudioPath
                        ? "var(--color-text)"
                        : "var(--color-text-subtle)",
                    }}
                  >
                    <Volume2 size={14} aria-hidden="true" />
                    {form.primaryAudioPath ?? "no audio attached"}
                  </span>
                </Field>
                <Field label="Pronunciation count">
                  <span
                    className="ds-input"
                    style={{ background: "transparent" }}
                  >
                    {detail?.pronunciationCount ?? 0}
                  </span>
                </Field>
              </div>

              <div className="ds-form-section-title">
                Primary sense{" "}
                {form.senseCount > 1 ? `(${form.senseCount} senses total)` : ""}
              </div>
              <div className="ds-form-grid ds-form-grid--full">
                <Field label="English definition">
                  <textarea
                    className="ds-form-group__textarea"
                    value={form.primaryDefinitionEn ?? ""}
                    onChange={(e) =>
                      setField("primaryDefinitionEn", e.target.value)
                    }
                  />
                </Field>
                <Field label="Vietnamese meaning">
                  <textarea
                    className="ds-form-group__textarea"
                    value={form.primaryDefinitionVi ?? ""}
                    onChange={(e) =>
                      setField("primaryDefinitionVi", e.target.value)
                    }
                  />
                </Field>
                <Field label="Example sentence (EN)">
                  <textarea
                    className="ds-form-group__textarea"
                    value={form.primaryExampleEn ?? ""}
                    onChange={(e) =>
                      setField("primaryExampleEn", e.target.value)
                    }
                  />
                </Field>
                <Field label="Example translation (VI)">
                  <textarea
                    className="ds-form-group__textarea"
                    value={form.primaryExampleVi ?? ""}
                    onChange={(e) =>
                      setField("primaryExampleVi", e.target.value)
                    }
                  />
                </Field>
              </div>

              <div className="ds-form-section-title">Review</div>
              <div className="ds-form-grid">
                <Field label="Status">
                  <select
                    className="ds-select"
                    value={form.reviewStatus}
                    onChange={(e) =>
                      setField(
                        "reviewStatus",
                        e.target.value as AdminReviewStatus,
                      )
                    }
                  >
                    {REVIEW_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Decks">
                  <span
                    className="ds-input"
                    style={{ background: "transparent" }}
                  >
                    {detail?.deckCount ?? 0}
                  </span>
                </Field>
              </div>
            </>
          )}
        </div>

        <footer className="ds-drawer__footer">
          {dirty && (
            <span className="ds-drawer__dirty" role="status">
              Unsaved changes
            </span>
          )}
          <button
            type="button"
            className="ds-pager-btn"
            onClick={() => {
              if (detail) setForm(detail);
              setSuccess(null);
              setError(null);
            }}
            disabled={!dirty || saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ds-pager-btn"
            onClick={handleSave}
            disabled={!dirty || saving || !form}
            style={{
              background: "var(--color-primary)",
              color: "var(--color-text-on-accent, #fff)",
              borderColor: "var(--color-primary)",
            }}
          >
            {saving ? (
              <Loader2 size={14} className="ds-spin" aria-hidden="true" />
            ) : (
              <Save size={14} aria-hidden="true" />
            )}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </footer>
      </aside>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="ds-form-group">
      <span className="ds-form-group__label">{label}</span>
      {children}
    </label>
  );
}
