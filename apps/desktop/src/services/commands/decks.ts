import { invoke } from "@tauri-apps/api/core";

export interface DiscoverDeckDto {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  level: string | null;
  wordCount: number;
  tags: string[];
  sampleWords?: string[];
  packName: string;
  packSlug: string;
  installed: boolean;
}

export interface DiscoverDecksDto {
  decks: DiscoverDeckDto[];
  total: number;
}

export interface LibraryDeckDto {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  level: string | null;
  wordCount: number;
  tags: string[];
  sampleWords?: string[];
  packName: string;
  packSlug: string;
  installedAt: string;
  masteredCount: number;
  dueCount: number;
  accuracy: number;
  lastStudied: string | null;
  progress: number;
}

export interface LibraryDecksDto {
  decks: LibraryDeckDto[];
  total: number;
}

export interface DeckPreviewWordDto {
  id: number;
  headword: string;
  partOfSpeech: string | null;
  level: string | null;
  definitionEn: string | null;
  definitionVi: string | null;
  example: string | null;
  dueState: "Due today" | "Learning" | "Mastered" | "New";
}

export interface DeckDetailProgressDto {
  masteredCount: number;
  dueCount: number;
  accuracy: number;
  lastStudied: string | null;
  progress: number;
}

export interface DeckDetailDto {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  level: string | null;
  wordCount: number;
  tags: string[];
  packName: string;
  packSlug: string;
  banner: string | null;
  installed: boolean;
  installedAt: string | null;
  progress: DeckDetailProgressDto;
  words: DeckPreviewWordDto[];
}

export function listDiscoverDecks(): Promise<DiscoverDecksDto> {
  return invoke<DiscoverDecksDto>("list_discover_decks");
}

export function listLibraryDecks(): Promise<LibraryDecksDto> {
  return invoke<LibraryDecksDto>("list_library_decks");
}

export function getDeckDetail(deckId: number): Promise<DeckDetailDto> {
  return invoke<DeckDetailDto>("get_deck_detail", { deckId });
}

export function installDeck(deckId: number): Promise<void> {
  return invoke<void>("install_deck", { deckId });
}

export function uninstallDeck(deckId: number): Promise<void> {
  return invoke<void>("uninstall_deck", { deckId });
}
