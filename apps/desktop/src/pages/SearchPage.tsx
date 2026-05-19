import "./search/SearchPage.css";

import { BookOpen, ChevronRight, Layers3, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { Badge, Card, EmptyState, SectionHeader } from "@/components/ui";
import {
  search as runSearch,
  type SearchResponse,
  type SearchResult,
  type SearchResultType,
} from "@/services/commands/search";
import { formatTauriError } from "@/services/tauri";

function iconFor(type: SearchResultType) {
  return type === "deck" ? (
    <Layers3 size={18} aria-hidden="true" />
  ) : (
    <BookOpen size={18} aria-hidden="true" />
  );
}

function ResultRow({ result }: { result: SearchResult }) {
  return (
    <Link className="search-result-row" to={result.route}>
      <div className="search-result-row__icon">{iconFor(result.resultType)}</div>
      <div className="search-result-row__body">
        <div className="search-result-row__title-line">
          <strong>{result.title}</strong>
          {result.subtitle && <span>{result.subtitle}</span>}
        </div>
        {result.snippet && <p>{result.snippet}</p>}
        <div className="search-result-row__meta">
          {result.deckTitle && <Badge variant="muted">{result.deckTitle}</Badge>}
          {result.packTitle && <Badge variant="muted">{result.packTitle}</Badge>}
          <span>{Math.round(result.score)} relevance</span>
        </div>
      </div>
      <ChevronRight size={16} aria-hidden="true" />
    </Link>
  );
}

export function SearchPage() {
  const [params] = useSearchParams();
  const query = useMemo(() => params.get("q")?.trim() ?? "", [params]);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!query) {
      setResponse(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    runSearch(query, { limit: 30 })
      .then((result) => {
        if (!cancelled) setResponse(result);
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
  }, [query]);

  return (
    <div className="search-page">
      <SectionHeader
        title="Search"
        description="Offline results from the local vocabulary index."
      />

      {!query && (
        <Card className="search-state-card" variant="glass">
          <EmptyState
            title="Start with the search bar"
            description="Search words, Vietnamese meanings, deck names, topics, and tags."
            icon={<Search size={28} aria-hidden="true" />}
          />
        </Card>
      )}

      {query && (
        <div className="search-page__summary" role="status">
          {isLoading ? (
            <>
              <Loader2 size={16} className="search-page__spinner" aria-hidden="true" />
              Searching for <strong>{query}</strong>
            </>
          ) : response ? (
            <>
              <strong>{response.total}</strong> results for <strong>{response.query}</strong>
              <span>{response.elapsedMs} ms</span>
            </>
          ) : (
            <>Search results for <strong>{query}</strong></>
          )}
        </div>
      )}

      {error && (
        <Card className="search-state-card" variant="glass">
          <EmptyState
            title="Search failed"
            description={error}
            icon={<Search size={28} aria-hidden="true" />}
          />
        </Card>
      )}

      {!isLoading && response && response.total === 0 && (
        <Card className="search-state-card" variant="glass">
          <EmptyState
            title="No results"
            description="Try a shorter word, a deck topic, or a Vietnamese meaning."
            icon={<Search size={28} aria-hidden="true" />}
          />
        </Card>
      )}

      {response && response.total > 0 && (
        <div className="search-page__groups">
          {response.groups.map((group) => (
            <Card className="search-result-group" key={group.resultType} variant="glass">
              <div className="search-result-group__header">
                <h2>{group.label}</h2>
                <Badge variant="muted">{group.results.length}</Badge>
              </div>
              <div className="search-result-group__list">
                {group.results.map((result) => (
                  <ResultRow
                    key={`${result.resultType}-${result.id}`}
                    result={result}
                  />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
