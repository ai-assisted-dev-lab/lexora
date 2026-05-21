import "./PronunciationPanel.css";

import { Loader2, Square, Volume2, VolumeX } from "lucide-react";

import { Card } from "@/components/ui";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { usePronunciationSettings } from "@/hooks/usePronunciationSettings";
import type { PronunciationSettings } from "@/services/commands/settings";
import type { WordPronunciationDto } from "@/services/commands/words";

function stripDelimiters(ipa: string): string {
  return ipa.replace(/^[/[|]+|[/\]|]+$/g, "");
}

function countSyllables(ipa: string): number {
  return stripDelimiters(ipa).split(".").length;
}

function detectStress(ipa: string): string | null {
  const hasPrimary = ipa.includes("Ëˆ");
  const hasSecondary = ipa.includes("ËŒ");
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

interface AudioRecordCardProps {
  fallbackText: string;
  record: WordPronunciationDto;
  settings: PronunciationSettings;
}

function AudioRecordCard({
  fallbackText,
  record,
  settings,
}: AudioRecordCardProps) {
  const { state, play, stop } = useAudioPlayer();

  function handleToggle() {
    if (state === "playing") {
      stop();
    } else {
      void play({ audioPath: record.audioPath, fallbackText, settings });
    }
  }

  const isPlaying = state === "playing";
  const isLoading = state === "loading";

  return (
    <Card className="pronunciation-panel__audio-record" variant="compact">
      <button
        className="pronunciation-panel__play-btn"
        type="button"
        aria-label={`${isPlaying ? "Stop" : "Play"} ${record.dialect.toUpperCase()} pronunciation`}
        disabled={isLoading}
        onClick={handleToggle}
      >
        {isLoading ? (
          <Loader2
            size={18}
            className="pronunciation-panel__spinner"
            aria-hidden="true"
          />
        ) : isPlaying ? (
          <Square size={18} aria-hidden="true" />
        ) : state === "error" ? (
          <VolumeX size={18} aria-hidden="true" />
        ) : (
          <Volume2 size={18} aria-hidden="true" />
        )}
      </button>
      <div className="pronunciation-panel__audio-info">
        <strong>{record.dialect.toUpperCase()} audio</strong>
        <p>{record.audioPath}</p>
        {record.ttsEngine && (
          <p className="pronunciation-panel__audio-engine">
            {record.ttsEngine}
          </p>
        )}
        {state === "error" && (
          <p className="pronunciation-panel__audio-error">
            Local audio and TTS fallback are unavailable.
          </p>
        )}
      </div>
    </Card>
  );
}

interface FallbackAudioCardProps {
  fallbackText: string;
  settings: PronunciationSettings;
}

function FallbackAudioCard({ fallbackText, settings }: FallbackAudioCardProps) {
  const { state, play, stop } = useAudioPlayer();

  function handleToggle() {
    if (state === "playing") {
      stop();
    } else {
      void play({ fallbackText, settings });
    }
  }

  const isPlaying = state === "playing";
  const isLoading = state === "loading";

  return (
    <Card className="pronunciation-panel__audio-record" variant="compact">
      <button
        className="pronunciation-panel__play-btn"
        type="button"
        aria-label={`${isPlaying ? "Stop" : "Play"} TTS fallback`}
        disabled={isLoading}
        onClick={handleToggle}
      >
        {isLoading ? (
          <Loader2
            size={18}
            className="pronunciation-panel__spinner"
            aria-hidden="true"
          />
        ) : isPlaying ? (
          <Square size={18} aria-hidden="true" />
        ) : state === "error" ? (
          <VolumeX size={18} aria-hidden="true" />
        ) : (
          <Volume2 size={18} aria-hidden="true" />
        )}
      </button>
      <div className="pronunciation-panel__audio-info">
        <strong>TTS fallback</strong>
        <p>Uses the configured browser/OS voice when local audio is missing.</p>
        {state === "error" && (
          <p className="pronunciation-panel__audio-error">
            TTS fallback is disabled or unavailable.
          </p>
        )}
      </div>
    </Card>
  );
}

export interface PronunciationPanelProps {
  headword: string;
  ipaUk: string | null | undefined;
  ipaUs: string | null | undefined;
  pronunciations: WordPronunciationDto[];
}

export function PronunciationPanel({
  headword,
  ipaUk,
  ipaUs,
  pronunciations,
}: PronunciationPanelProps) {
  const { settings } = usePronunciationSettings();
  const orderedPronunciations = [...pronunciations].sort((a, b) => {
    const preferred = settings.pronunciationAccent;
    if (preferred === "neutral") return a.id - b.id;
    if (a.dialect === preferred && b.dialect !== preferred) return -1;
    if (b.dialect === preferred && a.dialect !== preferred) return 1;
    return a.id - b.id;
  });

  return (
    <div className="pronunciation-panel">
      <div className="pronunciation-panel__accents">
        <AccentBlock label="British English (UK)" ipa={ipaUk} />
        <AccentBlock label="American English (US)" ipa={ipaUs} />
      </div>

      <div className="pronunciation-panel__audio">
        <p className="pronunciation-panel__audio-header">Audio records</p>
        {orderedPronunciations.length === 0 ? (
          <FallbackAudioCard fallbackText={headword} settings={settings} />
        ) : (
          orderedPronunciations.map((record) => (
            <AudioRecordCard
              key={record.id}
              fallbackText={headword}
              record={record}
              settings={settings}
            />
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
