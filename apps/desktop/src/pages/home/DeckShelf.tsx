import { motion } from "framer-motion";

import { SectionHeader } from "@/components/ui";

import { DeckCard } from "./DeckCard";
import type { DeckCardData } from "./types";

interface DeckShelfProps {
  title: string;
  description: string;
  decks: DeckCardData[];
}

export function DeckShelf({ decks, description, title }: DeckShelfProps) {
  return (
    <section className="home-shelf" aria-labelledby={`${title}-heading`}>
      <SectionHeader title={title} description={description} />
      <motion.div
        className="home-shelf__row"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: {
            transition: { staggerChildren: 0.05 },
          },
        }}
      >
        {decks.map((deck) => (
          <motion.div
            key={deck.id}
            variants={{
              hidden: { opacity: 0, y: 12 },
              show: { opacity: 1, y: 0 },
            }}
          >
            <DeckCard deck={deck} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
