import { motion } from "framer-motion";
import { BookPlus, Layers3 } from "lucide-react";

import { Badge, Button, Card } from "@/components/ui";
import { cn } from "@/lib/utils";

import type { CatalogDeck } from "./types";

interface CatalogCardProps {
  deck: CatalogDeck;
  featured?: boolean;
}

export function CatalogCard({ deck, featured = false }: CatalogCardProps) {
  return (
    <motion.article whileHover={{ y: -4 }} transition={{ duration: 0.16 }}>
      <Card
        className={cn("catalog-card", featured && "catalog-card--featured")}
        variant="interactive"
      >
        <div
          className={cn(
            "catalog-card__cover",
            `catalog-card__cover--${deck.tone}`,
          )}
        >
          <div>
            <p>{deck.level}</p>
            <h3>{deck.title}</h3>
          </div>
          {featured && <Badge variant="muted">Featured</Badge>}
        </div>
        <div className="catalog-card__body">
          <p className="catalog-card__meta">
            <Layers3 size={13} aria-hidden="true" />
            {deck.wordCount.toLocaleString()} words
          </p>
          <p className="catalog-card__description">{deck.description}</p>
          <div className="catalog-card__tags" aria-label={`${deck.title} tags`}>
            {deck.tags.map((tag) => (
              <Badge key={tag} variant="muted">
                {tag}
              </Badge>
            ))}
          </div>
          <Button
            className="catalog-card__action"
            type="button"
            variant={featured ? "primary" : "secondary"}
          >
            <BookPlus size={15} aria-hidden="true" />
            Add to Library
          </Button>
        </div>
      </Card>
    </motion.article>
  );
}
