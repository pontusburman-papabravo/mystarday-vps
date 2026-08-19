# iOS Xcode Cloud release (1.4+)

Normal iOS releases: **Cursor/GitHub → merge `main` → `ios-v*` tag → Xcode Cloud archive → TestFlight → App Store Connect**. Local Xcode is **not** part of the normal release flow.

## Preconditions

- `META_CLIENT_TOKEN` configured as an Xcode Cloud **Secret** (never commit or log it).
- Xcode Cloud uses **Xcode 26 / iOS 26 SDK** or newer (App Store Connect workflow setting).
- Release tag `ios-v<version>` points to **merged `main`**, not a PR branch.

## Release flow

1. **Prepare marketing version** — `npm run ios:xcode-cloud:version -- 1.4` (updates `MARKETING_VERSION` in `project.pbxproj`; does not bump `CURRENT_PROJECT_VERSION`).
2. **PR + focused CI** — `npm run test:gate` and iOS release tests (see below).
3. **Merge to `main`**.
4. **Tag** — `ios-v1.4` on merged `main` (triggers Xcode Cloud archive when workflow is configured for `ios-v*` tags).
5. **Xcode Cloud archive** — `ci_post_clone` runs `cap:sync:ios` **once**, Meta/native verifiers, `ci_pre_xcodebuild` re-verifies + applies `CI_BUILD_NUMBER`, `ci_post_xcodebuild` inspects the real `.xcarchive`.
6. **Release gates** — ATT absent, Meta advertiser ID/tracking disabled, `META_CLIENT_TOKEN` present, widget excluded (1.4).
7. **TestFlight** — verify distribution from Xcode Cloud / App Store Connect.
8. **Physical-device smoke** on TestFlight (iPhone): fresh install, login/signup, parent/child core flow, **no ATT popup**, no Meta/privacy crash, supported iOS versions OK, **no widget** in this build.
9. **App Store Connect privacy** — data collected must be accurate; **no data marked “Used for Tracking”** if shipping the no-tracking contract (no cross-app tracking, no ATT, no IDFA).
10. **App Review** — submit with review note (see below).

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
  test/ios-main-deployment-target.test.js \
  test/ios-widget-release-hold.test.js \
  test/ios-archive-release-verifier.test.js
```

## Related docs

- [`docs/app-store-review-notes.md`](app-store-review-notes.md) — historical review context
- [`docs/meta-app-events-store-release.md`](meta-app-events-store-release.md) — Meta privacy defaults

Legacy Mac/Xcode archive path: [`docs/r45-native-release-runbook.md`](r45-native-release-runbook.md) (superseded by this flow for normal releases).
