import { invoke } from "@/services/tauri";

/** Mirrors `AdminStatsDto` from the Rust command layer. */
export interface AdminStats {
  userCount: number;
  wordCount: number;
  deckCount: number;
  packCount: number;
}

/** Owner-only: throws `AppError::Unauthorized` for learner sessions. */
export function getAdminStats(): Promise<AdminStats> {
  return invoke<AdminStats>("get_admin_stats");
}

// ── Vocabulary list ─────────────────────────────────────────────────────────

export type AdminWordType =
  | "word"
  | "phrase"
  | "idiom"
  | "phrasal_verb"
  | "collocation";

export type AdminReviewStatus =
  | "verified"
  | "unverified"
  | "needs_review"
  | "rejected"
  | "draft";

export type AdminCefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface AdminMissingFlags {
  meaning: boolean;
  definition: boolean;
  example: boolean;
  ipa: boolean;
  audio: boolean;
}

export interface AdminVocabularyListItem {
  id: number;
  headword: string;
  type: AdminWordType;
  partOfSpeech: string | null;
  cefrLevel: AdminCefrLevel | null;
  primaryVietnameseMeaning: string | null;
  primaryEnglishDefinition: string | null;
  reviewStatus: AdminReviewStatus;
  missing: AdminMissingFlags;
  deckCount: number;
  updatedAt: string;
}

