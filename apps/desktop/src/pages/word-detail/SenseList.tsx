import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Badge, Button, Card } from "@/components/ui";
import { cn } from "@/lib/utils";

import type { WordSense } from "./types";

interface SenseListProps {
  senses: WordSense[];
}

export function SenseList({ senses }: SenseListProps) {
  const [showMore, setShowMore] = useState(false);
  const commonSenses = senses.filter((sense) => sense.common);
  const extraSenses = senses.filter((sense) => !sense.common);
  const visibleSenses = showMore ? senses : commonSenses;

  return (
    <div className="sense-list">
      {visibleSenses.map((sense, index) => (
        <Card className="sense-card" key={sense.id} variant="compact">
          <div className="sense-card__index">{index + 1}</div>
          <div className="sense-card__content">
            <div className="sense-card__header">
              <div>
                <h3>{sense.label}</h3>
                <p>{sense.register}</p>
              </div>
              <Badge variant={sense.common ? "default" : "muted"}>
                {sense.common ? "Common" : "More"}
              </Badge>
            </div>
            <div className="sense-card__definitions">
              <strong>{sense.definitionVi}</strong>
              <p>{sense.definitionEn}</p>
            </div>
            <div className="sense-card__examples">
              {sense.examples.map((example) => (
                <blockquote key={example.en}>
                  <p>{example.en}</p>
                  <cite>{example.vi}</cite>
                </blockquote>
              ))}
            </div>
          </div>
        </Card>
      ))}

      {extraSenses.length > 0 && (
        <Button
          className="sense-list__toggle"
          type="button"
          variant="soft"
          onClick={() => setShowMore((current) => !current)}
        >
          <ChevronDown
            className={cn("sense-list__chevron", showMore && "is-open")}
            size={16}
            aria-hidden="true"
          />
          {showMore
            ? "Show common meanings only"
            : `Show ${extraSenses.length} more senses`}
        </Button>
      )}
    </div>
  );
}
