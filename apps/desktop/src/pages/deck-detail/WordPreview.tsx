import { Badge, Card, SectionHeader } from "@/components/ui";

import type { PreviewWord } from "./types";

interface WordPreviewProps {
  words: PreviewWord[];
}

export function WordPreview({ words }: WordPreviewProps) {
  return (
    <section className="deck-detail-section" aria-label="Word preview">
      <SectionHeader
        title="Word Preview"
        description="Sample vocabulary entries from this deck."
      />
      <Card className="word-preview" variant="glass">
        <div className="word-preview__header">
          <span>Word</span>
          <span>Vietnamese meaning</span>
          <span>Status</span>
        </div>
        <div className="word-preview__list">
          {words.map((word) => (
            <article className="word-preview__row" key={word.headword}>
              <div>
                <h3>{word.headword}</h3>
                <p>
                  {word.partOfSpeech} / {word.level}
                </p>
              </div>
              <div>
                <strong>{word.definitionVi}</strong>
                <p>{word.example}</p>
              </div>
              <Badge
                variant={word.dueState === "Due today" ? "warning" : "muted"}
              >
                {word.dueState}
              </Badge>
            </article>
          ))}
        </div>
      </Card>
    </section>
  );
}
