# Lexora

A premium Windows desktop vocabulary learning platform for English–Vietnamese learners. Offline-first, locally installed, with FSRS-powered spaced repetition and a Steam-inspired library feel.

> **Status:** Repository skeleton initialized. Tauri application scaffold is next.

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
- [pnpm](https://pnpm.io/) >= 9
- [Rust](https://rustup.rs/) (stable toolchain)
- Windows 10/11 64-bit (primary development target)

---

## Setup

```bash
# Install dependencies
pnpm install

# Start development (once apps/desktop is scaffolded)
pnpm dev

# Build for production
pnpm build

# Run all tests
pnpm test

# Lint and typecheck
pnpm lint
pnpm typecheck
```

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
