# Android Play Data Safety — R4.5 alignment

Use when submitting a build that includes **home screen widgets** and **Meta App Events** (no Advertising ID).

## Product intent (parity with iOS)

- No cross-app tracking for advertising.
- **Google Advertising ID (GAID) not collected** by Meta SDK in this app (manifest + runtime patch force `AdvertiserIDCollectionEnabled` false even after marketing consent).
- **Meta App Events** only after user **marketing consent** (cookie banner / in-app consent).
- Widget **installation_id** and **binding_token** are **security/auth** identifiers for widget API — not advertising IDs.

## What to declare (checklist)

| Data type | Collected? | Purpose | Notes |
|-----------|------------|---------|--------|
| App interactions (Meta App Events) | After marketing consent | Analytics / campaign measurement | No child name, email, family id in event params |
| Device or other IDs — **Advertising ID** | **No** | — | Patched Facebook SDK; manifest meta-data false |
| Device or other IDs — **installation_id** (widget) | Yes, per widget install | Widget API auth scope | Encrypted prefs; not used for ads |
| Authentication tokens (binding_token) | Yes, widget only | Secure widget completion | EncryptedSharedPreferences; never in intents/URLs |
| Push token (FCM) | If user enables push | Notifications | `google-services.json` required for push |
| Photos (profile) | Optional, parent-initiated | Child avatar | Camera permission |

## Security vs advertising identifiers

- **Security/auth:** binding_token, session/JWT in app WebView, widget installation scope, FCM token.
- **Advertising:** GAID / Meta Advertiser ID — **off** by policy and implementation.

## Meta SDK (Android)

- `com.facebook.sdk.AutoLogAppEventsEnabled` = false until marketing consent persisted.
- `com.facebook.sdk.AdvertiserIDCollectionEnabled` = false always (release hardening).
- SKAdNetwork is **iOS-only**; Android install attribution uses Play + Meta aggregated events, not GAID in this configuration.

## Before each Play release

1. Run `npm run verify:android-release-hardening` after `cap:sync:android`.
2. Confirm Data Safety form still matches table above.
3. If Meta or Firebase SDK behavior changes, re-read patched `scripts/android/FacebookEventsPlugin.java.patched` and update this doc.

## Play Console max versionCode

Not readable from this repo. Before upload, compare `assets/play-store/android-version.json` **versionCode** with the highest version on any Play track. Never reuse a consumed versionCode.
