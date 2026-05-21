# Third-Party Licenses

Lexora is distributed under the [MIT License](LICENSE) and ships compiled
binaries that include numerous open-source libraries from the Rust crate
registry, the npm registry, and the system WebView runtime.

This document gives an overview of the major direct dependencies and their
licensing terms. The complete dependency tree is enumerated in:

- `pnpm-lock.yaml` for the JavaScript / TypeScript side.
- `apps/desktop/src-tauri/Cargo.lock` for the Rust side.

Run `pnpm licenses ls` (workspaces) and `cargo tree --format "{p} {l}"`
(or `cargo about` if installed) for the full machine-readable inventory.

## Runtime — Frontend (React renderer)

| Package                            | License    | Purpose                        |
| ---------------------------------- | ---------- | ------------------------------ |
| `react`, `react-dom`               | MIT        | UI runtime                     |
| `react-router-dom`                 | MIT        | Client-side routing            |
| `framer-motion`                    | MIT        | Animation primitives           |
| `lucide-react`                     | ISC        | Icon set                       |
| `recharts`                         | MIT        | Charts on Stats / Achievements |
| `i18next`, `react-i18next`         | MIT        | i18n runtime                   |
| `i18next-browser-languagedetector` | MIT        | Language detection             |
| `clsx`, `tailwind-merge`           | MIT        | Class composition utilities    |
| `class-variance-authority`         | Apache-2.0 | Variant styling                |
| `@radix-ui/react-slot`             | MIT        | Slot pattern primitive         |
| `@tauri-apps/api`                  | MIT        | Tauri IPC bridge               |
| `tailwindcss`                      | MIT        | Utility CSS                    |
| `autoprefixer`, `postcss`          | MIT        | CSS post-processing            |

## Runtime — Backend (Rust + Tauri)

| Crate                            | License              | Purpose                                |
| -------------------------------- | -------------------- | -------------------------------------- |
| `tauri`, `tauri-plugin-updater`  | Apache-2.0 / MIT     | Desktop shell + signed update plumbing |
| `serde`, `serde_json`            | Apache-2.0 / MIT     | Serialization                          |
| `thiserror`                      | Apache-2.0 / MIT     | Error derivation                       |
| `rusqlite`                       | MIT                  | SQLite bindings (bundled mode)         |
| `argon2`                         | Apache-2.0 / MIT     | Password hashing                       |
| `keyring`                        | Apache-2.0 / MIT     | OS credential store integration        |
| `getrandom`                      | Apache-2.0 / MIT     | OS CSPRNG wrapper                      |
| `base64`                         | Apache-2.0 / MIT     | IPC byte encoding                      |
| `url`                            | Apache-2.0 / MIT     | URL parsing                            |
| `openssl-src` (when `sqlcipher`) | OpenSSL / Apache-2.0 | Vendored OpenSSL for SQLCipher         |

## Runtime — Webview

Lexora uses the system **Microsoft Edge WebView2** runtime on Windows.
WebView2 is distributed by Microsoft under their own license. See
<https://docs.microsoft.com/en-us/microsoft-edge/webview2/> for the
current terms. WebView2 is bootstrapped at install time by the NSIS /
MSI installer; Lexora does not redistribute it.

## Build-time tooling

| Tool                 | License          | Used in            |
| -------------------- | ---------------- | ------------------ |
| `vite`               | MIT              | Renderer bundling  |
| `vitest`             | MIT              | Unit testing       |
| `@testing-library/*` | MIT              | Component testing  |
| `@playwright/test`   | Apache-2.0       | End-to-end testing |
| `eslint`             | MIT              | Linting            |
| `prettier`           | MIT              | Formatting         |
| `typescript`         | Apache-2.0       | Type checking      |
| `cargo` / `rustup`   | Apache-2.0 / MIT | Rust toolchain     |

## Notices

Each listed package retains its own copyright. Their notices and full
license texts are available either in the package's repository or in the
`node_modules/<package>/LICENSE*` / `~/.cargo/registry/src/<crate>/LICENSE*`
files on a developer machine.

If you redistribute Lexora binaries, include the contents of `LICENSE`
and this file together with the distribution.
