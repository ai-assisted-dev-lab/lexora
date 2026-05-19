# @lexora/review-engine

Lexora's review engine wraps `ts-fsrs` behind a stable, serializable API for English-Vietnamese vocabulary review scheduling.

This package is UI-independent and has no database, Tauri, React, or router dependencies. Dates are accepted by public functions through `now` or `reviewedAt` options so tests and future import/replay jobs can run deterministically.

The package is intended to power persistent review cards, Smart Review queues, and study session modes. Lexora callers should persist `LexoraReviewCardState` rather than importing `ts-fsrs` types directly.
