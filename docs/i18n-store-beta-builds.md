# P-i18n-Store-Metadata-and-Beta-Builds

Controlled **English Beta in Sweden** — store metadata, native beta builds, and rollout gates. <!-- pragma: allowlist secret -->

## Scope

| In scope | Out of scope |
|----------|--------------|
| iOS TestFlight beta with sv + en-GB native resources | Opening UK, USA, EU outside Sweden |
| Android Play Internal Testing with sv + en-GB resources | Public store release |
| Swedish + English store metadata preparation | Regional legal/compliance expansion |
| Screenshot plan | Enabling `english_child_experience` globally |
| Device smoke checklist | Sending test emails to real users |

## Current native versions (source of truth)

| Platform | Marketing | Build / versionCode | Previous | Bump reason |
|----------|-----------|---------------------|----------|-------------|
| iOS | 1.3 | **29** | 28 | Native l10n (sv + en-GB) from #719; must exceed last uploaded build |
| Android | 1.3.0 | **9** | 8 | Same native l10n; must exceed last uploaded versionCode |

Files: `ios/App/App.xcodeproj/project.pbxproj`, `assets/play-store/android-version.json`.

## Market availability

- **Only Sweden** (`country_code=SE`, `market_region=EU`) remains open.
- English is a **product language beta**, not a new market.
- Store locales (sv + en-GB metadata) ≠ opening new countries in App Store Connect / Play Console.

## Native build status

| Platform | Status | Notes |
|----------|--------|-------|
| iOS TestFlight | **READY TO BUILD** on Mac | main `9305f43e` — build 29 includes ATT fix + native l10n |
| Android Internal Testing | **READY TO BUILD** on Mac | versionCode 9 |

**Mac runbook:** `docs/i18n-beta-mac-session-runbook.md`

### iOS commands (local Mac)

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
npm ci --legacy-peer-deps --include=dev
npm run cap:sync:ios
# Open ios/App/App.xcworkspace in Xcode
# Product → Archive → Validate → Distribute → TestFlight
# Expected: MARKETING_VERSION 1.3, CURRENT_PROJECT_VERSION 29
```

### Android commands (local Mac / CI with SDK)

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
npm ci --legacy-peer-deps --include=dev
npm run cap:sync:android   # patches version + l10n into generated android/
npm run android:aab
# Upload assets/play-store/out/*.aab to Play Internal Testing
# Expected: versionName 1.3.0, versionCode 9
```

**Important:** VPS web deploy does **not** update native InfoPlist.strings or Android `res/` on installed apps. Beta testers need the new store build.

## Store metadata

| Locale | iOS doc | Play doc |
|--------|---------|----------|
| sv-SE | `docs/app-store-connect-metadata.md` | `docs/google-play-metadata.md` |
| en-GB | `docs/app-store-connect-metadata-en-GB.md` | `docs/google-play-metadata-en-GB.md` |

Review notes must state: **English is Beta; Sweden only; physical QA pending until device matrix complete.**

## Screenshots

Plan: `docs/i18n-beta-screenshot-plan.md`

## Device smoke gate

Matrix: `docs/i18n-child-core-qa-matrix.md`

`english_child_experience` stays **OFF** until physical smoke is **PASS** on at least one iOS and one Android device.

## Rollout

Plan: `docs/i18n-beta-rollout-plan.md`

Recommended cohort order after test-family PASS:

1. 1 internal test family
2. 3–5 explicitly approved Swedish families
3. 10–20 English Beta opt-in families
4. Broader Sweden opt-in (explicit decision required)

## Rollback

| Layer | Action |
|-------|--------|
| English Child flag | `DELETE FROM family_features WHERE feature_slug='english_child_experience' AND family_id=$1` — child reverts to sv-SE on next session; no data loss |
| Web (VPS) | `git revert` deploy — does not change installed native resources |
| Native | Reinstall previous TestFlight / Internal build, or ship corrected build |

## Next phase

**P-i18n-Beta-Feedback-and-Stabilisation** — real language reports, native bugs, retention per locale. No new markets.
