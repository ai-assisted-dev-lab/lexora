# Lexora Content

This directory holds the bundled and pluggable content that ships with
Lexora.

```
data/
  seed/                Default content loaded on first launch (one pack required)
  packs/               Optional additional content packs shipped with the build
  audio-manifests/     Manifests for downloadable audio packages
  assets/              Static assets referenced from content (icons, banners, ...)
```

## Demo pack

The repository ships exactly one bundled pack, `seed/demo_pack.json`:

- **Pack identifier:** `english-essentials-demo`
- **Decks:** 10 (Everyday Actions, Around the House, Greetings & Social,
  Workplace English, Daily Conversation, Travel Situations, Technology
  Terms, Academic Reading, IELTS Topic Builder, Phrasal Verbs in Context).
- **Vocabulary entries:** ~72 high-quality words, all with verified
  Vietnamese meanings, English+Vietnamese example sentences, and IPA
  transcriptions where applicable.
- **Audience:** beginner to early-intermediate Vietnamese learners of
  English (CEFR A1–B2).

The seeder copies this file into the local SQLite database the first
time the app starts and re-applies it on later launches when the pack
`version` field is bumped.

## Adding a new pack

1. Drop a `<slug>.json` file under `data/packs/`.
2. Run `pnpm --filter desktop tauri:dev` and import the pack through
   **Settings → Backup → Deck JSON** or **Data Studio → Import /
   Export**.
3. For production builds, register the file path in
   `apps/desktop/src-tauri/src/db/seeder.rs` if you want the pack to be
   auto-loaded on first launch.

Refer to [docs/IMPORT_EXPORT.md](../docs/IMPORT_EXPORT.md) for the full
JSON schema. The minimum required shape is:

```json
{
  "pack": {
    "slug": "your-pack-slug",
    "name": "Display name",
    "description": "One sentence",
    "version": "1.0.0",
    "author": "Your name",
    "source": "bundled" | "imported"
  },
  "decks": [
    {
      "slug": "deck-slug",
      "name": "Display name",
      "description": "One sentence",
      "difficulty": "beginner" | "intermediate" | "advanced",
      "tags": ["A1", "verbs"]
    }
  ],
  "words": [
    {
      "headword": "run",
      "type": "word" | "phrase" | "idiom" | "phrasal_verb" | "collocation",
      "review_status": "verified" | "unverified" | "needs_review" | "draft",
      "part_of_speech": "verb",
      "ipa_uk": "/rʌn/",
      "ipa_us": "/rʌn/",
      "frequency_rank": 82,
      "cefr_level": "A1",
      "deck_slugs": ["deck-slug"],
      "senses": [
        {
          "sense_index": 0,
          "definition_en": "…",
          "definition_vi": "…",
          "register": "common",
          "domain": "daily actions",
          "examples": [
            {
              "sentence_en": "…",
              "sentence_vi": "…"
            }
          ]
        }
      ]
    }
  ]
}
```

### Quality bar for bundled packs

Production packs that ship with the installer must:

- Use UTF-8 encoding (verify with `file -i <file>` on POSIX).
- Pass the validators in **Data Studio → Validation** with no critical
  or high-severity issues.
- Have a Vietnamese definition and at least one example sentence for
  every sense — no `"???"` placeholders.
- Use accurate IPA transcriptions in both `ipa_uk` and `ipa_us` (or
  leave them `null` rather than guess).
- Mark sourced material with the appropriate `source` value on the pack
  and cite external dictionaries in the pack's README.

## Audio packages

Audio is intentionally optional. If a pack ships with audio, register it
under `audio-manifests/` and mark it `optional: true` in the manifest —
the updater never auto-downloads audio packages.

## Screenshots

Marketing screenshots live in `docs/assets/screenshots/`. Regenerate
them whenever the UI changes substantially:

```sh
pnpm screenshots
```

The script boots the dev server, exercises the routes used in the
README, and writes PNGs you can commit. Re-run after every visual
change that touches the home dashboard, discover catalog, library,
study session, achievements, word detail, or Data Studio.
