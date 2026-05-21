# Lexora — Security Notes

> Version: 1.1 | Covers: V1 local desktop (Windows-first)  
> Last updated: 2026-05-21 (commercial-polish pass)

---

## Scope

This document describes the local-data security model for Lexora V1. V1 is a
single-user offline desktop application. There is no server, no cloud sync, and
no network-facing API. The threat model is correspondingly narrow.

---

## Database Encryption Strategy

### Chosen approach

**SQLCipher** (AES-256 CBC) with a per-installation random key stored in the
OS-native credential store.

| Layer              | Choice                                               |
| ------------------ | ---------------------------------------------------- |
| Encryption library | SQLCipher 4.x (bundled via `rusqlite` feature)       |
| Cipher             | AES-256-CBC (SQLCipher 4 default)                    |
| Key material       | 256-bit random value (32 bytes / 64 hex chars)       |
| Key derivation     | None — raw key, not a passphrase                     |
| Key storage        | OS native credential store (see below)               |
| Key exposure       | Never written to disk in plaintext; never sent to JS |

The raw-key pragma form is used:

```sql
PRAGMA key = "x'<64 lowercase hex characters>'";
```

This bypasses SQLCipher's default PBKDF2 passphrase KDF entirely, which is
appropriate here because the key itself is high-entropy random material, not a
user-supplied password.

### Key lifecycle

1. **First launch** — `db::encryption::get_or_create_key()` finds no entry in
   the OS keychain, generates 32 random bytes via the OS CSPRNG
   (`getrandom::getrandom`), stores them as 64 hex chars, and returns the key.
2. **Every subsequent launch** — the stored key is retrieved, its format is
   validated (64 hex digits), and it is applied as the first pragma on the
   connection.
3. **App uninstall / factory reset** — `db::encryption::delete_key()` can
   remove the credential. Without the key the database file is permanently
   inaccessible.

### OS credential store

| Platform | Backend                                              |
| -------- | ---------------------------------------------------- |
| Windows  | Windows Credential Manager (`wincred` API)           |
| macOS    | Keychain Services                                    |
| Linux    | libsecret / Secret Service (D-Bus) or kernel keyring |

The `keyring` crate (v2) provides the cross-platform abstraction.

---

## Encryption Feature Gate

**The `sqlcipher` Cargo feature is NOT enabled in the default build.**

