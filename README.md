# Lexora

A premium Windows desktop vocabulary learning platform for English–Vietnamese learners. Offline-first, locally installed, with FSRS-powered spaced repetition and a Steam-inspired library feel.

> **Status:** Repository skeleton and Tauri 2 app scaffold complete. UI shell is next.

---

## Stack

| Layer           | Technology                                               |
| --------------- | -------------------------------------------------------- |
| Desktop shell   | Tauri 2                                                  |
| UI              | React 18 + TypeScript + Vite                             |
| Components      | shadcn/ui + Tailwind CSS                                 |
| Animations      | Framer Motion                                            |
| State           | Zustand                                                  |
| Data fetching   | TanStack Query                                           |
| Database        | SQLite + SQLCipher (encrypted, local)                    |
| Search          | SQLite FTS5 + fuzzy ranking                              |
| Review engine   | FSRS (Rust)                                              |
| Charts          | Recharts                                                 |
| Icons           | Lucide React                                             |
| Package manager | pnpm (workspaces)                                        |
| Testing         | Vitest + React Testing Library + Playwright + Rust tests |

---

## Repository Layout

```
lexora/
├── apps/
│   └── desktop/          # Tauri 2 desktop application
├── packages/
│   ├── ui/               # Shared React component library
│   ├── review-engine/    # FSRS types and helpers (TS)
│   ├── data-contracts/   # Shared IPC command types
│   ├── validation/       # Shared input validation schemas
│   └── seed-tools/       # Vocabulary content seeding utilities
├── data/
│   ├── seed/             # Seed word lists and pack definitions
│   ├── packs/            # Built vocabulary pack archives
│   ├── audio-manifests/  # Audio package manifests
│   └── assets/           # Shared image assets
├── tests/
│   ├── e2e/              # Playwright end-to-end tests
│   └── fixtures/         # Shared test fixtures
├── docs/                 # Architecture, specs, data model, roadmap
└── .github/workflows/    # CI/CD pipeline
```

---

## Design

- **Light theme only** — white and pale blue surfaces, azure accents
- **Offline-first** — all core learning features work without a network connection
- **Owner-only Admin** — Data Studio is never accessible to learner accounts

---

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 9 — `npm install -g pnpm`
- [Rust](https://rustup.rs/) stable toolchain
- Windows 10/11 64-bit (primary development target)
- [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) (pre-installed on Windows 11)

---

## Setup

```bash
# Install all workspace dependencies
pnpm install

# Generate app icons from the source SVG (only needed once, or after changing source.svg)
pnpm --filter desktop icons:generate
```

---

## Scripts

### Root workspace

| Command             | Description                                           |
| ------------------- | ----------------------------------------------------- |
| `pnpm dev`          | Start the Tauri desktop app in development mode       |
| `pnpm build`        | Production build (Vite bundle + Tauri binary)         |
| `pnpm lint`         | Run ESLint across all workspace packages              |
| `pnpm typecheck`    | Run TypeScript type checks across all packages        |
| `pnpm test`         | Run all unit tests across all packages                |
| `pnpm test:e2e`     | Run Playwright end-to-end tests                       |
| `pnpm format`       | Auto-format all files with Prettier                   |
| `pnpm format:check` | Check formatting without modifying files (used in CI) |
| `pnpm clean`        | Remove all build artifacts and `node_modules`         |

### Desktop app (`apps/desktop`)

| Command                                | Description                                                 |
| -------------------------------------- | ----------------------------------------------------------- |
| `pnpm --filter desktop dev`            | Start Vite dev server only                                  |
| `pnpm --filter desktop tauri:dev`      | Start full Tauri app in dev mode                            |
| `pnpm --filter desktop tauri:build`    | Build production Tauri binary + installer                   |
| `pnpm --filter desktop tauri:build:windows` | Build Windows NSIS `.exe` and MSI `.msi` installers     |
| `pnpm --filter desktop lint`           | ESLint (TypeScript, React hooks, import sort)               |
| `pnpm --filter desktop typecheck`      | TypeScript check (no emit)                                  |
| `pnpm --filter desktop test`           | Vitest unit tests (single run)                              |
| `pnpm --filter desktop test:watch`     | Vitest unit tests (watch mode)                              |
| `pnpm --filter desktop test:coverage`  | Vitest with V8 coverage report                              |
| `pnpm --filter desktop icons:generate` | Regenerate all icon sizes from `src-tauri/icons/source.svg` |

### Rust (run from `apps/desktop/`)

| Command                                | Description                             |
| -------------------------------------- | --------------------------------------- |
| `pnpm --filter desktop rust:fmt`       | Auto-format Rust code with `cargo fmt`  |
| `pnpm --filter desktop rust:fmt:check` | Check Rust formatting (used in CI)      |
| `pnpm --filter desktop rust:check`     | Check Rust compilation without building |
| `pnpm --filter desktop rust:lint`      | Run Clippy with warnings as errors      |

---

## Windows Packaging

Lexora's Windows installer configuration lives in `apps/desktop/src-tauri/tauri.conf.json`.
The bundle targets are NSIS (`.exe`) and WiX MSI (`.msi`), with the existing app
icon, a placeholder publisher of `Lexora Labs`, current-user NSIS install mode,
and a fixed MSI upgrade code so future versions replace the existing install.
The updater plugin has an empty local config placeholder; release CI supplies
the real endpoint and public key without committing them.

```bash
pnpm --filter desktop tauri:build:windows
```

Build outputs are written under:

- `apps/desktop/src-tauri/target/release/bundle/nsis/`
- `apps/desktop/src-tauri/target/release/bundle/msi/`

The installer must not include a local user database, secrets, or downloaded
audio packages. Runtime data is created after launch in Tauri's app-data
directory, currently `%APPDATA%\com.kieran.lexora`, including `user.db`,
`content.db` when content packs exist, backups, exports, and `audio_cache`.
The bundled demo seed is compiled into the app and loaded idempotently on first
launch after migrations run.

Updater artifacts are disabled for local installer builds so packaging can run
without committing an updater endpoint or signing key. Real release builds must
enable updater artifacts with a CI config override and provide
`TAURI_UPDATER_ENDPOINT`, `TAURI_UPDATER_PUBLIC_KEY`,
`TAURI_SIGNING_PRIVATE_KEY`, and, when used,
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` through environment variables, GitHub
Actions variables, or GitHub Actions secrets. Never commit signing keys or
installer certificates.

To smoke check an installer locally, build with the command above, install the
generated `.exe` or `.msi`, launch Lexora, then verify that
`%APPDATA%\com.kieran.lexora\user.db` is created and the seeded demo decks load.

---

## Documentation

- [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) — Vision, scope, and module list
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Stack decisions and system design
- [`docs/UI_UX_SPEC.md`](docs/UI_UX_SPEC.md) — Design system and screen inventory
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — SQLite schema and entity relationships
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — V1 checklist and post-V1 features
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — Locked decisions and open questions

---

## License

MIT — see [LICENSE](LICENSE)
