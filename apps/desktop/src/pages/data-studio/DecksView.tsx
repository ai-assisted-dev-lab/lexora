import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/ui";
import { useAdminDecks } from "@/hooks/useAdminDecks";

function useDebounced<T>(value: T, delay = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function DecksView() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const debounced = useDebounced(search, 250);

  useEffect(() => {
    setPage(1);
  }, [debounced]);

  const input = useMemo(
    () => ({
      page,
      pageSize,
      search: debounced || undefined,
    }),
    [page, pageSize, debounced],
  );

  const { data, isLoading, error } = useAdminDecks(input);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="ds-panel__inner">
      <div className="ds-filters" role="search" aria-label="Deck filters">
        <div className="ds-field ds-field--grow">
          <label className="ds-field__label" htmlFor="ds-deck-search">
            Search decks
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
              id="ds-deck-search"
              className="ds-input"
              type="search"
              placeholder="By name or slug…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 30, width: "100%" }}
            />
          </div>
        </div>
      </div>

      {error ? (
        <div className="ds-error" role="alert">
          {error}
        </div>
      ) : isLoading && !data ? (
        <div className="ds-loading">
          <Loader2 size={16} className="ds-spin" aria-hidden="true" /> Loading
          decks…
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No decks found"
          description="Try a different search term or import a deck to populate the catalog."
        />
      ) : (
        <div className="ds-table-wrap">
          <table className="ds-table" aria-label="Decks">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Pack</th>
                <th scope="col">Difficulty</th>
                <th scope="col">Word count</th>
                <th scope="col">Linked words</th>
                <th scope="col">Cover</th>
                <th scope="col">Updated</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id}>
                  <td className="ds-table__headword">
                    {d.name}
                    <div
                      className="ds-table__muted"
                      style={{ fontWeight: 400 }}
                    >
                      {d.slug}
                    </div>
                  </td>
                  <td className="ds-table__muted">{d.packName ?? "—"}</td>
                  <td className="ds-table__muted">{d.difficulty ?? "—"}</td>
                  <td className="ds-table__muted">{d.wordCount}</td>
                  <td className="ds-table__muted">
                    {d.actualWordCount}
                    {d.actualWordCount !== d.wordCount && (
                      <span
                        style={{
                          marginLeft: 6,
                          color: "var(--color-warning, #b45309)",
                        }}
                        title="word_count differs from deck_words count"
                      >
                        ⚠
                      </span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`ds-badge ds-badge--${d.hasCover ? "verified" : "unverified"}`}
                    >
                      {d.hasCover ? "Set" : "None"}
                    </span>
                  </td>
                  <td className="ds-table__muted">
                    {d.updatedAt.slice(0, 10)}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="ds-selection-bar__btn"
                      disabled
                      title="Deck editing arrives in a later prompt"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && total > 0 && (
        <div className="ds-pagination" aria-label="Deck pagination">
          <span>
            Page <strong>{data.page}</strong> of{" "}
            <strong>{Math.max(totalPages, 1)}</strong> · {items.length} of{" "}
            {total.toLocaleString()} decks
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
    </div>
  );
}
