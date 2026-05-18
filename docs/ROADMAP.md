# Lexora — Roadmap

> Version: 1.0 | Status: Living document

---

## V1 Scope — Required to Ship

These features are in scope and must be complete before V1 is considered shippable.

### Foundation
- [x] Specification and architecture documentation
- [ ] Project scaffold (Tauri 2 + React + TypeScript + Vite)
- [ ] Design system (Tailwind + shadcn/ui + Lexora tokens)
- [ ] Custom title bar and app shell layout
- [ ] Left sidebar navigation
- [ ] Top header with search bar

### Auth and Roles
- [ ] Local user login (username + password, Argon2 hash)
- [ ] Role enforcement: `owner` vs `learner`
- [ ] Admin/Data Studio route guard (owner only)
- [ ] Remember-me / session persistence

### Content and Library
- [ ] SQLite database with SQLCipher encryption
- [ ] Pack and deck data model
- [ ] Discover screen with hero banner and shelves
- [ ] Deck Detail screen
- [ ] My Library screen
- [ ] Word Detail screen (headword, senses, examples, IPA)

### Review Engine
- [ ] Real FSRS algorithm (Rust)
- [ ] Smart Review session (FSRS-scheduled cards)
- [ ] Card flip animation
- [ ] Session summary screen
- [ ] Rating buttons (Again / Hard / Good / Easy)

### Pronunciation
- [ ] Bundled audio playback
- [ ] Audio package download and cache
- [ ] Online TTS fallback (Edge TTS or equivalent)
- [ ] IPA display

### Search
- [ ] SQLite FTS5 full-text search
- [ ] Fuzzy ranking
- [ ] Global search bar with results panel

### Gamification
- [ ] XP system
- [ ] Level calculation
- [ ] Daily streak tracking
- [ ] Daily goal tracking
- [ ] Achievements with unlock logic

### Stats
- [ ] Session history
- [ ] Learning curve chart (Recharts)
- [ ] Retention rate display
- [ ] Streak and XP charts

### Admin / Data Studio (Owner Only)
- [ ] Vocabulary word authoring
- [ ] Pack and deck management
- [ ] Sense and example editing
- [ ] Audio file assignment
- [ ] Content validation tools

### Platform
- [ ] Windows toast notifications (goal reminder, streak warning)
- [ ] Backup export (encrypted archive)
- [ ] Backup restore
- [ ] Auto-updater (app binary)
- [ ] Content package update system
- [ ] Windows installer (.msi / NSIS)
- [ ] Single-instance enforcement

### Quality
- [ ] Vitest unit tests for critical logic
- [ ] Playwright E2E tests for key user flows
- [ ] Rust unit tests for FSRS and data layer
- [ ] TypeScript strict mode, no `any` in core modules

---

## Post-V1 Roadmap

These features are explicitly deferred. They must not be partially implemented in V1 code.

### Cloud Sync (V2)
- User account system (cloud identity)
- Progress sync across multiple devices
- Conflict resolution strategy

### Online Content Catalog (V2)
- Browse and download packs from an online marketplace
- Pack versioning and delta updates

### Community Features (V3)
- User-shared decks
- Public deck ratings and comments
- Community word contributions

### AI Tutor (V3+)
- Conversational practice with AI
- Grammar correction feedback
- Adaptive lesson generation

### Pronunciation Tools (V2)
- User microphone recording
- Recording vs. model comparison
- Phoneme-level feedback

### Advanced Content Updates (V2)
- Differential pack updates (only changed words)
- Background download queue
- CDN integration

### Mobile (V3+)
- iOS app
- Android app
- Cross-platform progress sync

### Third Language Support (V2)
- Extensible language pair system
- French–Vietnamese, Chinese–Vietnamese, etc.

---

## Version Definitions

| Version | Description |
|---|---|
| V1 | Windows desktop, offline-first, English–Vietnamese, full feature set above |
| V2 | Cloud sync, online catalog, expanded language pairs |
| V3 | Community, AI tutor, mobile |
