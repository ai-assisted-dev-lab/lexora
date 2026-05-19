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
