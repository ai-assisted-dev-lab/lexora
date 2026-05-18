# Lexora — Agent Build Plan

> Version: 1.0 | Status: Active

---

## Purpose

This document defines the phased 60-prompt process for building Lexora. Each prompt is a self-contained unit of work assigned to an agent. Agents must not implement features from future prompts, must not break existing behavior, and must follow the architecture and design rules in `ARCHITECTURE.md`, `UI_UX_SPEC.md`, and `DECISIONS.md`.

---

## Phases

### Milestone 1 — Foundation, App Shell, Premium Mock UI (Prompts 01–18)

| Prompt | Title |
|---|---|
| 01 | Lock Product Specification Documents |
| 02 | Initialize Tauri 2 + React + TypeScript + Vite Project |
| 03 | Configure Tailwind CSS and Lexora Design Tokens |
| 04 | Build Application Shell (custom title bar, sidebar, header) |
| 05 | Build Discover Screen (hero banner, shelves, mock deck cards) |
| 06 | Build My Library Screen (mock deck grid, filter bar) |
| 07 | Build Deck Detail Screen (mock deck info, word list preview) |
| 08 | Build Word Detail Screen (mock vocabulary entry, senses, IPA) |
| 09 | Build Smart Review Screen (mock card flip, rating buttons) |
| 10 | Build Session Summary Screen (mock stats, XP earned) |
| 11 | Build Stats Screen (mock charts, streak, daily goal) |
| 12 | Build Achievements Screen (mock badge grid) |
| 13 | Build Settings Screen (mock settings panels) |
| 14 | Build Login Screen (form, local auth placeholder) |
| 15 | Right Widgets Panel (daily goal ring, streak, XP bar) |
| 16 | Navigation and Routing (React Router, route guards stub) |
| 17 | Animations and Micro-interactions (Framer Motion passes) |
| 18 | Mock Data Layer (static JSON, TanStack Query wiring) |

### Milestone 2 — Native Layer, SQLite, Auth, Roles (Prompts 19–29)

| Prompt | Title |
|---|---|
| 19 | Rust SQLite Setup (SQLCipher, migration runner) |
| 20 | Database Schema V1 (all tables, indexes, FTS5) |
| 21 | Auth System (Argon2 hashing, session tokens, role check) |
| 22 | Login Flow (IPC commands, Zustand auth store, guards) |
| 23 | User Settings IPC (read/write user settings) |
| 24 | Deck and Pack IPC Commands |
| 25 | Word and Sense IPC Commands |
| 26 | Deck Library IPC (subscribe, list, remove) |
| 27 | Discover Catalog IPC (list packs, featured) |
| 28 | Search IPC (FTS5 query, fuzzy ranking) |
| 29 | Replace Mock Data with Real IPC in All Screens |

### Milestone 3 — Real Data Features (Prompts 30–35)

| Prompt | Title |
|---|---|
| 30 | Deck Detail with Real Data |
| 31 | Word Detail with Real Data (senses, examples, relations) |
| 32 | Admin/Data Studio — Pack and Deck Management |
| 33 | Admin/Data Studio — Word and Sense Authoring |
| 34 | Admin/Data Studio — Content Validation |
| 35 | Content Pack Import/Export |

### Milestone 4 — FSRS and Study Engine (Prompts 36–43)

| Prompt | Title |
|---|---|
| 36 | FSRS Algorithm — Rust Implementation |
| 37 | Review Card Initialization (new cards for a deck) |
| 38 | Smart Review Session — Card Selection |
| 39 | Smart Review Session — Rating and State Update |
| 40 | Review Log and Session Recording |
| 41 | Session Summary — Real Data |
| 42 | FSRS Tests (unit + integration) |
| 43 | Cram Mode (non-FSRS review of selected words) |

### Milestone 5 — Pronunciation, Search, Gamification, Admin (Prompts 44–53)

| Prompt | Title |
|---|---|
| 44 | Bundled Audio Playback |
| 45 | Audio Package Download and Cache |
| 46 | Online TTS Fallback |
| 47 | Global Search (FTS5 + fuzzy, real results) |
| 48 | XP and Level System |
| 49 | Streak and Daily Goal System |
| 50 | Achievements — Definitions and Unlock Logic |
| 51 | Stats Screen — Real Charts |
| 52 | Windows Toast Notifications |
| 53 | Admin/Data Studio — Audio File Assignment |

### Milestone 6 — Backup, Updater, Installer, Tests, Performance, Polish (Prompts 54–60)

| Prompt | Title |
|---|---|
| 54 | Backup Export (encrypted archive) |
| 55 | Backup Restore |
| 56 | Auto-updater Integration |
| 57 | Content Package Update System |
| 58 | Windows Installer (.msi / NSIS) |
| 59 | Performance Audit and Optimization |
| 60 | Final Test Pass, GitHub Polish, README |

---

## Agent Independence Rules

Every prompt must be treated as self-contained:

1. **Read first.** Before writing code, read current repository state and any docs in `docs/`.
2. **Read existing docs.** Check `PRODUCT_SPEC.md`, `ARCHITECTURE.md`, `UI_UX_SPEC.md`, `DATA_MODEL.md`, and `DECISIONS.md` before starting.
3. **Smallest set.** Only modify files directly relevant to the prompt.
4. **No future work.** Do not implement any feature from a later prompt, even partially.
5. **No regressions.** Do not remove, break, or contradict existing tests, route guards, or working UI.
6. **No dark mode.** The UI is light theme only. No dark mode code under any condition.
7. **No admin leakage.** Admin/Data Studio is owner-only. Never expose it to learners at any layer.
8. **No secrets.** Never hardcode passwords, encryption keys, API keys, or real credentials.
9. **Types everywhere.** All new code must be fully typed. No `any` in core modules.
10. **Tests for logic.** Any prompt involving data persistence, auth, review logic, search, or import/export must include tests.
11. **Finish with a report.** Every agent response must end with the standard completion report.

---

## Required Agent Response Format

After completing a prompt, the agent must append:

```md
## Completed
- [List of tasks completed]

## Files changed
- [List of files created or modified]

## How to run/check
- [Commands to verify the work]

## Tests run
- [What was tested and results]

## Risks / follow-up
- [Any known issues, deferred decisions, or items for the next prompt]
```

---

## Architecture Drift Prevention

If an agent produces code that contradicts the locked decisions, any future agent should:

1. Note the contradiction in its completion report under **Risks / follow-up**.
2. Fix the contradiction if it is in the files it is already modifying.
3. Not silently work around it — surface it so it can be corrected.

Locked decisions are in `docs/DECISIONS.md`. When in doubt, that file wins.
