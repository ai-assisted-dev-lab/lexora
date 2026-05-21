# Contributing to Lexora

Thanks for taking the time to contribute. This document covers the basics —
how to set the project up, the conventions we use, and how to get a change
merged.

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By
participating you agree to abide by it.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Rust stable (with `rustup component add rustfmt clippy`)
- Windows 10/11 with WebView2 if you are building the desktop bundle

## Repository layout

```text
lexora/
  apps/desktop/              Tauri 2 desktop application (Rust + React)
  packages/review-engine/    FSRS scheduling helpers (shared)
  packages/data-contracts/   IPC and storage contracts (shared)
  packages/validation/       Schema validation helpers (shared)
  data/                      Seed data, content packs, audio manifests
  docs/                      Product, architecture, security, UI/UX, data-model docs
  tests/e2e/                 Playwright tests and screenshot capture
```

## First-time setup

```bash
pnpm install
```

To run the renderer in browser dev mode:

```bash
pnpm dev
```

To run the full Tauri desktop app:

```bash
pnpm --filter desktop tauri:dev
```

The first Tauri build downloads WebView2 and compiles the Rust toolchain — give
it 5–10 minutes the first time.

## Branches

- `main` is the integration branch. CI must stay green on `main`.
- Work in topic branches named `<area>/<short-slug>`, e.g.
  `i18n/migrate-home-page` or `security/symlink-guard`.

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): short summary

Optional body explaining the why, links to issues, follow-ups.
```

Common types: `feat`, `fix`, `refactor`, `docs`, `test`, `build`, `chore`,
`style`, `perf`, `ci`, `revert`.

Do **not** include personal prompt-numbering suffixes like `(Prompt 23)` in
commit messages — they leak project meta into history.

## Quality gates before pushing

Run these from the repo root unless noted:

```bash
pnpm typecheck                                      # TypeScript everywhere
pnpm --filter desktop test                          # Vitest + RTL
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml --lib
pnpm test:e2e                                       # Playwright (slower)
pnpm format:check                                   # Prettier
pnpm lint                                           # ESLint where configured
```

For the Rust side specifically:

```bash
pnpm --filter desktop rust:fmt:check
pnpm --filter desktop rust:check
pnpm --filter desktop rust:lint                     # clippy with -D warnings
```

## Adding a new feature

1. Open an issue first if the change is non-trivial. Spec the user-facing
   behaviour before writing code.
2. Update the relevant doc in `docs/` _in the same PR_. If the change has no
   doc impact, say so in the PR description.
3. Add tests:
   - Frontend: Vitest + React Testing Library for components and hooks.
   - Backend: Rust unit tests next to the code, integration tests in
     `apps/desktop/src-tauri/src/integration_tests.rs`.
   - End-to-end: Playwright spec under `tests/e2e/` for new user-visible flows.
4. Keep PRs focused. A 500-line PR will land faster than a 3,000-line one.

## i18n

All new user-facing strings go into both
`apps/desktop/src/i18n/locales/en.json` and `…/vi.json`. Use the `useTranslation`
hook (`const { t } = useTranslation();`) rather than hard-coding strings.

When adding a new language file:

1. Mirror the full key structure of `en.json`.
2. Update `SUPPORTED_LANGUAGES` and `LANGUAGE_LABELS` in
   `apps/desktop/src/i18n/index.ts`.
3. Surface it in the **Settings → Account → Language** selector — no extra
   wiring is needed; it picks the list from `SUPPORTED_LANGUAGES`.

## Security disclosures

Do **not** open public GitHub issues for security vulnerabilities. See
[SUPPORT.md](SUPPORT.md) for the disclosure channel.

## Style

- Frontend: Prettier-formatted, ESLint-clean, `simple-import-sort` ordering,
  CSS modules colocated next to the component file.
- Rust: `cargo fmt` + clippy with `-D warnings`. Prefer `thiserror` for
  domain errors and return `Result<T, AppError>` across the command boundary.
- Avoid adding `console.log` / `dbg!` / `println!` calls in production
  code paths. Use the structured logger or `tracing` when one becomes
  available.

## License

By contributing you agree that your contributions will be licensed under the
project's [MIT License](LICENSE).
