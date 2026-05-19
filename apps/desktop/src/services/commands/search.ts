import { invoke } from "@/services/tauri";

export type SearchResultType = "word" | "deck";

export interface SearchFilters {
  resultTypes?: SearchResultType[];
  deckId?: number | null;
  limit?: number;
}

export interface SearchResult {
  resultType: SearchResultType;
  id: number;
  title: string;
  subtitle: string | null;
  snippet: string | null;
  deckTitle: string | null;
  packTitle: string | null;
  score: number;
  route: string;
}

export interface SearchResultGroup {
  resultType: SearchResultType;
  label: string;
  results: SearchResult[];
}

export interface SearchResponse {
  query: string;
  groups: SearchResultGroup[];
  total: number;
  elapsedMs: number;
}

export function search(
  query: string,
  filters: SearchFilters | null = null,
): Promise<SearchResponse> {
  return invoke<SearchResponse>("search", { query, filters });
}
