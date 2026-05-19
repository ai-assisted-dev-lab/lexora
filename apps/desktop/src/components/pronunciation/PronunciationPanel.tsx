import "./PronunciationPanel.css";

import { Volume2 } from "lucide-react";

import { Card } from "@/components/ui";
import type { WordPronunciationDto } from "@/services/commands/words";

function stripDelimiters(ipa: string): string {
  return ipa.replace(/^[/[|]+|[/\]|]+$/g, "");
}

function countSyllables(ipa: string): number {
  return stripDelimiters(ipa).split(".").length;
}

function detectStress(ipa: string): string | null {
  const hasPrimary = ipa.includes("ˈ"); // ˈ primary stress
  const hasSecondary = ipa.includes("ˌ"); // ˌ secondary stress
  if (hasPrimary && hasSecondary) return "Primary & secondary stress";
  if (hasPrimary) return "Primary stress";
  if (hasSecondary) return "Secondary stress";
  return null;
}

interface AccentBlockProps {
  label: string;
  ipa: string | null | undefined;
}

function AccentBlock({ label, ipa }: AccentBlockProps) {
  const syllableCount = ipa ? countSyllables(ipa) : null;
  const stress = ipa ? detectStress(ipa) : null;

  return (
    <div className="accent-block">
      <span className="accent-block__label">{label}</span>
      {ipa ? (
        <>
          <span className="accent-block__ipa">{ipa}</span>
          <div className="accent-block__meta">
            <span>
              {syllableCount} syllable{syllableCount !== 1 ? "s" : ""}
            </span>
            {stress && <span>{stress}</span>}
          </div>
        </>
      ) : (
        <span className="accent-block__missing">Not available</span>
      )}
    </div>
  );
}

export interface PronunciationPanelProps {
  ipaUk: string | null | undefined;
  ipaUs: string | null | undefined;
  pronunciations: WordPronunciationDto[];
}

export function PronunciationPanel({
  ipaUk,
  ipaUs,
  pronunciations,
}: PronunciationPanelProps) {
  return (
    <div className="pronunciation-panel">
      <div className="pronunciation-panel__accents">
        <AccentBlock label="British English (UK)" ipa={ipaUk} />
        <AccentBlock label="American English (US)" ipa={ipaUs} />
      </div>

      <div className="pronunciation-panel__audio">
        <p className="pronunciation-panel__audio-header">Audio records</p>
        {pronunciations.length === 0 ? (
          <p className="pronunciation-panel__audio-empty">
            No local audio metadata has been assigned yet.
          </p>
        ) : (
          pronunciations.map((record) => (
            <Card
              key={record.id}
              className="pronunciation-panel__audio-record"
              variant="compact"
            >
              <Volume2 size={18} aria-hidden="true" />
              <div>
                <strong>{record.dialect.toUpperCase()} audio</strong>
                <p>{record.audioPath}</p>
                {record.ttsEngine && (
                  <p className="pronunciation-panel__audio-engine">
                    {record.ttsEngine}
                  </p>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export interface CompactIPAProps {
  ipaUk: string | null | undefined;
  ipaUs: string | null | undefined;
}

export function CompactIPA({ ipaUk, ipaUs }: CompactIPAProps) {
  if (!ipaUk && !ipaUs) return null;

  return (
    <span className="compact-ipa">
      {ipaUk && (
        <span className="compact-ipa__chip compact-ipa__chip--uk">
          UK {ipaUk}
        </span>
      )}
      {ipaUs && (
        <span className="compact-ipa__chip compact-ipa__chip--us">
          US {ipaUs}
        </span>
      )}
    </span>
  );
}
