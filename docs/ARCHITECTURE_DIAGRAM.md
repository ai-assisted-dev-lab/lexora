# Lexora Architecture Diagram

This diagram captures the current offline-first desktop architecture and the owner-only Admin/Data Studio boundary. It is intentionally scoped to implemented local workflows and does not include cloud sync, marketplace, public community, or AI tutor services.

```mermaid
flowchart TB
  subgraph Desktop["Windows desktop app"]
    subgraph WebView["Tauri WebView - React"]
      Shell["AppShellLayout\nnavigation, command palette, route guards"]
      LearnerRoutes["Learner screens\nHome, Discover, Library, Review,\nStudy Session, Word Detail, Achievements,\nStats, Settings"]
      AdminRoute["Owner-only Data Studio\nVocabulary, Decks, Validation"]
      CommandClients["Typed command clients\nsrc/services/commands"]
      E2E["E2E browser mock\nscreenshot and Playwright fixtures"]
    end

    subgraph Native["Tauri Rust backend"]
      Auth["Auth/session/owner guard"]
      Search["Search commands\nFTS5 + fuzzy ranking"]
      Decks["Deck and library commands\npaged catalog/library access"]
      Words["Word detail commands\nsenses, examples, IPA, relations"]
      Review["Review commands\nFSRS queues and sessions"]
      Progress["Progress, achievements,\nstats, reminders"]
      Admin["Admin commands\npaged vocabulary/deck tables,\ndata-quality scan"]
      LocalOps["Local ops\nbackup, restore, import/export,\nupdater and notification plumbing"]
    end

    subgraph Storage["Local storage"]
      UserDb["SQLite user/app database"]
      ContentDb["SQLite content catalog"]
      Files["App data files\naudio cache, backups, exports"]
    end
  end

  Shell --> LearnerRoutes
  Shell --> AdminRoute
  LearnerRoutes --> CommandClients
  AdminRoute --> CommandClients
  E2E -. aliases Tauri IPC for browser tests .-> CommandClients

  CommandClients --> Auth
  CommandClients --> Search
  CommandClients --> Decks
  CommandClients --> Words
  CommandClients --> Review
  CommandClients --> Progress
  CommandClients --> Admin
  CommandClients --> LocalOps

  Auth --> UserDb
  Search --> ContentDb
  Decks --> ContentDb
  Decks --> UserDb
  Words --> ContentDb
  Words --> UserDb
  Review --> UserDb
  Review --> ContentDb
  Progress --> UserDb
  Admin --> UserDb
  Admin --> ContentDb
  LocalOps --> UserDb
  LocalOps --> ContentDb
  LocalOps --> Files

  AdminRoute -. hidden from learners .-> Auth
  Admin -. requires owner session .-> Auth
```

## Runtime Boundaries

- The React frontend never connects directly to SQLite. It calls typed Tauri commands.
- The Rust command layer owns database access, auth checks, migration execution, search ranking, review scheduling persistence, and admin enforcement.
- Data Studio is owner-only in the sidebar/route layer and again in every admin command.
- Core learner workflows are local-only and do not need network access.
- Updater/content manifest/TTS-adjacent plumbing is isolated from core study flows.

## Large Catalog Path

- Discover and Library render incrementally instead of mounting every card at once.
- Admin vocabulary and deck tables request pages from Rust instead of loading the whole catalog into the WebView.
- Search is executed in SQLite through indexed/FTS queries before results cross the IPC boundary.
- Heavy owner tooling is lazy-loaded so learner routes do not pay that bundle cost.

See [PERFORMANCE.md](PERFORMANCE.md) for the current large-data notes and benchmark command.
