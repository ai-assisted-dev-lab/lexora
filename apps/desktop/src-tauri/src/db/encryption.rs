// Functions in this module are live code when compiled with `--features
// sqlcipher`.  Without that feature they are dormant but we keep them compiled
// so unit tests run and so activation is a one-flag operation.
#![allow(dead_code)]

// ── DB Encryption Key Management ─────────────────────────────────────────────
//
// Strategy: one random 256-bit key per installation, stored in the OS-native
// credential store (Windows Credential Manager, macOS Keychain, Linux Secret
// Service).  The key is generated once with the OS CSPRNG, hex-encoded, and
// handed directly to SQLCipher's raw-key pragma:
//
//   PRAGMA key = "x'<64 hex chars>'";
//
// The key is NEVER written to disk in plaintext, logged, or sent over IPC to
// the JavaScript layer.  All encryption/decryption happens transparently inside
// the SQLite page layer; the rest of the codebase sees a normal rusqlite
// Connection.
//
// This module is compiled unconditionally so its unit tests run in every build.
// The `get_or_create_key` function is only *called* when the `sqlcipher` Cargo
// feature is active (see `db::open`).

use keyring::Entry;

use crate::errors::AppError;

// Credential store identifiers.  Changing these values after deployment will
// cause the key to be "lost" (the app will generate a new one and fail to open
// the existing encrypted database — treat like a key rotation).
const KEYRING_SERVICE: &str = "com.kieran.lexora";
const KEYRING_ACCOUNT: &str = "db_encryption_key";

/// Returns the database encryption key for this installation.
///
/// On the first call the key does not yet exist in the OS keychain, so a new
/// 32-byte cryptographically random key is generated, stored, and returned.
/// On subsequent calls the stored key is retrieved and validated.
///
/// The returned string is 64 lowercase hex characters suitable for SQLCipher's
/// raw-key pragma (`PRAGMA key = "x'<value>'"`) — no passphrase KDF is used.
pub fn get_or_create_key() -> Result<String, AppError> {
    let entry = keychain_entry()?;

    match entry.get_password() {
        Ok(key) => {
            validate_hex64(&key)?;
            Ok(key)
        }
        Err(keyring::Error::NoEntry) => {
            let key = generate_key()?;
            entry.set_password(&key).map_err(|e| {
                AppError::Internal(format!(
                    "Failed to store DB encryption key in OS keychain: {e}"
                ))
            })?;
            Ok(key)
        }
        Err(e) => Err(AppError::Internal(format!(
            "Failed to retrieve DB encryption key from OS keychain: {e}"
        ))),
    }
}

/// Removes the stored key from the OS keychain.
///
/// **Destructive.** After calling this the existing encrypted database cannot
/// be opened.  Intended only for factory-reset / uninstall flows.
#[allow(dead_code)]
pub fn delete_key() -> Result<(), AppError> {
    keychain_entry()?
        .delete_password()
        .map_err(|e| AppError::Internal(format!("Failed to delete DB key from OS keychain: {e}")))
}

// ── Private helpers ───────────────────────────────────────────────────────────

fn keychain_entry() -> Result<Entry, AppError> {
    Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT)
        .map_err(|e| AppError::Internal(format!("Failed to access OS keychain: {e}")))
}

/// Generates a fresh 32-byte (256-bit) random key via the OS CSPRNG and
/// returns it as 64 lowercase hex characters.
fn generate_key() -> Result<String, AppError> {
    let mut bytes = [0u8; 32];
    getrandom::getrandom(&mut bytes)
        .map_err(|e| AppError::Internal(format!("Cryptographic RNG failed: {e}")))?;
    Ok(bytes_to_hex(&bytes))
}

fn bytes_to_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

/// Validates that a key retrieved from the keychain has the expected format
/// (exactly 64 ASCII hex digits).  Guards against accidental corruption or
/// manual edits to the credential store entry.
fn validate_hex64(key: &str) -> Result<(), AppError> {
    if key.len() == 64 && key.chars().all(|c| c.is_ascii_hexdigit()) {
        Ok(())
    } else {
        Err(AppError::Internal(
            "DB key retrieved from OS keychain has unexpected format \
             (expected 64 lowercase hex characters)"
                .to_string(),
        ))
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────
//
// These tests cover the pure functions only (generate_key, validate_hex64,
// bytes_to_hex).  Keyring I/O tests are skipped in unit tests because they
// require a real OS credential store, which is unavailable in most CI
// environments.

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generate_key_is_64_hex_chars() {
        let key = generate_key().expect("key generation should not fail");
        assert_eq!(key.len(), 64, "key must be 64 chars");
        assert!(
            key.chars().all(|c| c.is_ascii_hexdigit()),
            "key must be all hex digits"
        );
    }

    #[test]
    fn generate_key_is_not_all_zeros() {
        let key = generate_key().expect("key generation");
        assert_ne!(key, "0".repeat(64), "random key must not be all zeros");
    }

    #[test]
    fn two_generated_keys_differ() {
        let k1 = generate_key().expect("key 1");
        let k2 = generate_key().expect("key 2");
        assert_ne!(k1, k2, "two independently generated keys should differ");
    }

    #[test]
    fn validate_hex64_accepts_valid_key() {
        let key = "a1b2c3d4".repeat(8); // 64 hex chars
        assert_eq!(key.len(), 64);
        assert!(validate_hex64(&key).is_ok());
    }

    #[test]
    fn validate_hex64_rejects_short_key() {
        assert!(validate_hex64(&"ab".repeat(16)).is_err()); // 32 chars
    }

    #[test]
    fn validate_hex64_rejects_non_hex_chars() {
        let key = "z".repeat(64);
        assert!(validate_hex64(&key).is_err());
    }

    #[test]
    fn bytes_to_hex_known_value() {
        let bytes = [0x00u8, 0xff, 0x1a, 0x2b];
        assert_eq!(bytes_to_hex(&bytes), "00ff1a2b");
    }
}
