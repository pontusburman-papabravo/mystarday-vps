# Meta App Events (iOS + Android)

Native App Events for install/open measurement and activation funnel.  
**Web** continues to use the Meta Pixel (`app-consent.js` / `marketing-events.js`).  
**Native** uses `capacitor-facebook-events` via `public/js/meta-app-events.js`.

## Meta App ID

`27941105858861495`  
Android package: Capacitor appId (Play Console package name).

## What is implemented

| Event | When | Idempotency |
|---|---|---|
| Install / first open | Meta SDK auto-log | SDK |
| App activate / open | Meta SDK + `activateApp()` | SDK (60s dedupe) |
| `CompleteRegistration` (`fb_mobile_complete_registration`) | Real signup success (email/Apple/Google) | client once-key + native-only (no Pixel) |
| `TutorialCompletion` (`fb_mobile_tutorial_completion`) | First schedule saved (`schema_saved_at` newly set) | server `newlyRecorded` + client once-key |
| `child_access_completed` | Verified `POST /api/auth/child-login` only | server + client once-key |
| `first_star_earned` | Family first completion (`first_completion_at`) | server + client once-key |

**Not implemented:** `Purchase`, `Subscribe`, `StartTrial` (see Purchases below).

## Manual setup in Meta Dashboard

1. Open [Meta for Developers](https://developers.facebook.com/) → App `27941105858861495`
2. Add **iOS** platform with the App Store bundle ID (same as Capacitor `appId`)
3. Add **Android** platform with package ``ANDROID_PACKAGE_NAME` / Capacitor appId` + release key hashes
4. **Settings → Advanced → Security → Client Token** — copy value
5. Set env `META_CLIENT_TOKEN` (or `FACEBOOK_CLIENT_TOKEN`) before native sync/release builds
6. Link the ad account / business portfolio used for app campaigns
7. **Turn OFF** “Automatically Log In-App Purchase Events” for **both** iOS and Android
8. Keep automatic purchase/subscription logging **disabled** until RevenueCat dual-reporting is reviewed

## Build / sync

```bash
export META_CLIENT_TOKEN='…from Meta dashboard…'
npm run cap:sync:ios      # patches Info.plist + AppDelegate + Podfile
npm run cap:sync:android  # patches strings.xml + AndroidManifest
```

## How to test in Events Manager

1. Meta Events Manager → your app → **Test events** (or App Ads Helper → Test Events)
2. Install a release/TestFlight/internal build with `META_CLIENT_TOKEN` set
3. On device: grant marketing consent (and ATT on iOS if prompted)
4. Optional debug on a non-prod host: `localStorage.setItem('msd_meta_app_events_debug','1')`
5. Walk: signup → save first schedule → child PIN login → first activity completion
6. Confirm events appear under Test Events without email/name/IDs in parameters

## Consent / ATT

- Conversion events require **marketing consent** (`ad_storage` / cookie marketing)
- iOS: ATT via `capacitor-plugin-app-tracking-transparency`; `setAdvertiserTrackingEnabled` follows status
- `FacebookAdvertiserIDCollectionEnabled` starts **false** in plist/manifest
- App still works if the SDK/plugin is missing or consent is denied (events no-op)

## Purchases (later — do not enable yet)

RevenueCat webhook (`src/routes/iap-webhook-handler.js`) updates subscription state only — **no Meta send today**.  
`iap-manager.js` does not purchase yet (`canPurchase() === false`).

When IAP goes live:

1. Decide **one** purchase reporter: RevenueCat → Meta **or** native SDK — not both
2. Keep Meta Dashboard automatic IAP logging **OFF** while verifying
3. Only then add `Purchase` / `Subscribe` / `StartTrial` behind the same abstraction
4. Never send amount/currency until StoreKit/Play values are verified

## Privacy rules

Never send: email, phone, names, DB user/family/child IDs, diagnoses, activity/reward/schedule content, free text, birthdates.

Allowed generics: `appversion`, `platform`, `onboarding_version`, `flow`, `environment`.

## Code map

- Abstraction: `public/js/meta-app-events.js`
- Native patches: `scripts/patch-ios-facebook-sdk.mjs`, `scripts/patch-android-facebook-sdk.mjs`
- Server flags: `meta_milestones` on onboarding schedule, child-login, daily-log complete
- Tests: `test/meta-app-events.test.js`
