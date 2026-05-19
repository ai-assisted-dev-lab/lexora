use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportableDeckDto {
    pub id: i64,
    pub title: String,
    pub slug: String,
    pub pack_name: String,
    pub word_count: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportableDecksDto {
    pub decks: Vec<ExportableDeckDto>,
    pub total: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportExportSchemaDto {
    pub json_schema_name: String,
    pub json_schema_version: String,
    pub json_required_top_level_fields: Vec<String>,
    pub csv_format_name: String,
    pub csv_headers: Vec<String>,
    pub csv_notes: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportDeckResultDto {
    pub deck_id: i64,
    pub deck_slug: String,
    pub file_path: String,
    pub bytes_written: u64,
    pub word_count: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportDeckResultDto {
    pub import_id: i64,
    pub pack_id: i64,
    pub deck_id: i64,
    pub deck_slug: String,
    pub words_imported: usize,
    pub senses_imported: usize,
    pub examples_imported: usize,
    pub pronunciations_imported: usize,
    pub status: String,
}
