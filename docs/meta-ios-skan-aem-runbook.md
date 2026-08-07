# Meta iOS attribution — SKAdNetwork, AEM, Events Manager

Manual configuration for paid install measurement **without ATT / IDFA**. Code ships SKAdNetwork IDs and consent-gated App Events; dashboard work happens in Meta Business tools.

## Code vs dashboard

| Item | Owner |
|---|---|
| `SKAdNetworkItems` in Info.plist | **Code** — `config/meta-skadnetwork.json` + `patch-ios-skadnetwork.mjs` |
| Meta SDK, AutoLog off, advertiser ID off | **Code** — `AttTrackingCoordinator`, `meta-app-events.js`, Facebook plugin patch |
| ATT / IDFA | **Absent by design** |
| SKAN conversion schema / event priority | **Meta Events Manager** (manual) |
| Aggregated Event Measurement (AEM) | **Meta Events Manager** + ad account linkage (manual) |
| Ad account + app platforms | **Meta for Developers** (manual) |

## SKAdNetwork identifiers (verified source)

From [Meta SKAdNetwork setup](https://developers.facebook.com/docs/setting-up/platform-setup/ios/SKAdNetwork/) (retrieved 2026-08-07):

1. `v9wttpbfk9.skadnetwork`
2. `n38lu8286q.skadnetwork`

Automated verification: `node scripts/verify-ios-no-att-meta-release.mjs`

## AdAttributionKit

Meta’s SKAN 4.0 guidance ([SKAN v4.0](https://developers.facebook.com/docs/app-events/skanv4.0)) discusses conversion value behavior on iOS 16.6+; it does **not** document a separate AdAttributionKit Info.plist block for this integration. No AdAttributionKit keys were added in code.

## Events Manager — recommended SKAN priorities

Use events that **already exist** in `public/js/meta-app-events.js` (all require marketing consent). Suggested priority for acquisition quality (configure in Events Manager → SKAdNetwork / app promotion):

| Priority | Event name | Why |
|---|---|---|
| P0 | App install / first open (SKAN install) | Acquisition baseline (aggregated) |
| P0 | `fb_mobile_complete_registration` | Parent account created |
| P1 | `fb_mobile_tutorial_completion` | First schedule / routine created |
| P1 | `child_access_completed` | Child reached product core |
| P2 | `first_star_earned` | First value moment (stars) |

Do **not** map IAP/subscription events — not sent to Meta.

### META EVENTS MANAGER MANUAL (checklist)

1. **Meta for Developers** → App `27941105858861495` → add **iOS** platform with bundle ID; ensure **Client token** matches `META_CLIENT_TOKEN` used at `cap:sync:ios`.
2. **Events Manager** → Data sources → your app → **Settings** → configure **SKAdNetwork** conversion events using the P0/P1 table above (aggregated; no IDFA).
3. **Automatically Log In-App Purchase Events** = **OFF** (iOS and Android).

### AEM

Aggregated Event Measurement uses privacy-preserving signals when IDFA is unavailable. With **Tracking = No** and advertiser ID collection disabled, rely on SKAN postbacks + configured conversion events — not on enabling ATT.

## App Store Connect manual (privacy)

1. **App Privacy** → **Tracking** = **No**; **Data used for tracking** = none.
2. Review nutrition labels for Meta SDK data collection (diagnostics/usage per Meta disclosure).
3. Paste Review Notes from `docs/app-store-review-notes.md` (build 30 section).

## Verification before upload

```bash
export META_CLIENT_TOKEN='…'
npm run cap:sync:ios
npm run verify:meta-native-release
npm run verify:ios-no-att-meta
```

Never commit or log the client token value.