The default `cargo build` and all `cargo test` invocations compile plain SQLite
(no encryption). This keeps the developer build fast and avoids a hard
dependency on Perl + NASM (required by OpenSSL's configure step on Windows).

The encryption plumbing (`db::encryption` module, `PRAGMA key` application) is
compiled unconditionally so it is always tested and is one flag away from
activation.

### How to activate SQLCipher

**Prerequisite on Windows:** install Strawberry Perl and NASM (required by
`openssl-src` vendored build).

```sh
# Single build with encryption
cargo build --features sqlcipher

# Make encryption the default for a workspace
# In Cargo.toml change:
#   default = []
# to:
#   default = ["sqlcipher"]
```

The release CI should pass `--features sqlcipher` (or set `default =
["sqlcipher"]`) before the first public binary is distributed. All integration
tests and migration tests will run correctly with the feature active because
the migration runner operates on the already-keyed connection.

### Plaintext → encrypted migration

If a user has an existing plaintext `user.db` from a build without the
`sqlcipher` feature:

1. The SQLCipher-enabled build will try to open the file with `PRAGMA key`.
2. SQLCipher will treat the unkeyed file as corrupted and return an error.
3. The app will fail to start with a clear error.

**Resolution (V1):** delete the old `user.db` and let the app create a fresh
encrypted database. Since V1 has no real user data yet, this is acceptable.
A migration utility (`sqlcipher_export` pragma) can be added later.

---

## Threat Model

### What encryption protects against

- **File theft**: copying `user.db` to another machine. Without the key stored
  in the original machine's credential store, the file contents are
  unintelligible AES ciphertext.
- **Simple disk forensics**: scanning raw disk sectors for recognisable SQLite
  page headers.

### What encryption does NOT protect against

- **Malware with user-level access to the same machine.** Any process running
  as the same Windows user can access Windows Credential Manager and retrieve
  the key. This is inherent to any local keychain scheme.
- **Malware with admin/SYSTEM access.** Such an attacker can read the key
  regardless of storage mechanism.
- **Forgotten key.** If the Credential Manager entry is deleted (e.g. by a
  Windows profile reset), the database is permanently inaccessible. There is no
  recovery mechanism in V1.
- **Backup files.** The SQLite `.db` file backed up to a USB drive or cloud
  folder by the user will carry the encryption. The backup is protected only as
  long as the key (stored on the original machine) is available. A future backup
  feature should bundle the key with the backup using a user-supplied passphrase.
- **Memory.** The key is briefly held in a Rust `String` on the stack during
  `db::open()`. It is not deliberately zeroed after use (no `ZeroizeOnDrop`).
  V1 accepts this risk; a future hardening pass should use `secrecy::SecretString`.

---

## Key Management Assumptions

| Assumption                                           | Implication                                                                |
| ---------------------------------------------------- | -------------------------------------------------------------------------- |
| One Windows user account per installation            | Key is scoped to the user account; multi-user setups are unsupported in V1 |
| Windows Credential Manager is not disabled by policy | Enterprise machines with restrictive GPO may block this; add a fallback    |
| First-launch key generation succeeds                 | If `getrandom` fails (rare), the app cannot open the DB                    |
| User does not manually delete the keychain entry     | No self-service recovery path in V1                                        |

---

## Account Credentials

### Default seeded accounts

On first launch the database is seeded with two accounts:

| Username  | Password  | Role    | Purpose                                  |
| --------- | --------- | ------- | ---------------------------------------- |
| `owner`   | `owner`   | owner   | Admin / Data Studio access for the owner |
| `learner` | `learner` | learner | Day-to-day study account                 |

These defaults exist so the app is usable on first launch without a setup
wizard. **They are intentionally low-entropy and must be rotated before the
device is shared, before publishing a build to other users, or before the
backup file leaves the install machine.**

### Rotating credentials

- UI flow: **Settings → Security → Change Password**.
- Backend command: `change_password` (Tauri command).
- Backend module: `apps/desktop/src-tauri/src/auth/mod.rs#change_password`.
- The minimum password length is enforced server-side
  (`MIN_PASSWORD_LENGTH`). The frontend mirrors the rule but is not the
  source of truth.
- Passwords are stored as Argon2id PHC strings using OS-CSPRNG salts. The
  raw password is never logged, persisted, or returned across the IPC
  boundary.

### First-run warning

The `account_uses_default_password` command returns `true` whenever the
currently authenticated account still hashes the seeded password. The
Settings → Security panel surfaces an inline warning while this is true.
Owners should treat shipping a build with this flag enabled as a release
blocker.

---

## Backup Restore Hardening

User-supplied backup paths are run through `fs::canonicalize` before any
I/O. This:

- Resolves `..` traversal components to a concrete absolute path before
  validation.
- Resolves symlinks to their real target so the reader sees a stable
  path, not the link.
- Rejects paths that resolve to anything other than a regular file
  (directories, devices, sockets).
- Requires the resolved file to carry a `.json` extension so obviously
  wrong inputs (`.db`, `.exe`, …) are short-circuited before parsing.

See `apps/desktop/src-tauri/src/commands/backup.rs#canonicalize_existing_file`.

---

## Non-goals for V1

- User-controlled passphrase on the database
- Encrypted backups with key escrow
- Hardware key storage (TPM, YubiKey)
- Key rotation
- Audit logging of DB access
- Memory-safe key handling (`secrecy` crate)

These are documented for future milestones, not blocked.

---

## Files Affected

| File                             | Purpose                                      |
| -------------------------------- | -------------------------------------------- |
| `src-tauri/src/db/encryption.rs` | Key generation, keychain read/write          |
| `src-tauri/src/db/mod.rs`        | Applies `PRAGMA key` before any other pragma |
| `src-tauri/Cargo.toml`           | `sqlcipher` feature, `keyring`, `getrandom`  |
