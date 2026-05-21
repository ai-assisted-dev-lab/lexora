# Getting Help with Lexora

Lexora is an open-source desktop project maintained on a best-effort basis.
This page summarises where to file what kind of report.

## Before opening an issue

1. **Search existing issues.** Someone may already be tracking the bug.
2. **Update first.** Confirm the issue still reproduces on the latest
   `main` build before filing.
3. **Reproduce in a clean profile.** Move
   `%AppData%\com.kieran.lexora\` aside temporarily (or set
   `LEXORA_TEST_PROFILE_DIR`) to rule out local state corruption.

## Bug reports

File a bug at the project's GitHub Issues tracker. Include:

- Lexora version (visible in **Settings → Account → App Version**).
- OS and version (e.g. Windows 11 23H2).
- WebView2 version if relevant (look under
  `HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\` on Windows).
- Steps to reproduce. A 5-step recipe beats a 5-paragraph narrative.
- Expected vs actual behaviour.
- Any panic / error string shown in the in-app toast or console.
- If the issue is rendering-related, attach a screenshot or short
  screen-capture.

Do **not** paste your `user.db` file or backup JSON into a public issue —
those contain personal learning data and (for `user.db`) credential hashes.

## Feature requests

Open a GitHub Discussion (or Issue prefixed with `[feature]`) and describe
the problem you are trying to solve. Concrete user stories beat abstract
feature names.

## Security vulnerabilities

Do **not** open a public GitHub Issue for a security vulnerability.

Instead, email the maintainer at the address listed on the project's
GitHub profile and include:

- A short description of the vulnerability.
- The minimum information needed to reproduce.
- Your preferred response timeline and credit name.

We aim to acknowledge new reports within 5 business days and to coordinate
a fix and disclosure window with you. See [SECURITY.md](docs/SECURITY.md)
for the threat model.

## Translation issues

Lexora ships English and Vietnamese strings. If you find a missing
translation, an awkward phrasing, or a mistranslation, open an Issue with
the label `i18n` and include the locale (`en` / `vi`), the translation
key, and a suggested replacement.

## Commercial support

There is no commercial support tier at this time. Pull requests are
welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).
