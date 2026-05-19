export type WordDetailTab =
  | "overview"
  | "pronunciation"
  | "usage"
  | "network"
  | "history"
  | "notes";

export interface WordSense {
  id: string | number;
  label: string;
  register: string;
  definitionEn: string;
  definitionVi: string;
  examples: Array<{
    en: string;
    vi: string;
  }>;
  common: boolean;
}

export interface WordDetailMock {
  headword: string;
  itemType: string;
  level: string;
  syllables: number;
  stress: string;
  ipa: {
    uk: string;
    us: string;
  };
  primaryVietnameseMeaning: string;
  tags: string[];
  mastery: number;
  reviewStatus: string;
  senses: WordSense[];
  pronunciationNotes: Array<{
    label: string;
    value: string;
  }>;
  collocations: string[];
  commonMistakes: string[];
  synonyms: string[];
  antonyms: string[];
  relatedWords: string[];
  reviewHistory: Array<{
    date: string;
    result: string;
    detail: string;
  }>;
  note: string;
}

export interface PronunciationNote {
  label: string;
  value: string;
}
