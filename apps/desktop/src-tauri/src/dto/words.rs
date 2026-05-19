use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WordExampleDto {
    pub id: i64,
    pub sentence_en: String,
    pub sentence_vi: Option<String>,
    pub audio_path: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WordSenseDto {
    pub id: i64,
    pub sense_index: i64,
    pub definition_en: String,
    pub definition_vi: Option<String>,
    pub register: Option<String>,
    pub domain: Option<String>,
    pub examples: Vec<WordExampleDto>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WordPronunciationDto {
    pub id: i64,
    pub dialect: String,
    pub audio_path: String,
    pub tts_engine: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WordRelationDto {
    pub id: i64,
    pub relation_type: String,
    pub word_id: i64,
    pub headword: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WordReviewStateDto {
    pub state: String,
    pub due: String,
    pub reps: i64,
    pub lapses: i64,
    pub last_review: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WordReviewLogDto {
    pub id: i64,
    pub rating: i64,
    pub result: String,
    pub mode: String,
    pub reviewed_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WordDetailDto {
    pub id: i64,
    pub headword: String,
    pub part_of_speech: Option<String>,
    pub ipa_uk: Option<String>,
    pub ipa_us: Option<String>,
    pub frequency_rank: Option<i64>,
    pub cefr_level: Option<String>,
    pub pack_name: Option<String>,
    pub pack_slug: Option<String>,
    pub senses: Vec<WordSenseDto>,
    pub pronunciations: Vec<WordPronunciationDto>,
    pub relations: Vec<WordRelationDto>,
    pub review_state: Option<WordReviewStateDto>,
    pub review_history: Vec<WordReviewLogDto>,
}
