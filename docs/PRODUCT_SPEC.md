# Lexora — Product Specification

> Version: 1.0 | Status: Locked for V1

---

## Vision

Lexora is a premium Windows desktop vocabulary learning platform for English–Vietnamese learners. It delivers a focused, distraction-free, offline-first study environment with the polish and permanence of a locally installed application — not a browser tab. The experience takes inspiration from Steam's library-browsing feel: a rich catalog, owned content, and a sense of progress and collection.

---

## Target Users

| Persona | Description |
|---|---|
| Primary | Vietnamese speakers learning English at B1–C1 level, studying independently |
| Secondary | English speakers learning Vietnamese, educators preparing word packs |
| Owner/Admin | The single platform owner managing vocabulary content via Data Studio |

Lexora is **not** designed for casual mobile use, classroom management, or enterprise LMS scenarios in V1.

---

## Language Scope — V1

- Supported pair: **English ↔ Vietnamese**
- Dictionary direction: English headword with Vietnamese definitions, examples, and audio
- Vietnamese headword support is planned for a future milestone
- No third language in V1

---

## Platform

- **Windows-first desktop application**
- Built with Tauri 2 (native shell) + React + TypeScript (UI)
- Distributed as a Windows installer (.msi or .exe via NSIS)
- Minimum target: Windows 10 64-bit
- No web app, no browser extension, no mobile app in V1

---

## Offline-First Requirement

All core learning features must function without any network connection:

- Login and role validation
- Deck browsing and library
- Flashcard review sessions
- FSRS scheduling
- XP, streak, and achievement recording
- Audio playback (pre-bundled or cached audio packages)
- Stats and analytics

Network is **optional** and used only for:
- Application updater
- Content and audio package downloads
- Online TTS fallback (when local audio is unavailable)
- Future cloud sync (out of V1 scope)

---

## Visual Identity

- **Theme:** Light theme only. No dark mode.
- **Palette:** White, pale blue, sky blue, azure, soft cyan, blue-gray
- **Feel:** Azure Glass Learning Platform — soft gradients, subtle shadows, frosted-glass cards, crisp typography
- **Inspiration:** Steam's platform library feel without copying Steam's dark color scheme or branding
- **Custom title bar:** Frameless window with custom drag region and window controls

---

## Main Modules — V1 Scope

| Module | Description |
|---|---|
| Auth | Local login, role separation (owner vs. learner) |
| Discover | Catalog of available decks/packs with hero banner and shelves |
| Deck Library | User's personal collection of installed decks |
| Deck Detail | Deck metadata, word list preview, study actions |
| Word Detail | Full vocabulary entry with definitions, examples, audio, relations |
| Smart Review | FSRS-scheduled flashcard session |
| Study Sessions | Timed/untimed study, session summary, streak updates |
| Pronunciation | Audio playback from bundled/downloaded packages |
| Achievements | Badge/milestone system with unlock triggers |
| Gamification | XP, Level, Streak, Daily Goal tracking |
| Stats/Analytics | Learning curves, retention rates, session history charts |
| Settings | User preferences, study goals, notification config |
| Backup/Restore | Export and import of local learning data |
| Admin/Data Studio | Owner-only content management, word pack authoring |
| Notifications | Windows toast notifications for streak, goals, reminders |
| Updater | Auto-update checks for app and content packages |

---

## Admin/Data Studio — Strict Access Rule

The Admin/Data Studio module is **owner-only**. It must never be visible, accessible, or discoverable by normal learner accounts. This is enforced at:

- Route guard level
- Database role check level
- UI rendering level (not conditionally hidden — never rendered)

---

## V1 Non-Goals

The following are explicitly out of scope for V1:

- Cloud sync or multi-device progress
- Online community or shared decks marketplace
- AI tutor or chat
- Pronunciation recording or comparison
- Mobile app
- Dark mode
- Third language support
- Payment or subscription system
- Public user profiles
