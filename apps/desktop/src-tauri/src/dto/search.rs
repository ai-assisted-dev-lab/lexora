use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchFiltersDto {
    pub result_types: Option<Vec<String>>,
    pub deck_id: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResultDto {
    pub result_type: String,
    pub id: i64,
    pub title: String,
    pub subtitle: Option<String>,
    pub snippet: Option<String>,
    pub deck_title: Option<String>,
    pub pack_title: Option<String>,
    pub score: f64,
    pub route: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResultGroupDto {
    pub result_type: String,
    pub label: String,
    pub results: Vec<SearchResultDto>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResponseDto {
    pub query: String,
    pub groups: Vec<SearchResultGroupDto>,
    pub total: usize,
    pub elapsed_ms: u128,
}
