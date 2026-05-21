# Lexora i18n Guide

> Status: foundation complete; remaining page migrations are tracked
> incrementally.

## Architecture

Lexora uses [`react-i18next`](https://react.i18next.com/) with the
[`i18next-browser-languagedetector`](https://github.com/i18next/i18next-browser-languageDetector)
plugin. The setup lives in `apps/desktop/src/i18n/index.ts`:

- `SUPPORTED_LANGUAGES = ["en", "vi"] as const`
- Detection order: `localStorage` → `navigator`
- Persistence: `localStorage` under `lexora.language`
- Fallback: `en`

### Adding a new locale

1. Create `apps/desktop/src/i18n/locales/<code>.json`, mirroring the key
   structure of `en.json` exactly.
2. Add `<code>` to `SUPPORTED_LANGUAGES` and register a human label in
   `LANGUAGE_LABELS` (both in `apps/desktop/src/i18n/index.ts`).
3. The **Settings → Account → Language** dropdown picks up the new
   locale automatically — no per-page wiring needed.

### Using translations in components

```tsx
import { useTranslation } from "react-i18next";

export function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t("settings.account.title")}</h1>;
}
```

For interpolation:

```tsx
t("common.dayStreak", { count: 12 });
```

For language metadata (e.g. an inline-language switcher elsewhere in
the app) use the `useLanguage` hook:

```tsx
import { useLanguage } from "@/i18n/useLanguage";

const { current, supported, change } = useLanguage();
```

## Migration status

The polish phase migrated the high-visibility surfaces that every user
sees on every session. The remaining pages still ship with hardcoded
English strings and need an incremental migration.

| Area                              | Status       | Notes                                                           |
| --------------------------------- | ------------ | --------------------------------------------------------------- |
| Sidebar                           | **Migrated** | Nav labels, brand tagline, profile card streak text.            |
| Header                            | **Migrated** | Page title (from route metadata), aria-labels.                  |
| Login page                        | **Migrated** | Form labels, hints, error messages.                             |
| Notification center               | **Migrated** | Empty state, panel header, dismiss labels.                      |
| Error boundary (global + route)   | **Migrated** | Both default fallback and route fallback.                       |
| Settings — Account                | **Migrated** | Including the working language switcher.                        |
| Settings — Security               | **Migrated** | Change-password form + default-credential warning.              |
| Route labels (`router/routes.ts`) | **Migrated** | Each route now carries a translation `labelKey`.                |
| NotFoundPage                      | **Migrated** |                                                                 |
| UnauthorizedPage                  | **Migrated** |                                                                 |
| HomePage                          | _Pending_    | Hero, missionStats labels, deck-shelf section headings.         |
| DiscoverPage                      | _Pending_    | Filter chips, hero, install/uninstall states.                   |
| LibraryPage                       | _Pending_    | Section headings, deck-row metadata, empty state.               |
| DeckDetailPage                    | _Pending_    | Tab labels, "Start session" CTAs.                               |
| WordDetailPage                    | _Pending_    | Senses/examples/relations headings, review-state badges.        |
| ReviewPage                        | _Pending_    | Card states, CTAs.                                              |
| StudySessionPage                  | _Pending_    | Flashcard / MCQ / Type-answer prompts and ratings.              |
| WeakWordsPage                     | _Pending_    | Empty state and CTA.                                            |
| AchievementsPage                  | _Pending_    | Hero copy, category filter labels, recently-unlocked headings.  |
| StatsPage                         | _Pending_    | Hero copy, weekly chart labels, mastery bucket labels.          |
| ProfilePage                       | _Pending_    | Hero meta, quick-stat labels.                                   |
| SearchPage                        | _Pending_    | Empty state, result grouping.                                   |
| SettingsPage — Learning section   | _Pending_    | Field labels for daily-goal/CEFR/auto-advance toggles.          |
| SettingsPage — Review section     | _Pending_    | FSRS configuration row labels.                                  |
| SettingsPage — Pronunciation      | _Pending_    | Accent + audio-priority + fallback dropdowns.                   |
| SettingsPage — Notifications      | _Pending_    | Toggle labels + scheduled-reminder copy.                        |
| SettingsPage — Updates            | _Pending_    | Status badges + manifest path copy.                             |
| SettingsPage — Backup             | _Pending_    | The largest single block — ~600 lines of strings.               |
| AdminDataStudio (six tabs)        | _Pending_    | Owner-only surface; lowest priority.                            |
| Components (UI primitives)        | _Pending_    | Empty state, page header, section header default fallback copy. |

## Migration recipe (per page)

1. Add the `useTranslation` import:

   ```tsx
   import { useTranslation } from "react-i18next";
   ```

2. Inside the component:

   ```tsx
   const { t } = useTranslation();
   ```

3. For each hardcoded string, find or create a key under the matching
   namespace in `en.json`:
   - Page-specific copy: `<pageName>.<section>.<key>`.
   - Cross-page primitives: `common.<key>`.
   - Domain-specific (auth, errors, notifications, settings.account,
     …): the existing namespace.

4. Add the same key to `vi.json` with the Vietnamese translation. The
   project's voice is friendly-but-formal; mirror the demo pack's tone.

5. Replace the hardcoded string with `{t("path.to.key")}` in JSX, or
   `t("path.to.key")` in attribute/string contexts.

6. For accessible names where the source string is interpolated (e.g.
   `aria-label={`Edit ${item.title}`}`), pass an interpolation map:

   ```tsx
   t("library.editAria", { title: item.title });
   ```

   …with the corresponding template `"Edit {{title}}"` in the locale
   file.

7. Update the matching unit test if it asserted against the English
   string. The defaults in `en.json` are designed to match the
   previously hardcoded values so most tests pass without changes.

## Content audit (Vietnamese)

The bundled `data/seed/demo_pack.json` was reviewed during the polish
phase:

- All 72 vocabulary entries have native Vietnamese definitions and
  example sentences.
- Diacritics are correct UTF-8 throughout (no `?` placeholder
  artefacts).
- IPA transcriptions are present in both `ipa_uk` and `ipa_us` for
  every entry where applicable.
- The pack's `description` and per-deck `description` fields are
  English-only by design — they target the discovery surface and are
  not user-rotated content. A future pack-localisation pass can
  introduce a `description_vi` field driven by the same loader.

Production packs added under `data/packs/` must clear the same bar
before shipping. The **Data Studio → Validation** tab will flag any
missing fields and the **Provenance** tab will surface entries that
lack a source attribution.

## Don't translate

These values are intentionally not user-facing strings and must stay
in code:

- Translation keys themselves (`nav.home`, etc.).
- CEFR codes (`A1`, `A2`, `B1`, `B2`, `C1`, `C2`).
- Deck slugs and pack slugs (used as stable identifiers in URLs and the
  database).
- IPA transcriptions — they are linguistic data, not UI.

## Tooling tips

- `Edit replace_all: true` works well for repetitive string replacement
  inside a single file (e.g. moving every section header in a Settings
  panel to `t(...)` in one pass).
- After migrating a page, grep for the previous English strings in the
  file to catch any leftovers:

  ```sh
  rg "Welcome back|Sign in|My Library" apps/desktop/src/pages/MyPage.tsx
  ```
