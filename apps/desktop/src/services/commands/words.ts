import { invoke } from "@tauri-apps/api/core";

export interface WordExampleDto {
  id: number;
  sentenceEn: string;
  sentenceVi: string | null;
  audioPath: string | null;
}

export interface WordSenseDto {
  id: number;
  senseIndex: number;
  definitionEn: string;
  definitionVi: string | null;
  register: string | null;
  domain: string | null;
  examples: WordExampleDto[];
}

export interface WordPronunciationDto {
  id: number;
  dialect: string;
  audioPath: string;
  ttsEngine: string | null;
}

export interface WordRelationDto {
  id: number;
  relationType: string;
  wordId: number;
  headword: string;
}

export interface WordReviewStateDto {
  state: string;
  due: string;
  reps: number;
  lapses: number;
  lastReview: string | null;
}

export interface WordReviewLogDto {
  id: number;
  rating: number;
  result: string;
  mode: string;
  reviewedAt: string;
}

export interface WordDetailDto {
  id: number;
  headword: string;
  partOfSpeech: string | null;
  ipaUk: string | null;
  ipaUs: string | null;
  frequencyRank: number | null;
  cefrLevel: string | null;
  packName: string | null;
  packSlug: string | null;
  senses: WordSenseDto[];
  pronunciations: WordPronunciationDto[];
  relations: WordRelationDto[];
  reviewState: WordReviewStateDto | null;
  reviewHistory: WordReviewLogDto[];
}

export function getWordDetail(wordId: number): Promise<WordDetailDto> {
  return invoke<WordDetailDto>("get_word_detail", { wordId });
}
