# Meta App Events (iOS + Android) — privacy-first

Native App Events for install/open measurement and activation funnel.  
**Web** continues to use the Meta Pixel (`app-consent.js` / `marketing-events.js`).  
**Native** uses a privacy-patched `capacitor-facebook-events` via `public/js/meta-app-events.js`.

## Meta App ID

`27941105858861495`  
Android package: Capacitor `appId` / Play Console package name.

## Blocking privacy policy (EU/GDPR)

**No data is sent to Meta before the user actively grants marketing consent.**

This includes:

- automatic install / first open
- app activation / app open
- SDK-initiated App Events
- manual conversion events

ATT and marketing consent are **separate**:

```text
metaEventsAllowed        = marketingConsent === true
advertiserTrackingAllowed = marketingConsent === true
                         && platform === 'ios'
                         && attStatus === 'authorized'
```

On Android, marketing consent alone enables App Events (no ATT). Advertiser ID collection follows marketing consent on Android.

### Native defaults (safe without JS / WebView)

| Setting | Default |
|---|---|
| `FacebookAutoLogAppEventsEnabled` | **false** (Info.plist / AndroidManifest) |
| `FacebookAdvertiserIDCollectionEnabled` | **false** |
| `activateApp()` | **not** called unless persisted marketing consent is true |
| Manual `logEvent` | no-ops until marketing consent persisted |

## Consent sequences

### First app start (no consent yet)

1. Native reads plist/manifest → AutoLog = false, AdvertiserID = false  
2. AppDelegate / Android plugin **does not** call `activateApp()`  
3. WebView loads; `meta-app-events.js` sees no marketing consent → no configureConsent(true), no events  
4. Result: **zero** Meta App Event network traffic

### Marketing consent accepted

1. Cookie banner / AppConsent grants `ad_storage` / marketing  
2. `MetaAppEvents.onConsentGranted()`  
3. iOS: read ATT (prompt only if `notDetermined` **after** marketing yes)  
4. `configureConsent({ marketingConsent: true, advertiserTrackingAllowed })`  
5. Native enables AutoLog; calls `activateApp()` for **future** opens only (no backfill)  
6. Manual conversion events may fire when business milestones occur

### Marketing consent denied (first choice)

1. Consent stored as denied  
2. `onConsentRevoked` / configureConsent(false)  
3. AutoLog stays off; no activateApp; no manual events  
4. App works normally

### Marketing consent revoked later

1. `MetaAppEvents.onConsentRevoked()`  
2. Clear local once-keys / pending client queues  
3. Native: AutoLog off, advertiser ID off, clear user data, flush behavior explicit-only  
4. Immediate stop of manual events  
5. App works normally

### ATT accepted (iOS) — only relevant after marketing consent

1. Marketing consent already true  
2. ATT → `authorized`  
3. `advertiserTrackingAllowed = true` → Advertiser ID collection + ATE on  
4. App Events already allowed by marketing consent

### ATT denied / restricted (iOS) with marketing consent

1. Marketing consent true → App Events / AutoLog **on**  
2. `advertiserTrackingAllowed = false` → no IDFA / advertiser ID collection  
3. Conversion events still allowed (aggregated / non-IDFA path)

### ATT authorized but marketing consent false

1. **No** Meta events  
2. ATT prompt is not requested by this module without marketing consent

## Events (after consent only)

| Event | Trigger |
|---|---|
| Install / app open | Meta AutoLog + gated `activateApp()` |
| CompleteRegistration | Signup success (native; Pixel skipped on native) |
| TutorialCompletion | First `schema_saved_at` |
| `child_access_completed` | Verified child PIN login only |
| `first_star_earned` | Family first completion |

**Not implemented:** Purchase / Subscribe / StartTrial.

## Manual Meta Dashboard setup

1. Meta for Developers → App `27941105858861495`  
2. Add iOS + Android platforms  
3. Copy **Client Token** → env `META_CLIENT_TOKEN` before release sync  
4. Link ad account  
5. Keep **Automatically Log In-App Purchase Events = OFF** for iOS and Android  

## Build / sync

```bash
export META_CLIENT_TOKEN='…'
npm run cap:sync:ios      # applies privacy plugin patch + Info.plist/AppDelegate
npm run cap:sync:android  # applies privacy plugin patch + manifest
```

Durable plugin sources: `scripts/ios/*.patched`, `scripts/android/*.patched`  
Applied by: `scripts/patch-capacitor-facebook-events-privacy.mjs`

## How to test in Events Manager

1. Install build with Client Token  
2. Fresh install → confirm **no** Test Events before consent  
3. Grant marketing consent → then walk signup → schedule → child login → first star  
4. Revoke marketing → confirm events stop  
5. Optional non-live debug: `localStorage.setItem('msd_meta_app_events_debug','1')`

## Purchases (later)

RevenueCat does not send to Meta today. When IAP goes live, pick **one** reporter and keep dashboard IAP auto-log OFF until verified.

## Privacy rules

Never send: email, phone, names, DB IDs, diagnoses, activity/reward/schedule content, free text, birthdates.  
Allowed generics: `appversion`, `platform`, `onboarding_version`, `flow`, `environment`.

## Code map

- Abstraction: `public/js/meta-app-events.js`  
- Native privacy patches: `scripts/patch-capacitor-facebook-events-privacy.mjs`  
- Shell config: `scripts/patch-ios-facebook-sdk.mjs`, `scripts/patch-android-facebook-sdk.mjs`  
- Tests: `test/meta-app-events.test.js`
