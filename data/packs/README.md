# Additional content packs

Drop additional Lexora deck packs into this directory as `<slug>.json`
files. The repository ships with a single demo pack in
[../seed/demo_pack.json](../seed/demo_pack.json); anything in this
folder is optional and only loaded when explicitly imported by the
user or registered in the seeder.

See [../README.md](../README.md) for the schema and the quality bar.

This directory is intentionally empty in the open-source repo so that
the build does not embed any third-party material. Owners who want to
ship a curated production pack with their build should add the JSON
file here and update `apps/desktop/src-tauri/src/db/seeder.rs` to
include it in the bundled seed list.
