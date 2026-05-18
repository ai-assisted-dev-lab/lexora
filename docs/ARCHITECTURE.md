# Lexora — Architecture

> Version: 1.0 | Status: Locked for V1

---

## Stack Overview

```
┌─────────────────────────────────────────────────┐
│                   Tauri 2 Shell                  │
│  (native window, OS APIs, IPC bridge, updater)  │
├────────────────────┬────────────────────────────┤
│   React + TS UI    │      Rust Native Layer      │
│   (Vite, ShadCN,  │  (SQLite, FSRS, auth,       │
│    TanStack Query, │   audio, file I/O,          │
│    Zustand,        │   encryption, updater,      │
│    Framer Motion)  │   notifications)            │
└────────────────────┴────────────────────────────┘
           │                    │
           └────── IPC ─────────┘
                (Tauri commands)
```

---

## Technology Decisions (Locked)

| Concern             | Choice                                                   |
| ------------------- | -------------------------------------------------------- |
| Desktop shell       | Tauri 2                                                  |
| UI framework        | React 18 + TypeScript                                    |
| Build tool          | Vite                                                     |
| UI components       | shadcn/ui + Tailwind CSS                                 |
| Animations          | Framer Motion                                            |
| Global state        | Zustand                                                  |
| Data fetching/cache | TanStack Query                                           |
| Database            | SQLite with SQLCipher encryption                         |
| Search              | SQLite FTS5 + fuzzy ranking                              |
| FSRS engine         | Real FSRS algorithm (Rust implementation)                |
| Charts              | Recharts                                                 |
| Icons               | Lucide React                                             |
| Package manager     | pnpm                                                     |
| Testing             | Vitest + React Testing Library + Playwright + Rust tests |

---

## Tauri 2 Shell Responsibilities

- Native OS window management (frameless, custom title bar)
- IPC bridge: exposes typed Tauri commands to the React UI
- File system access (audio cache, backup files, SQLite path)
- OS-level notifications (Windows toast)
- Auto-updater (Tauri updater plugin)
- Single-instance enforcement
- App tray icon (optional, future)

---

## Rust Native Layer Responsibilities

| Responsibility             | Notes                                                                  |
| -------------------------- | ---------------------------------------------------------------------- |
| SQLite operations          | All reads and writes go through Rust; UI never touches the DB directly |
| Encryption                 | SQLCipher key management; key never exposed to JS layer                |
| FSRS scheduling            | Algorithm runs in Rust for correctness and performance                 |
| Auth / role validation     | Role checks enforced in Rust, not only in UI                           |
| Audio file management      | Index bundled/cached audio, serve to frontend                          |
| Backup serialization       | Export/import learning state as encrypted archive                      |
| Content package management | Unpack and apply vocabulary/audio package updates                      |
| Update checks              | Tauri updater integration                                              |
| Notification dispatch      | Windows toast via Tauri notification plugin                            |

---

## React UI Layer Responsibilities

- All user-facing screens and navigation
- Zustand stores for in-memory UI state (current session, user profile, settings)
- TanStack Query for data fetching from Tauri IPC commands (treated as async data sources)
- No direct database access — all data flows through Tauri IPC
- Framer Motion for transitions and micro-animations
- Route-level guards enforcing role (learner vs. owner)

---

## Database Architecture

### Engine

SQLite 3 with SQLCipher encryption. Database file lives in Tauri's app data directory.

### Access Pattern

- All DB access is via Rust command handlers
- The JS/TS layer never receives raw SQL or query-builder access
- Typed command inputs and outputs (serde JSON) form the IPC contract

### Schema Design Principles

- Normalized core entities (users, decks, words, senses)
- Denormalized caches for FSRS card state (avoid recomputing on read)
- FTS5 virtual tables for full-text search on headwords, definitions, examples
- Soft deletes on user content; hard deletes only on owner action
- Provenance columns (`source`, `pack_id`, `created_at`, `updated_at`) on all content rows

---

## Offline-First Boundaries

```
Always available (no network):
  ├── Auth (local credential check)
  ├── All learning features (review, sessions, stats)
  ├── Deck library browsing
  ├── Word detail
  ├── Achievements and gamification
  ├── Settings
  └── Backup/Restore (local file)

Optional network (graceful degradation):
  ├── Auto-updater (skips silently if offline)
  ├── Content package downloads (queued until online)
  └── Online TTS fallback (falls back to bundled audio)

Out of V1 scope (future network features):
  ├── Cloud sync
  └── Online content marketplace
```

---

## Future Cloud-Ready Boundaries

The architecture must not hard-block future cloud sync, but must not implement it in V1:

- All user progress is stored in normalized SQLite tables — easy to serialize and sync
- IPC command signatures should be data-focused (no side-effect coupling to local-only APIs)
- The Zustand store layer should be cloud-agnostic (data comes from IPC; sync layer would sit below IPC)

---

## Admin/Data Studio Protection

Admin access is enforced at multiple layers:

1. **Database layer:** `role` column on `users` table. All admin commands check this in Rust before execution.
2. **IPC layer:** Admin Tauri commands fail with `PermissionDenied` if calling user is not `owner`.
3. **Route layer:** React router guards redirect non-owners away from any `/admin` or `/studio` routes.
4. **Rendering layer:** Admin navigation items are never rendered for learner accounts (not just hidden).

---

## Update Strategy

- **App updates:** Tauri updater plugin checks a self-hosted or GitHub Releases endpoint
- **Content/audio packages:** Separate versioned package manifests; downloaded and applied by Rust layer
- **No silent data replacement:** User learning progress is never modified by an update
- **Rollback:** App installer supports rollback via Windows installer mechanisms

---

## Testing Strategy

| Layer                  | Tool                           |
| ---------------------- | ------------------------------ |
| Rust unit tests        | `cargo test`                   |
| Rust integration tests | Tauri test harness             |
| React component tests  | Vitest + React Testing Library |
| End-to-end tests       | Playwright                     |
| Type safety            | TypeScript strict mode         |
| Linting                | ESLint + Clippy                |
