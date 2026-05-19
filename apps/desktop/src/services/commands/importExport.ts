import { invoke } from "@tauri-apps/api/core";

export interface ExportableDeckDto {
  id: number;
  title: string;
  slug: string;
  packName: string;
  wordCount: number;
}

export interface ExportableDecksDto {
  decks: ExportableDeckDto[];
  total: number;
}

export interface ImportExportSchemaDto {
  jsonSchemaName: string;
  jsonSchemaVersion: string;
  jsonRequiredTopLevelFields: string[];
  csvFormatName: string;
  csvHeaders: string[];
  csvNotes: string[];
}

export interface ExportDeckResultDto {
  deckId: number;
  deckSlug: string;
  filePath: string;
  bytesWritten: number;
  wordCount: number;
}

export interface ImportDeckResultDto {
  importId: number;
  packId: number;
  deckId: number;
  deckSlug: string;
  wordsImported: number;
  sensesImported: number;
  examplesImported: number;
  pronunciationsImported: number;
  status: string;
}

export function getImportExportSchema(): Promise<ImportExportSchemaDto> {
  return invoke<ImportExportSchemaDto>("get_import_export_schema");
}

export function listExportableDecks(): Promise<ExportableDecksDto> {
  return invoke<ExportableDecksDto>("list_exportable_decks");
}

export function exportDeckToJson(
  deckId: number,
  filePath: string | null,
  overwrite: boolean,
): Promise<ExportDeckResultDto> {
  return invoke<ExportDeckResultDto>("export_deck_to_json", {
    deckId,
    filePath,
    overwrite,
  });
}

export function importDeckFromJson(
  filePath: string,
): Promise<ImportDeckResultDto> {
  return invoke<ImportDeckResultDto>("import_deck_from_json", { filePath });
}
