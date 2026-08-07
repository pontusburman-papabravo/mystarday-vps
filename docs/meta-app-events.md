# Meta App Events (iOS + Android) — privacy-first (no ATT)

Native App Events for activation funnel measurement after **marketing consent**.  
**Web** uses the Meta Pixel (`app-consent.js` / `marketing-events.js`).  
**Native** uses privacy-patched `capacitor-facebook-events` via `public/js/meta-app-events.js`.

## Product policy (R4.5 — Option A, no ATT)

- My Starday **does not** request App Tracking Transparency.
- **No IDFA** and **no** Apple-defined cross-app tracking.
- `advertiserTrackingAllowed` is **always false** on all platforms.
- `FacebookAdvertiserIDCollectionEnabled` / `isAdvertiserIDCollectionEnabled` are **false**.
- `FacebookAutoLogAppEventsEnabled` / AutoLog default **false** until marketing consent.
- App Store privacy intent: **Tracking = No** (verify manually in App Store Connect).

### Historical App Review note (build 28)

Apple Guideline **2.1** rejected build **28** because the binary linked **App Tracking Transparency** (Capacitor ATT plugin) while the product does not show an ATT prompt. **Do not** reintroduce `capacitor-plugin-app-tracking-transparency` or `NSUserTrackingUsageDescription` as a “fix” for Meta attribution. Install attribution uses **SKAdNetwork** + Meta Events Manager (AEM), not IDFA.

## Meta App ID

`27941105858861495`

## Consent model

```text
metaEventsAllowed           = marketingConsent === true
advertiserTrackingAllowed   = false (always)
isAttBlockingMeta()         = false (ATT not used)
```

**No Meta App Event network traffic** (including AutoLog install/open) before the user grants **marketing consent**.

Marketing consent and ATT are **not** coupled — we do not use ATT at all.

### Native defaults (safe without JS)

| Setting | Default |
|---|---|
| `FacebookAutoLogAppEventsEnabled` | **false** |
| `FacebookAdvertiserIDCollectionEnabled` | **false** |
| `Settings.shared.isAdvertiserTrackingEnabled` | **false** (`AttTrackingCoordinator`) |
| `activateApp()` | only when persisted marketing consent is true |
| Manual `logEvent` | no-op until marketing consent |

## SDK initialization vs App Events (section 5 decision)

| Concern | Behavior |
|---|---|
| Facebook SDK bootstrap (`ApplicationDelegate`) | Runs at launch (required for URL handling / SDK lifecycle) |
| `activateApp()` / AutoLog | **Gated** on marketing consent only |
| Manual App Events | **Gated** on marketing consent |
| Advertiser tracking / IDFA | **Off** always |
| Pre-consent marketing events | **Never** sent |

Meta’s public SKAdNetwork documentation lists **Info.plist SKAdNetwork identifiers** for attribution; it does **not** require enabling AutoLog or ATT for listing those IDs. We did **not** add pre-consent event sending in this slice. If Meta SDK initialization at launch is required for SKAN postbacks, the existing `ApplicationDelegate` + fail-closed `AttTrackingCoordinator` startup path provides minimal init without IDFA or pre-consent events.

## iOS SKAdNetwork

Required Meta identifiers (official doc: [SKAdNetwork for Audience Network](https://developers.facebook.com/docs/setting-up/platform-setup/ios/SKAdNetwork/)):

- `v9wttpbfk9.skadnetwork`
- `n38lu8286q.skadnetwork`

Canonical list: `config/meta-skadnetwork.json`. Applied on every `npm run cap:sync:ios` via `scripts/patch-ios-skadnetwork.mjs`.

**AdAttributionKit:** No additional Info.plist keys are documented by Meta for this app slice beyond SKAdNetworkItems. Configure conversion priorities in **Meta Events Manager** (see `docs/meta-ios-skan-aem-runbook.md`).

## Events (after marketing consent only)

| Event | Trigger |
|---|---|
| Install / app open | Meta AutoLog + gated `activateApp()` (forward-looking only) |
| `fb_mobile_complete_registration` | Signup success (native) |
| `fb_mobile_tutorial_completion` | First schedule saved |
| `child_access_completed` | Verified child PIN login |
| `first_star_earned` | Family first star |

**Forbidden in parameters:** child name, email, family/user ids, activity titles, health/NPF fields (see `FORBIDDEN_PARAM_KEYS` in `meta-app-events.js`).

**Not implemented:** Purchase / Subscribe / StartTrial to Meta.

## Build / verify

```bash
export META_CLIENT_TOKEN='…'   # Meta App Dashboard → Settings → Advanced
npm run cap:sync:ios
node scripts/verify-meta-native-release.mjs
node scripts/verify-ios-no-att-meta-release.mjs
```

`cap:sync:ios` runs `verify-ios-no-att-meta-release.mjs --skip-client-token` (ATT/SKAdNetwork only). Full release gate requires `FacebookClientToken` in Info.plist.

## Related docs

- `docs/meta-ios-skan-aem-runbook.md` — AEM / Events Manager manual steps
- `docs/meta-app-events-store-release.md` — Mac archive checklist
- `docs/app-store-review-notes.md` — suggested Review Notes (build 30)
