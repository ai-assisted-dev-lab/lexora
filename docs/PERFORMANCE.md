# Lexora Performance Notes

> Version: 1.0 | Scope: Prompt 59 large-data pass

## Target

Lexora V1 should remain usable with 20k-50k local vocabulary items in SQLite.
The frontend must not request or retain the full vocabulary catalog for search,
Data Studio, deck previews, or normal learner browsing.

## Query Rules

- Vocabulary search stays behind the Rust IPC command and returns bounded
  result sets only.
- Data Studio vocabulary and deck tables are paginated in the database, with a
  maximum page size of 200 records.
- Deck detail previews load only a small word preview, not the full deck
  vocabulary.
- Discover and Library avoid rendering unbounded card grids. They reveal decks
  in fixed-size batches so large local catalogs do not create long mount or
  layout work.
- Owner-only Data Studio code is route-lazy-loaded so learner sessions do not
  pay the admin bundle cost.

## Indexes Reviewed

Migration `0012_performance_indexes.sql` adds indexes for:

- Discover/catalog source and deck title lookups.
- Data Studio prefix search, editorial filters, CEFR filters, and duplicate
  checks.
- Library progress summaries across review cards, review logs, and study
  sessions.

These indexes are additive and do not change product data shape or ownership
rules.

## Benchmark Procedure

Recommended manual checks before release:

1. Seed or import a 20k-50k word fixture locally.
2. Open Search and verify common English, Vietnamese, and typo queries return
   bounded results without visible input lag.
3. Open owner-only Data Studio and page through vocabulary at 25 rows/page.
4. Inspect the renderer process memory while searching and paging; vocabulary
   rows should not accumulate beyond the visible page/search result payloads.
5. Run Rust tests for query contracts:

```powershell
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml --lib
```

For an explicit local timing probe, run the ignored search benchmark with
captured output disabled:

```powershell
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml --lib large_catalog_search_benchmark -- --ignored --nocapture
```

Latest local check on 2026-05-21: the 50k in-memory fixture benchmark returned
4 bounded search results in 37 ms.
