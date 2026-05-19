# Lexora Import/Export Foundation

Status: Prompt 35 foundation

## Deck JSON Schema

Schema identifier: `lexora.deck.v1`

Top-level required fields:

- `schema`: must be `lexora.deck.v1`
- `schema_version`: must be `1`
- `pack`: imported pack metadata
- `deck`: imported deck metadata
- `words`: vocabulary entries for the deck

Minimal compatible shape:

```json
{
  "schema": "lexora.deck.v1",
  "schema_version": "1",
  "exported_at": "2026-05-19T00:00:00Z",
  "pack": {
    "slug": "english-essentials-import",
    "name": "English Essentials Import",
    "description": "Optional text",
    "version": "1.0.0",
    "author": "Lexora",
    "cover_image_path": null
  },
  "deck": {
    "slug": "everyday-actions-import",
    "name": "Everyday Actions Import",
    "description": "Optional text",
    "cover_image_path": null,
    "difficulty": "beginner",
    "tags": ["A1", "verbs"]
  },
  "words": [
    {
      "headword": "run",
      "part_of_speech": "verb",
      "ipa_uk": "/rʌn/",
      "ipa_us": "/rʌn/",
      "frequency_rank": 82,
      "cefr_level": "A1",
      "senses": [
        {
          "sense_index": 0,
          "definition_en": "To move quickly on foot",
          "definition_vi": "Chạy nhanh bằng chân",
          "register": null,
          "domain": null,
          "examples": [
            {
              "sentence_en": "She runs every morning.",
              "sentence_vi": "Cô ấy chạy mỗi sáng.",
              "audio_path": null
            }
          ]
        }
      ],
      "pronunciations": [
        {
          "dialect": "uk",
          "audio_path": "audio/run-uk.mp3",
          "tts_engine": "bundled"
        }
      ]
    }
  ],
  "relations": [
    {
      "from_headword": "run",
      "to_headword": "walk",
      "relation_type": "see_also"
    }
  ]
}
```

Validation rules:

- `pack.slug` and `deck.slug` must be unique in the local DB.
- Imports never overwrite existing packs or decks.
- Slugs use lowercase ASCII letters, numbers, hyphens, or underscores.
- `deck.difficulty` is `beginner`, `intermediate`, or `advanced` when present.
- `cefr_level` is `A1` through `C2` when present.
- Pronunciation `dialect` is `uk` or `us`.
- `relation_type` is `synonym`, `antonym`, `collocation`, or `see_also`.

## CSV Vocabulary Format

CSV import is defined for compatibility work but not imported yet in this prompt.

Required header row:

```csv
headword,part_of_speech,ipa_uk,ipa_us,frequency_rank,cefr_level,definition_en,definition_vi,example_en,example_vi,tags
```

Rules:

- UTF-8 CSV with a header row.
- One row represents one vocabulary item and its first sense.
- `tags` is a semicolon-separated list.
- Empty optional fields are allowed.