export interface AdminVocabularyPage {
  items: AdminVocabularyListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminVocabularyListInput {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: AdminWordType;
  cefrLevel?: AdminCefrLevel;
  reviewStatus?: AdminReviewStatus;
  missingIpa?: boolean;
  missingAudio?: boolean;
  missingExample?: boolean;
  missingMeaning?: boolean;
}

export function adminListVocabulary(
  input: AdminVocabularyListInput,
): Promise<AdminVocabularyPage> {
  return invoke<AdminVocabularyPage>("admin_list_vocabulary", { input });
}

// ── Vocabulary detail ──────────────────────────────────────────────────────

export interface AdminVocabularyDetail {
  id: number;
  headword: string;
  type: AdminWordType;
  partOfSpeech: string | null;
  cefrLevel: AdminCefrLevel | null;
  ipaUk: string | null;
  ipaUs: string | null;
  reviewStatus: AdminReviewStatus;
  frequencyRank: number | null;
  packName: string | null;
  deckCount: number;
  primaryDefinitionEn: string | null;
  primaryDefinitionVi: string | null;
  primaryExampleEn: string | null;
  primaryExampleVi: string | null;
  primaryAudioPath: string | null;
  senseCount: number;
  exampleCount: number;
  pronunciationCount: number;
  createdAt: string;
  updatedAt: string;
}

export function adminGetVocabularyItem(
  id: number,
): Promise<AdminVocabularyDetail> {
  return invoke<AdminVocabularyDetail>("admin_get_vocabulary_item", {
    input: { id },
  });
}

export interface AdminVocabularyPatch {
  headword?: string;
  type?: AdminWordType;
  partOfSpeech?: string;
  cefrLevel?: AdminCefrLevel | "";
  ipaUk?: string;
  ipaUs?: string;
  reviewStatus?: AdminReviewStatus;
  primaryDefinitionEn?: string;
  primaryDefinitionVi?: string;
  primaryExampleEn?: string;
  primaryExampleVi?: string;
}

export function adminUpdateVocabularyItem(
  id: number,
  patch: AdminVocabularyPatch,
): Promise<AdminVocabularyDetail> {
  return invoke<AdminVocabularyDetail>("admin_update_vocabulary_item", {
    input: { id, patch },
  });
}

// ── Decks ──────────────────────────────────────────────────────────────────

export interface AdminDeckSummary {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  difficulty: string | null;
  wordCount: number;
  actualWordCount: number;
  hasCover: boolean;
  packName: string | null;
  updatedAt: string;
}

export interface AdminDeckPage {
  items: AdminDeckSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminDeckListInput {
  page?: number;
  pageSize?: number;
  search?: string;
}

export function adminListDecks(
  input: AdminDeckListInput,
): Promise<AdminDeckPage> {
  return invoke<AdminDeckPage>("admin_list_decks", { input });
}

// ── Validation summary ─────────────────────────────────────────────────────

export interface AdminValidationSummary {
  totalWords: number;
  missingMeanings: number;
  missingDefinitions: number;
  missingExamples: number;
  missingIpa: number;
  missingAudio: number;
  unverified: number;
  needsReview: number;
  draft: number;
  rejected: number;
  verified: number;
  potentialDuplicates: number;
}

export function adminGetValidationSummary(): Promise<AdminValidationSummary> {
  return invoke<AdminValidationSummary>("admin_get_validation_summary");
}

export type DataQualitySeverity = "critical" | "high" | "medium" | "low";

export type DataQualityCategory =
  | "missing_field"
  | "duplicate"
  | "conflict"
  | "broken_reference"
  | "provenance"
  | "suspicious_content";

export type DataQualityEntityType =
  | "vocabulary_item"
  | "vocabulary_sense"
  | "pronunciation"
  | "deck"
  | "deck_item"
  | "asset"
  | "relation";

export interface DataQualityNavigationTarget {
  targetType: "vocabulary_item" | "deck" | string;
  targetId: string;
  label: string;
}

export interface DataQualityIssue {
  id: string;
  severity: DataQualitySeverity;
  category: DataQualityCategory;
  entityType: DataQualityEntityType;
  entityId: string;
  entityLabel: string | null;
  field: string | null;
  message: string;
  recommendation: string | null;
  canAutoFix: boolean;
  createdAt: string | null;
  navigationTarget: DataQualityNavigationTarget | null;
}

export interface DataQualityScannedEntityCounts {
  vocabularyItems: number;
  senses: number;
  pronunciations: number;
  decks: number;
  deckItems: number;
  relations: number;
  assets: number;
}

export interface DataQualityQuickCounts {
  critical: number;
  high: number;
  missingMeanings: number;
  missingIpaAudio: number;
  duplicates: number;
  unverifiedEntries: number;
}

export interface DataQualityTopIssueType {
  issueType: string;
  label: string;
  count: number;
}

export interface DataQualitySummary {
  totalIssues: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  byEntityType: Record<string, number>;
  topIssueTypes: DataQualityTopIssueType[];
  lastScanTime: string | null;
  scannedEntityCounts: DataQualityScannedEntityCounts;
  quickCounts: DataQualityQuickCounts;
}

export interface AdminRunDataQualityScanInput {
  categories?: DataQualityCategory[];
  severity?: DataQualitySeverity[];
  limit?: number;
}

export interface DataQualityScanResult {
  issues: DataQualityIssue[];
  returnedIssues: number;
  totalIssues: number;
  summary: DataQualitySummary;
  scannedAt: string;
}

export interface AdminListDataQualityIssuesInput {
  page: number;
  pageSize: number;
  category?: DataQualityCategory;
  severity?: DataQualitySeverity;
  entityType?: DataQualityEntityType;
  search?: string;
}

export interface DataQualityIssuePage {
  items: DataQualityIssue[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function adminRunDataQualityScan(
  input?: AdminRunDataQualityScanInput,
): Promise<DataQualityScanResult> {
  return invoke<DataQualityScanResult>("admin_run_data_quality_scan", {
    input,
  });
}

export function adminListDataQualityIssues(
  input: AdminListDataQualityIssuesInput,
): Promise<DataQualityIssuePage> {
  return invoke<DataQualityIssuePage>("admin_list_data_quality_issues", {
    input,
  });
}

export function adminGetDataQualitySummary(): Promise<DataQualitySummary> {
  return invoke<DataQualitySummary>("admin_get_data_quality_summary");
}
