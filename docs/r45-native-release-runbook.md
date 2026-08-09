# R4.5 native store release runbook

Short checklist for **iOS/iPadOS** and **Android** binaries after `main` includes PR #939, #940, and release-hardening fixes.

Do **not** upload from CI agents without founder approval. Do **not** commit secrets.

## iOS / iPadOS (1.3, build ≥ 30)

1. Clean checkout of latest `main` (must include committed `ios/` — never `rm -rf ios`; only remove `ios/App/Pods` and `ios/App/Podfile.lock` if you need a fresh `pod install`).
2. `export META_CLIENT_TOKEN='…'` (Meta App Dashboard → Settings → Advanced). **Required** for `FacebookClientToken` in Info.plist.
3. `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"` (Node 20).
4. `npm install --include=dev --legacy-peer-deps` (or `npm ci` with the same flags) **before** release prepare.
5. **`npm run ios:release:prepare`** (canonical release prep — not dev-only `cap:sync:ios` alone).
6. `node scripts/verify-meta-native-release.mjs --ios` and `npm run verify:ios-no-att-meta` (optional double-check).
7. **Do not** run `npm ci` / `npm install` between release prepare and **Product → Archive** — that restores unpatched `node_modules` (Facebook privacy patch). Re-run prepare if dependencies were reinstalled.
8. Open `ios/App/App.xcworkspace` in Xcode on Mac.
9. Confirm **MARKETING_VERSION** 1.3, **CURRENT_PROJECT_VERSION** ≥ 30 (never reuse rejected build 28).
10. **Product → Archive** (Release, Any iOS Device).
11. Inspect `.xcarchive`: no `NSUserTrackingUsageDescription`, no ATT frameworks, `WidgetRoutine.appex` embedded, App Group entitlements, `SKAdNetworkItems`, `FacebookClientToken` present (do not log value).
12. Upload to App Store Connect (manual).
13. App Privacy: **Tracking = No**. Paste Review Notes from `docs/app-store-review-notes.md` (build 30).

## Android (1.3.0, versionCode > Play max)

1. Clean checkout of latest `main`.
2. **Required:** `android/app/google-services.json` (Firebase) from release secrets.
3. **Required:** Google OAuth Web client id env var for Sign-In (see `docs/app-store-iap.md` / Android release scripts).
4. **Required for release AAB:** upload keystore under `assets/play-store/signing/`, alias, and passwords via secret store only (dev keystore path is separate).
5. Confirm release SHA-256 fingerprint via `scripts/assert-android-release-signing.mjs` and Play Console.
6. `npm install --include=dev --legacy-peer-deps`
7. `npm run cap:sync:android` (includes `verify-android-release-hardening` and `verify-meta-native-release.mjs --android`).
8. Confirm Play Console **highest versionCode** on any track; repo canonical is in `assets/play-store/android-version.json` (currently **11** after R4.5 hardening — raise if Play already has 11).
9. `npm run android:aab` on a machine with **Android SDK** and upload keystore (`assets/play-store/signing/`).
10. Inspect AAB (bundletool): `targetSdkVersion` 36, widget receivers present, `AdvertiserIDCollectionEnabled` false in manifest.
11. Upload to **Internal testing** first; founder QA with family widget flag override.
12. Update Play **Data Safety** per `docs/android-play-data-safety-r45.md`.

**Dependency order:** install dependencies **before** `cap:sync:android` / `android:aab`. Do **not** run `npm ci` / `npm install` between sync and Gradle bundle — re-run `cap:sync:android` if `node_modules` was refreshed.

## Gates before either store

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
# See AGENTS.md for test:gate env (runtime + email key unset).
npm run test:gate
npm run audit:i18n:strict
npm run audit:i18n:baseline
```

Widget flags remain **globally OFF**; pilot via family override only.
