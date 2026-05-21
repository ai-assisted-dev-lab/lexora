# Lexora — Decisions Log

> Version: 1.0 | Status: Locked decisions are final for V1

---

## Locked Decisions

These decisions are final for V1. Future agents must not change them.

### Product

| Decision      | Value                     | Reason                                   |
| ------------- | ------------------------- | ---------------------------------------- |
| Product name  | Lexora                    | Portfolio identity                       |
| Language pair | English ↔ Vietnamese      | Focused V1 scope                         |
| Platform      | Windows-first desktop     | Portfolio quality bar; native feel       |
| Theme         | Light only — no dark mode | Design identity; avoids dual-maintenance |
| Admin access  | Owner-only Data Studio    | Security and separation of concerns      |

### Stack

| Concern         | Choice                                 | Reason                                         |
| --------------- | -------------------------------------- | ---------------------------------------------- |
| Desktop shell   | Tauri 2                                | Lightweight, Rust-native, good Windows support |
| UI framework    | React 18 + TypeScript                  | Broad ecosystem, team familiarity              |
| Build tool      | Vite                                   | Fast DX, good Tauri integration                |
| UI components   | shadcn/ui + Tailwind CSS               | Composable, customizable, no hidden magic      |
| Animations      | Framer Motion                          | Best-in-class React animation library          |
| Global state    | Zustand                                | Lightweight, no boilerplate                    |
| Data fetching   | TanStack Query                         | Excellent async state and caching              |
| Database        | SQLite + SQLCipher                     | Local, encrypted, reliable                     |
| Search          | SQLite FTS5 + fuzzy                    | No external dependency, offline                |
| Review engine   | Real FSRS (Rust)                       | Correctness; not approximated                  |
| Charts          | Recharts                               | React-native, composable                       |
| Icons           | Lucide React                           | Consistent, MIT licensed                       |
| Package manager | pnpm                                   | Fast, disk-efficient                           |
| Testing         | Vitest + RTL + Playwright + Rust tests | Full stack coverage                            |

### Architecture

| Decision                | Value                            | Reason                     |
| ----------------------- | -------------------------------- | -------------------------- |
| Offline-first           | Core features require no network | Reliability and trust      |
| All DB access via Rust  | JS never touches SQL             | Security and correctness   |
| IPC for all native ops  | Typed Tauri commands             | Clean separation, testable |
| Auth enforced in Rust   | Not only in UI                   | Defense in depth           |
| Admin guard at 3 layers | DB + IPC + route                 | Belt and suspenders        |

---

## Deferred Decisions

These are explicitly deferred to post-V1 and must not be partially implemented.

| Topic                   | Deferred Decision                | Notes                               |
| ----------------------- | -------------------------------- | ----------------------------------- |
| Cloud sync              | Architecture to support sync     | Normalized DB schema is cloud-ready |
| Multi-device            | Identity and conflict resolution | Requires cloud first                |
| Online catalog          | Pack distribution CDN            | Out of V1 scope                     |
| Community features      | User sharing, ratings            | Post-V2                             |
| AI tutor                | LLM integration                  | Post-V2                             |
| Pronunciation recording | Mic input + comparison           | Post-V1                             |
| Mobile                  | iOS and Android                  | Post-V2                             |
| Third language          | Beyond EN↔VI                     | Post-V1                             |
| Payment                 | Subscription model               | Not yet designed                    |
| Dark mode               | Dark palette variant             | Not designed; not a priority        |
| Advanced update diffing | Delta pack updates               | Post-V1                             |

---

## Rejected Decisions

Approaches that were explicitly considered and rejected.

| Rejected Approach        | Rejection Reason                                   |
| ------------------------ | -------------------------------------------------- |
| Web app (browser-based)  | Does not meet portfolio bar; no native feel        |
| Electron                 | Heavier than Tauri; worse performance              |
| Flutter for desktop      | Less control over native APIs; smaller ecosystem   |
| IndexedDB / localStorage | Not suitable for encrypted desktop DB              |
| Client-side JS FSRS      | Correctness risk; Rust is authoritative            |
| Mock FSRS approximation  | Inaccurate scheduling harms user learning          |
| Dark mode in V1          | Doubles design and test surface; identity is light |
| Community decks in V1    | Scope creep; content quality risk                  |

---

## Open Questions (To Be Resolved in Later Prompts)

| Question                             | Status               | Target Prompt |
| ------------------------------------ | -------------------- | ------------- |
| SQLCipher key derivation strategy    | Resolved — Prompt 22 | Prompt 22     |
| Audio package format and compression | Open                 | Prompt 44     |
| Backup archive format                | Open                 | Prompt 54     |
| Update server hosting                | Open                 | Prompt 56     |
| Installer type (.msi vs NSIS)        | Open                 | Prompt 58     |
| First-run owner setup flow           | Open                 | Prompt 21     |

### SQLCipher key derivation strategy (Resolved)

**Decision:** Use a 256-bit random key (no passphrase KDF) stored in the OS
native credential store via the `keyring` crate. Key is applied to SQLCipher
using the raw-key pragma form (`PRAGMA key = "x'<hex>'"`) as the very first
operation on the connection.

**Rationale:** A random high-entropy key does not benefit from PBKDF2
stretching; skipping the KDF reduces open latency and removes the need for a
user-visible passphrase. The OS keychain provides tamper-evident storage that
is scoped to the user's OS account — appropriate for a single-user local app.

**Limitation:** Encryption is not active by default. The `sqlcipher` Cargo
feature must be passed at build time. See `docs/SECURITY.md` for activation
steps and full threat model.
