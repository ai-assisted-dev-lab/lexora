import { SectionHeader } from "@/components/ui";

import { InstalledDeckCard } from "./InstalledDeckCard";
import type { InstalledDeck } from "./types";

interface LibraryShelfProps {
  decks: InstalledDeck[];
  dense?: boolean;
  description?: string;
  title: string;
}

function LibraryShelfRoot({
  decks,
  dense = false,
  description,
  title,
}: LibraryShelfProps) {
  return (
    <section className="library-shelf" aria-label={title}>
      <SectionHeader title={title} description={description} />
      <div className="library-grid">
        {decks.map((deck) => (
          <InstalledDeckCard compact={dense} deck={deck} key={deck.id} />
        ))}
      </div>
    </section>
  );
}

export const LibraryShelf = Object.assign(LibraryShelfRoot, {
  Card: InstalledDeckCard,
});
