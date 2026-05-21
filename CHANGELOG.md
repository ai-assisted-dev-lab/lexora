# Changelog

All notable changes to Lexora are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Global `ErrorBoundary` + per-route fallback so a single page failure no longer
  blanks the entire app shell.
- Toast notification system (`ToastProvider` / `useToast`) with `aria-live`
  variants so async errors and success states are announced to assistive tech.
- Bilingual UI infrastructure (`react-i18next`): English and Vietnamese locale
  files, language detector with `localStorage` persistence, and a working
  language switcher in **Settings → Account**. Sidebar, Header, Login,
  NotificationCenter, error fallbacks and the Settings Account/Security panes
  now ship fully translated.
- `change_password` Tauri command and **Settings → Security** panel for
  rotating credentials. Backed by `auth::change_password` with Argon2id
  re-hashing, length policy, and rejection of unchanged passwords.
- `account_uses_default_password` command and inline warning that fires while
  an account still uses the seeded default credentials.
- Backup-path hardening: `canonicalize_existing_file` resolves symlinks and
  `..` segments before any I/O, enforces regular-file type, and rejects paths
  without a `.json` extension.

### Changed

- `routes.ts` now carries `labelKey` translation keys; the English `label`
  field is retained as a fallback for tests where i18n is not initialised.
- `docs/SECURITY.md` documents default credential rotation, the password
  change flow, and backup canonicalisation.
- Removed runtime mock-data fallbacks. `HomePage`, `StatsPage`, `ProfilePage`,
  and `AchievementsPage` now render real data or proper EmptyState surfaces
  with CTAs instead of inventing fake decks, sessions, and achievements when
  the backend is unavailable. Test fixtures moved to the test files
  themselves and are no longer reachable from production bundles.

### Removed

- `pages/home/homeMockData.ts`, `pages/stats/statsMockData.ts`,
  `pages/profile/profileMockData.ts`, `pages/achievements/achievementsMockData.ts`
  — replaced by real data hooks plus empty-state UI. Five additional orphaned
  `*MockData.ts` files (library, deck-detail, discover, word-detail,
  study-session) were also deleted; none were imported in production code.

### Tests

- E2E suite expanded from 6 to 24 specs across three files:
  `lexora.spec.ts` (original auth/study/admin smoke), `flows.spec.ts`
  (auth validation, navigation, Settings → Security, every Data Studio
  tab, Ctrl+K command palette), and `a11y.spec.ts` (axe-core scans of
  login, home, discover, library, settings, and Data Studio).
- Fixed two real accessibility violations surfaced by the new axe scans:
  the login page now has a single `<main>` landmark, and the Settings
  page no longer nests a duplicate `<main>` inside the route layout.

### Content

- `data/README.md` documents the pack/deck/word JSON schema, the
  quality bar for production-bundled packs, and how to register new
  packs with the seeder.
- `data/packs/README.md` explains how to drop additional packs into the
  build without coupling them to the open-source repository.

### Release pipeline

- `release-windows.yml` now triggers on tag pushes of the form `v*.*.*`
  in addition to manual dispatches. CI parses the tag, rewrites both
  `tauri.conf.json` and `Cargo.toml` to the requested version, and
  publishes a **draft** GitHub Release with the installer, MSI, and
  `.sig` artifacts attached. Pre-release tags (anything containing `-`)
  are marked as prerelease automatically.
- New `docs/RELEASING.md` documents the end-to-end release process,
  required secrets/variables, versioning policy, hot-fix flow, and how
  to roll back a bad draft.

### Data Studio

- Implemented the three previously disabled tabs: **Provenance** (filtered
  view over the data-quality scanner's `provenance` category), **Audio /
  IPA** (live coverage stats + filterable list of missing-IPA /
  missing-audio entries), and **Import / Export** (owner-only deck JSON
  pipeline reusing the existing import/export commands). No more "coming
  soon" placeholders ship in the bundle.

### Documentation

- New `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `PRIVACY.md`,
  `SUPPORT.md`, and `THIRD_PARTY_LICENSES.md` covering the basics expected of
  a commercial open-source release.

## [0.1.0] — 2026-05-21

First public-facing portfolio cut of Lexora.

### Added

- Tauri 2 + React 18 + TypeScript desktop shell with custom title bar and
  light-blue "Azure Glass" identity.
- Local-first SQLite data model with FTS5 search, FSRS-style review engine
  (Rust), and bundled demo content pack.
- Home, Discover, My Library, Word Detail, Review, Study Session, Weak Words,
  Achievements, Stats, Profile, Search, Settings pages.
- Owner-only Admin / Data Studio with paged vocabulary tables, validation
  surfaces, and data-quality scanning.
- Backup / restore, JSON deck import / export, notification scheduling,
  pronunciation controls, and the Tauri updater foundation.
- Windows NSIS and MSI installer bundling.
- E2E (Playwright), unit (Vitest + RTL), and Rust test suites.

[Unreleased]: https://github.com/your-org/lexora/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/your-org/lexora/releases/tag/v0.1.0
