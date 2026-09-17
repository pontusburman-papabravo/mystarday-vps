# iOS Xcode Cloud release (1.4+)

Normal iOS releases: **Cursor/GitHub → merge `main` → `ios-v*` tag → Xcode Cloud archive → TestFlight → App Store Connect**. Local Xcode is **not** part of the normal release flow.

## Standing rules — Apple version trains

- **Web deploy is not an App Store version.** Capacitor loads the remote web app. Ordinary web/UX/backend deploys do **not** get a new IPA, a new App Store version, or an `ios-v*` tag.
- **A closed train cannot take another binary.** After Apple approves a `CFBundleShortVersionString` (ITMS-90186 / ITMS-90062), add it to `config/release-compliance-gate.json` → `versionSources.closedIosMarketingVersions` and bump `MARKETING_VERSION` in the same PR so the *next* native archive is valid. `npm run ios:xcode-cloud:version` and Xcode Cloud `ci_pre_xcodebuild` refuse closed trains.
- **Repo bump ≠ store submission.** Bumping `MARKETING_VERSION` to **1.4.6** only prepares the next native archive. Tag `ios-v*` and Submit only when a native binary is actually required (plugins, permissions, entitlements, screenshot replacement after Ready for Distribution, or Apple requires a new binary).
- **Closed trains:** `1.4.3`, `1.4.4`, **`1.4.5`**. **Next native train:** `1.4.6`. Do not upload build 1233 or any other `1.4.5` binary. Do not reuse rejected builds **1182** or **1188**.

## Preconditions

- `META_CLIENT_TOKEN` configured as an Xcode Cloud **Secret** (never commit or log it).
- Xcode Cloud uses **Xcode 26 / iOS 26 SDK** or newer (App Store Connect workflow setting).
- Release tag `ios-v<version>` points to **merged `main`**, not a PR branch.

## Release flow

1. **Prepare marketing version** — only when a native binary is required: `npm run ios:xcode-cloud:version -- 1.4.6` (updates `MARKETING_VERSION` in `project.pbxproj`; does not bump `CURRENT_PROJECT_VERSION`). **1.4.5, 1.4.4 and 1.4.3 are closed** (ITMS-90186 / ITMS-90062).
2. **PR + focused CI** — `npm run test:gate` and iOS release tests (see below).
3. **Merge to `main`**.
4. **Tag** — `ios-v1.4.6` on merged `main` (triggers Xcode Cloud archive when workflow is configured for `ios-v*` tags). Skip this step unless you intend to ship a native binary.
5. **Xcode Cloud archive** — `ci_post_clone` runs `cap:sync:ios` **once**, Meta/native verifiers, `ci_pre_xcodebuild` refuses closed trains + applies `CI_BUILD_NUMBER`, `ci_post_xcodebuild` inspects the real `.xcarchive`.
6. **Release gates** — ATT absent, Meta advertiser ID/tracking disabled, widget excluded (1.4).
7. **TestFlight** — verify distribution from Xcode Cloud / App Store Connect.
8. **Physical-device smoke** on TestFlight (iPhone): fresh install, login/signup, parent/child core flow, **no ATT popup**, no Meta/privacy crash, supported iOS versions OK, **no widget** in this build.
9. **App Store Connect privacy** — data collected must be accurate; **no data marked “Used for Tracking”** if shipping the no-tracking contract (no cross-app tracking, no ATT, no IDFA).
10. **App Store Connect version 1.4.6** — create this version only for a real native submission. Apple copies metadata from the current version. Verify Swedish + English (UK). Replace screenshots on **this** version (not on an already-approved page). Check Monthly/Yearly **ASC status**; add them to the same draft **only if not yet approved**.
11. **App Review** — Review Notes, both review accounts, SIWA, physical IAP path, then Submit. No extra product in this binary.

## Product decisions (1.4)

| Item | Value |
|------|--------|
| Main app minimum iOS | **15.0** |
| WidgetRoutine | **ON HOLD** — source retained, **not embedded** in archive |
| App tracking | **NO** — no ATT framework/API, no `NSUserTrackingUsageDescription` |
| Build number | **Xcode Cloud** `CI_BUILD_NUMBER` applied at pre-archive (committed `CURRENT_PROJECT_VERSION` is a local fallback only) |

## Widget opt-in (future)

Default release excludes `WidgetRoutine.appex`. To embed the widget experiment: set Xcode Cloud env `IOS_INCLUDE_WIDGET=1` (not used for 1.4).

## App Review note (recommended)

```
Version 1.4 does not perform cross-app tracking and does not use AppTrackingTransparency.
The previous ATT integration has been removed.
The app does not request access to IDFA for tracking, and advertiser ID collection
and advertiser tracking are disabled.
The App Store privacy information has been updated accordingly.
```

Mark App Store privacy metadata as a **required human step** before submission — do not claim it is updated until verified in App Store Connect.

## Focused tests

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
node --test test/ios-xcode-cloud-pipeline.test.js \
  test/ios-no-att-release-hardening.test.js \
  test/verify-meta-native-release-platform.test.js \
  test/ios-xcode-cloud-version.test.js \
  test/ios-closed-marketing-train.test.js \
  test/ios-main-deployment-target.test.js \
  test/ios-widget-release-hold.test.js \
  test/ios-archive-release-verifier.test.js
```

## Related docs

- [`docs/app-store-review-notes.md`](app-store-review-notes.md) — historical review context
- [`docs/meta-app-events-store-release.md`](meta-app-events-store-release.md) — Meta privacy defaults

Legacy Mac/Xcode archive path: [`docs/r45-native-release-runbook.md`](r45-native-release-runbook.md) (superseded by this flow for normal releases).
