# Lexora Privacy Notice

> Effective date: 2026-05-21  
> Scope: Lexora v0.1.x desktop application

Lexora is a local-first desktop application. The short version is: we do not
operate a server, we do not collect telemetry, and we do not transmit your
study data anywhere. This document spells out what data the app stores, where,
and what you should know before sharing the device or backup files.

## Data Lexora stores locally

All of the following live in the per-user app data directory (on Windows,
typically `%AppData%\com.kieran.lexora\`):

- **Account records** — username, role (`owner` / `learner`), Argon2id
  password hash, last-login timestamp. The raw password is never stored.
- **Learning data** — installed decks, vocabulary words, FSRS state, review
  history, study sessions, weak-word lists.
- **Settings** — language, pronunciation, notification preferences,
  scheduled-backup state.
- **Achievements and progress events** — XP, streak, achievement unlocks.
- **Notification queue** — pending in-app reminders evaluated by the app.
- **Audio cache** — bytes for pronunciations that have been streamed or
  downloaded for offline replay.
- **Backups** — JSON archives produced by Settings → Backup. By default
  these live under the backups subfolder, but you can choose any path.

## Data Lexora never collects

- We do not record analytics, crash reports, or product-usage telemetry off
  the device.
- We do not include third-party trackers, ad SDKs, or fingerprinting libraries.
- We do not transmit your account or learning data over the network. The
  only outbound network calls in v0.1.x are the optional Tauri updater check
  (see below).

## Optional outbound calls

| Feature              | What it sends                                            | When                                                              |
| -------------------- | -------------------------------------------------------- | ----------------------------------------------------------------- |
| App-update check     | Currently installed version + platform string            | Only when an updater endpoint is configured and the user opts in. |
| Content-update check | Currently installed content version + bundled identifier | Only when a manifest URL is configured.                           |
| Browser TTS fallback | The single word being pronounced                         | Only when local audio is missing AND TTS fallback is enabled.     |

Each of these is configurable in **Settings**. With the default
configuration on a clean build, Lexora makes no network calls.

## Encryption at rest

When built with the `sqlcipher` Cargo feature, the local database is
AES-256 encrypted with a per-installation random key stored in the OS
credential manager (Windows Credential Manager / macOS Keychain / Linux
Secret Service). See [docs/SECURITY.md](docs/SECURITY.md) for the full
threat model.

## Sharing the device

Lexora ships with seeded `owner` and `learner` accounts whose passwords
match the username. **Rotate these from Settings → Security → Change
Password before sharing the device** — otherwise anyone with desktop
access can read learning data and (with the owner account) edit the
vocabulary corpus.

## Sharing backups

Backup JSON files include account metadata, settings, deck content (if
selected), review history, and audio manifests. They do **not** include the
encryption key or raw password material. Treat backup files as study
material that you would not want to publicly share — they contain learning
patterns, weak-word lists, and timestamps.

## Your controls

- **Reset learning data** — _Coming soon._ For now, delete the per-user
  data folder while the app is closed to remove all local state.
- **Uninstall** — Removes the program files but leaves the per-user data
  folder intact for portability. Delete the folder manually for a clean
  removal.
- **Export** — Settings → Backup → Create Backup produces a JSON archive
  you can move off the device.

## Questions

For privacy questions or to request the removal of any locally cached data
that may have been shared with us through bug reports, contact the
maintainers via the channel listed in [SUPPORT.md](SUPPORT.md).
