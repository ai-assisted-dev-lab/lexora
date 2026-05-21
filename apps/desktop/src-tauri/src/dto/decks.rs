use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeckSummaryDto {
    pub id: i64,
    pub slug: String,
    pub name: String,
    pub description: Option<String>,
    pub word_count: i64,
    pub difficulty: Option<String>,
    /// Raw JSON array string stored in the database, e.g. `["A1","beginner"]`.
    pub tags: Option<String>,
    pub pack_name: String,
    pub pack_slug: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SeededDecksDto {
    pub decks: Vec<DeckSummaryDto>,
    pub total: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoverDeckDto {
    pub id: i64,
    pub slug: String,
    pub title: String,
    pub description: Option<String>,
    pub level: Option<String>,
    pub word_count: i64,
    pub tags: Vec<String>,
    pub sample_words: Vec<String>,
    pub pack_name: String,
    pub pack_slug: String,
    pub installed: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoverDecksDto {
    pub decks: Vec<DiscoverDeckDto>,
    pub total: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryDeckDto {
    pub id: i64,
    pub slug: String,
    pub title: String,
    pub description: Option<String>,
    pub level: Option<String>,
    pub word_count: i64,
    pub tags: Vec<String>,
    pub sample_words: Vec<String>,
    pub pack_name: String,
    pub pack_slug: String,
    pub installed_at: String,
    pub mastered_count: i64,
    pub due_count: i64,
    pub accuracy: i64,
    pub last_studied: Option<String>,
    pub progress: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryDecksDto {
    pub decks: Vec<LibraryDeckDto>,
    pub total: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeckPreviewWordDto {
    pub id: i64,
    pub headword: String,
    pub part_of_speech: Option<String>,
    pub level: Option<String>,
    pub definition_en: Option<String>,
    pub definition_vi: Option<String>,
    pub example: Option<String>,
    pub due_state: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeckDetailProgressDto {
    pub mastered_count: i64,
    pub due_count: i64,
    pub accuracy: i64,
    pub last_studied: Option<String>,
    pub progress: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeckDetailDto {
    pub id: i64,
    pub slug: String,
    pub title: String,
    pub description: Option<String>,
    pub level: Option<String>,
    pub word_count: i64,
    pub tags: Vec<String>,
    pub pack_name: String,
    pub pack_slug: String,
    pub banner: Option<String>,
    pub installed: bool,
    pub installed_at: Option<String>,
    pub progress: DeckDetailProgressDto,
    pub words: Vec<DeckPreviewWordDto>,
}
