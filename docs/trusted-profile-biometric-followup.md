# Trusted profile — native biometric follow-up (future)

PR #976 ships **adult PIN only** for trusted-profile adult unlock. Client-asserted
`unlock_method: biometric` must never grant parent authority.

## Target architecture (future native work)

1. Server creates a **one-time biometric challenge** bound to:
   - `trustedDeviceId`
   - `familyId`
   - `parentId`
   - `nonce`
   - `expiry`
2. Native iOS/Android performs biometric unlock of a **device-bound private key**.
3. Client signs the challenge; server verifies signature against a previously registered public key.
4. Server consumes nonce once, then issues parent privilege / select-parent session.

## Requirements

- iOS: Secure Enclave / Keychain where supported
- Android: Keystore + BiometricPrompt
- Replay protection (single-use nonce)
- Key registration only under authenticated parent authority
- Trusted device revoke must invalidate associated biometric key association

## Out of scope for PR #976

Do not ship insecure biometric string acceptance. UX uses adult PIN until native proof exists.
