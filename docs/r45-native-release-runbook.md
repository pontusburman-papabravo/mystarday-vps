# R4.5 native store release runbook

Short checklist for **iOS/iPadOS** and **Android** binaries after `main` includes PR #939, #940, and release-hardening fixes.

Do **not** upload from CI agents without founder approval. Do **not** commit secrets.

## iOS / iPadOS (1.3, build ≥ 30)

1. Clean checkout of latest `main`.
2. `export META_CLIENT_TOKEN='…'` (Meta App Dashboard → Settings → Advanced). **Required** for `FacebookClientToken` in Info.plist.
3. `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"` (Node 20).
4. `npm install --include=dev --legacy-peer-deps`
5. **`npm run ios:release:prepare`** (canonical release prep — not dev-only `cap:sync:ios` alone).
6. `npm run verify:meta-native-release` and `npm run verify:ios-no-att-meta`
7. Open `ios/App/App.xcworkspace` in Xcode on Mac.
8. Confirm **MARKETING_VERSION** 1.3, **CURRENT_PROJECT_VERSION** ≥ 30 (never reuse rejected build 28).
9. **Product → Archive** (Release, Any iOS Device).
10. Inspect `.xcarchive`: no `NSUserTrackingUsageDescription`, no ATT frameworks, `WidgetRoutine.appex` embedded, App Group entitlements, `SKAdNetworkItems`, `FacebookClientToken` present (do not log value).
11. Upload to App Store Connect (manual).
12. App Privacy: **Tracking = No**. Paste Review Notes from `docs/app-store-review-notes.md` (build 30).

## Android (1.3.0, versionCode > Play max)

1. Clean checkout of latest `main`.
2. **Required:** `android/app/google-services.json` (Firebase) from release secrets.
3. **Required:** Google OAuth Web client id env var for Sign-In (see `docs/app-store-iap.md` / Android release scripts).
4. **Required for release AAB:** upload keystore under `assets/play-store/signing/`, alias, and passwords via secret store only (dev keystore path is separate).
5. Confirm release SHA-256 fingerprint via `scripts/assert-android-release-signing.mjs` and Play Console.
6. `npm install --include=dev --legacy-peer-deps`
7. `npm run cap:sync:android` (includes `verify-android-release-hardening`).
8. Confirm Play Console **highest versionCode** on any track; repo canonical is in `assets/play-store/android-version.json` (currently **11** after R4.5 hardening — raise if Play already has 11).
9. `npm run android:aab` on a machine with **Android SDK** and upload keystore (`assets/play-store/signing/`).
10. Inspect AAB (bundletool): `targetSdkVersion` 36, widget receivers present, `AdvertiserIDCollectionEnabled` false in manifest.
11. Upload to **Internal testing** first; founder QA with family widget flag override.
12. Update Play **Data Safety** per `docs/android-play-data-safety-r45.md`.

## Gates before either store

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
# See AGENTS.md for test:gate env (runtime + email key unset).
npm run test:gate
npm run audit:i18n:strict
npm run audit:i18n:baseline
```

Widget flags remain **globally OFF**; pilot via family override only.
