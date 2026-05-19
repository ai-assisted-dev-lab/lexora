import { invoke } from "@tauri-apps/api/core";

export interface DiscoverDeckDto {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  level: string | null;
  wordCount: number;
  tags: string[];
  packName: string;
  packSlug: string;
  installed: boolean;
}

export interface DiscoverDecksDto {
  decks: DiscoverDeckDto[];
  total: number;
}

export function listDiscoverDecks(): Promise<DiscoverDecksDto> {
  return invoke<DiscoverDecksDto>("list_discover_decks");
}

export function installDeck(deckId: number): Promise<void> {
  return invoke<void>("install_deck", { deckId });
}

export function uninstallDeck(deckId: number): Promise<void> {
  return invoke<void>("uninstall_deck", { deckId });
}
