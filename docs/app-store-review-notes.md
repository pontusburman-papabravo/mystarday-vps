# App Store Review Notes — Min Stjärndag

> English — paste this directly into the App Store Connect "Review Notes" field.
> Last updated: 2026-09-17 | 1.4.5 train closed. Next native train 1.4.6. Do not upload another 1.4.5 binary (including 1233).

---

## Operator — 1.4.5 closed (ITMS-90186 / ITMS-90062, 2026-09-17)

**Do not paste this section to App Review.**

**Delivery rejection (version 1.4.5, build 1233):**

- **ITMS-90186:** Invalid Pre-Release Train — train version `1.4.5` is closed for new build submissions.
- **ITMS-90062:** `CFBundleShortVersionString` `[1.4.5]` must be higher than the previously approved version `[1.4.5]`.

**Root cause:** Apple already approved marketing version 1.4.5 (ASC 2026-09-16; eligible for distribution). A new binary cannot reuse that train.

**Standing response:**

1. Encode `1.4.5` in `config/release-compliance-gate.json` → `versionSources.closedIosMarketingVersions`.
2. Keep repo `MARKETING_VERSION` at **1.4.6** so an accidental archive is not another closed-train delivery.
3. **Do not** upload another 1.4.5 binary (including 1233). That is what produces the repeated ITMS-90186 / ITMS-90062 emails.
4. **Do not** create App Store Connect version 1.4.6 or tag `ios-v1.4.6` until founder says it is time. Xcode Cloud archives without an `ios-v*` tag are refused in `ci_scripts` so `main` merges cannot deliver another IPA. Web/Capacitor deploys do not need a new IPA.

Closed trains `1.4.3`, `1.4.4`, and `1.4.5` are encoded in `versionSources.closedIosMarketingVersions`. Xcode Cloud `ci_pre_xcodebuild` fails the archive if `MARKETING_VERSION` is closed.

---

## Operator — 1.4.4 closed (ITMS-90186 / ITMS-90062, 2026-09-14)

**Historical.** 1.4.4 and 1.4.5 are both closed. Next native train is 1.4.6.

**Delivery rejection (version 1.4.4, build 1188):**

- **ITMS-90186:** Invalid Pre-Release Train — train version `1.4.4` is closed for new build submissions.
- **ITMS-90062:** `CFBundleShortVersionString` `[1.4.4]` must be higher than the previously approved version `[1.4.4]`.

**Root cause:** Apple already approved marketing version 1.4.4. A new binary cannot reuse that train.

---

## Version 1.4.4 — closed train 1.4.3 (ITMS-90186 / ITMS-90062)

**Historical.** 1.4.4 is now itself closed (see operator section). Do not follow the tag/submit steps below.

**Scope:** versionsbump + nya screenshots + korrekt ASC-submission + redan beslutade review-fixar. **Ingen ny produktfunktion.**

**Delivery rejection (version 1.4.3, build 1182):**

- **ITMS-90186:** Invalid Pre-Release Train — train version `1.4.3` is closed for new build submissions.
- **ITMS-90062:** `CFBundleShortVersionString` `[1.4.3]` must be higher than the previously approved version `[1.4.3]`.

**Root cause:** Apple already approved marketing version 1.4.3. A new binary cannot reuse that train.

### Release gate (human)

1. Merge the 1.4.4 marketing-version PR. No extra product PRs.
2. Tag **`ios-v1.4.4`** on merged `main`. Archive a **new** Xcode Cloud build — do **not** reuse 1182.
3. Create ASC version **1.4.4**. Apple **transfers metadata from the current version automatically** ([Create a new version](https://developer.apple.com/help/app-store-connect/update-your-app/create-a-new-version)). **Verify** Swedish + English (UK) Description, URLs, and the Standard EULA line actually copied. Do not treat the new version as blank and re-key everything.
4. **Replace screenshots now.** After a version is Ready for Distribution, screenshots on that live version cannot be swapped without a new version. That is why newer captures did not replace the public 1.4.3 set.
5. **Subscriptions:** public 1.4.3 already lists Monthly + Yearly with prices, so **do not attach them to 1.4.4 by default**. Glance ASC → Subscriptions at Submit. Same-draft only if first-of-type is still unapproved or was returned with the 1.4.3 review thread ([Submit an In-App Purchase](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-in-app-purchase)). Do **not** “re-link” approved products.
6. Before Submit: Review Notes (both accounts), review login, Sign in with Apple, physical IAP path.

Closed train `1.4.3` is encoded in `config/release-compliance-gate.json` → `versionSources.closedIosMarketingVersions`.

### Public store evidence (2026-09-13) — not ASC console status

| Fact | Evidence | Status |
|---|---|---|
| App version live | iTunes lookup `id=6774493098` country=SE/IE/FI → `version=1.4.3`, `currentVersionReleaseDate=2026-09-13T05:51:54Z`, price free | **FACT** |
| Standard EULA line on product page | Live SE Description ends with `Användarvillkor (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/` | **FACT** |
| Named subscriptions on public shelf | Live SE App Store page (`apps.apple.com/se/app/…/id6774493098`): **Köp inuti app: Ja**, **Premium Årsvis 590,00 kr**, **Premium Månadsvis 59,00 kr** | **FACT** (public page) |
| Exact ASC enum (Ready for Sale / Waiting for Review / Developer Action Needed) | No App Store Connect API / ASC keys in this environment | **NOT_VERIFIED** |

**Merge-gate verdict:** attaching Monthly/Yearly to the 1.4.4 draft is **not a requirement**. Apple’s public product page lists both auto-renewable products with prices on live **1.4.3**. That is evidence the **first subscription of that type already shipped with an approved app version**. The earlier “koppla IAP-produkterna till den nya versionen” step is therefore unnecessary work unless the ASC console still shows an unapproved first-of-type (or a return from the 1.4.3 review thread).

Do **not** block merge of the 1.4.4 version bump on the missing console enum. At Submit, glance ASC → Subscriptions (30 seconds): Ready for Sale → leave them off the 1.4.4 draft; Waiting for Review / Developer Action Needed / Missing Metadata on first approval → include in the same draft.

This is a **version-train** rejection, not a new Guideline 2.1/3.1 product defect. Keep the existing IAP locate notes and the **rejection-specific** EULA line (below) when submitting 1.4.4.

---

## Build 1.4.3 (1160) — Guideline 3.1.2(c) Subscription metadata / EULA (2026-09-11)

**Rejection:** *"The submission did not include all the required information for apps offering auto-renewable subscriptions… a functional link to the Terms of Use (EULA)… in the App Store metadata."*

**Guideline vs this rejection:** Review Guideline **3.1.2(c)** requires clear subscription information and Apple’s subscription-agreement rules. It does **not** literally say “put Apple’s Standard EULA URL in the App Description.” We keep that URL because **this review rejection required a functional Terms of Use (EULA) link in App Store metadata.** Do not document it as a generic 3.1.2(c) interpretation.

**Root cause (verified for that submission):** App Store Connect **Description** lacked Apple's Standard EULA URL. We use **Apple's Standard EULA** (no custom License Agreement). The in-app Premium screen already shows subscription title, duration, StoreKit price, and functional Privacy + Terms links — that rejection was **metadata-first**, not a binary defect. The live 1.4.3 SE listing now includes the line; for 1.4.4 **verify it copied**, do not assume the field is empty.

**Fix — App Store Connect only, no new build (historical 1.4.3 steps):**

For **1.4.4**, do not re-append this line by default — **verify it copied** from live 1.4.3. The numbered steps below were for the then-current 1.4.3 submission.

1. Open the **current iOS app version** (not the app-level *App Information* tab).
2. For **every active localization** (min. Swedish + English UK), append to **Description** on its own line:
   ```
   Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
   ```
   Swedish equivalent: `Användarvillkor (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`
3. Confirm the Privacy Policy URL metadata field still resolves.
4. Keep **Standard Apple License Agreement** — do **not** create a Custom License Agreement.
5. Resubmit the **same build** for review (metadata-only change).

**In-app verification before reply (physical iPhone, IAP review account — see § Build 1160 2.1(b) below):**

| Requirement | Where | Status in code |
|---|---|---|
| Subscription title | `/paywall` — "My Starday Premium" + plan cards | ✓ `paywall.title`, StoreKit offering |
| Duration | Plan terms text (`/år`, `/mån`, auto-renew) | ✓ `paywall.yearlyTerms*`, `paywall.monthlyTerms*` |
| App Store price | Live StoreKit `priceString` | ✓ `renderTierPrices()` |
| Privacy Policy link | Bottom of paywall | ✓ `paywallPrivacyLink` → `/privacy` |
| Terms of Use link | Bottom of paywall | ✓ `paywallTermsLink` → `/terms` (in-app; metadata uses Apple stdeula) |

Record a short screen recording: **Inställningar → Premium → Aktivera Premium** → show Monthly/Yearly + prices → tap **Integritet** and **Villkor** links → tap **Tillbaka till Premium** (returns to paywall with same tier). Attach to the App Review reply.

**In-app legal navigation (2026-09-11 web deploy):** Paywall legal links use jurisdiction routing (`resolveLegalRoutes` via `/api/market/legal-routes`) and append `?returnTo=/paywall&tier=…`. Legal pages show **Tillbaka till Premium** and hide the public Svenska/English switcher on that path. **No new iOS binary** — Capacitor loads the remote web app.

**Paste into App Review reply:**

```
Hello,

Thank you for the clarification.

We use Apple's Standard Terms of Use (EULA). We have now added the functional Standard EULA link to the App Store Description:

https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

The subscription purchase screen also provides the required subscription information, including:

* Subscription title
* Subscription duration
* Current App Store price
* Functional Privacy Policy link
* Functional Terms of Use (EULA) link

We have attached a screen recording showing the subscription purchase flow and the required information and links.

We have also added this information to the App Review Notes for future submissions.

Thank you.
```

**Add to App Review Information → Notes** (append to the Build 1160 IAP block below):

```
The Terms of Use link uses Apple's Standard EULA and is also included in the App Store Description.
```

See also: `docs/app-store-connect-metadata.md` / `docs/app-store-connect-metadata-en-GB.md` for full Description text with EULA line.

---

## Build 1.4.3 (1160) — Guideline 2.1(b) In-App Purchases (2026-09-11)

**Rejection:** Apple could not locate Premium Monthly or Premium Yearly in the app.

**Root cause:** App Review Information listed only the **complimentary** review account (`APP_REVIEW_EMAIL`). That family has permanent free Premium (grandfathered) and correctly shows **no** purchase path. Subscriptions are visible only on the dedicated **IAP review** account (`APP_REVIEW_IAP_EMAIL`), which is allowlisted for Apple's sandbox while public billing stays off.

**Gate before pasting:** complete every item in [`runbooks/APP-REVIEW-IAP-FAMILY.md`](runbooks/APP-REVIEW-IAP-FAMILY.md) § Approval gate. Backend-only green is **not** enough — physical iPhone + Apple sandbox purchase sheet required.

**Paste into App Review Information → Notes (and reply to the 2.1(b) message):**

```
Thank you for the clarification.

Premium Monthly and Premium Yearly are available through the in-app subscription screen. Our public paid rollout is currently disabled, but we have enabled the subscription flow for App Review on a dedicated sandbox review account (credentials below).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IN-APP PURCHASE REVIEW ACCOUNT — USE THIS ACCOUNT TO REVIEW PREMIUM MONTHLY / PREMIUM YEARLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Parent email: APP_REVIEW_IAP_EMAIL (secret store)
Parent password: APP_REVIEW_IAP_PASSWORD (secret store)

Steps to locate the subscriptions on iPhone:

1. Launch the app (build 1.4.3 / 1160).
2. Sign in with the IAP review parent account above (email + password on the login screen).
3. Tap Inställningar (Settings) in the bottom navigation.
4. Tap Premium.
5. Tap Aktivera Premium (View subscriptions in English).
6. The subscription screen shows Premium Yearly and Premium Monthly with live prices from the App Store sandbox (not static placeholder copy).
7. Select either plan and tap Fortsätt (Continue) to open Apple's sandbox purchase sheet. Restore Purchases is on the same screen.

No real charge is required during review. The Paid Apps Agreement is active and both subscriptions are included in this submission. <!-- pragma: allowlist secret -->

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPLIMENTARY DEMO ACCOUNT — PREMIUM ALREADY INCLUDED; DO NOT USE THIS ACCOUNT TO REVIEW IN-APP PURCHASES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Parent email: APP_REVIEW_EMAIL (secret store)
Parent password: APP_REVIEW_PASSWORD (secret store)
Child: Anna, PIN: APP_REVIEW_CHILD_PIN (secret store)

This account has lifetime complimentary Premium and will not show Monthly/Yearly purchase options by design. Use it only for routine parent/child feature testing.

Please let us know if you experience any difficulty accessing the subscription screen with the IAP review account.

The Terms of Use link uses Apple's Standard EULA and is also included in the App Store Description.
```

---

## Build after 1147 — Sign in with Apple Guideline 4 (2026-09-09)

**Rejection (9 Sep 2026, version 1.4.3, build 1147, iPad Air 11-inch M3):** Guideline 4 — Design. The app offered Sign in with Apple but required name and/or email after Authentication Services had already provided that information.

**Verified root cause:** The 2026-09-08 login/register split discarded the first successful Apple credential.

SUPERSEDED / WRONG flow (do not restore):

```
/login → Apple authorize → unknown Apple user → 409 REGISTRATION_REQUIRED
→ redirect /register?method=apple → first Apple result discarded
→ new Apple authorize on register → reviewer saw name/email/password form
```

Apple `fullName` is available only on the first authorization.

**Fix:** One Authentication Services credential creates or signs in the account. Country/terms may be collected before authorize or on a same-page completion surface. Name, email, and password are never collected after Apple auth.

**Permanent rule:** Never discard a successful Apple Authentication Services credential in order to collect identity fields or require another Apple authorization during the same account creation attempt.

**Physical device test required before resubmit.** Do not paste the notes below into App Store Connect until iPhone + iPad Air verification is done.

**Paste into App Review Information → Notes (AFTER physical verification):**
```
Thank you for the Guideline 4 feedback on Sign in with Apple.

In the previously reviewed build 1147, a new Apple ID on the Login screen was sent to the email/password registration form and asked to authorize with Apple a second time. That discarded the first Authentication Services credential (including name, which Apple provides only on the first authorization).

This is fixed. Sign in with Apple now uses a single authorization:

- An existing Apple account signs in immediately.
- A new Apple account is created from that same credential. Name comes from Authentication Services and email comes from the verified Apple identity token (including Hide My Email). We do not ask for name, email, or a password after Sign in with Apple.
- If country or terms are still needed, they are collected on the same screen without a second Apple authorization.

Please test on iPad Air 11-inch:

1. Sign in with Apple as a new Apple ID — no name/email/password form after the Apple sheet.
2. Sign out and Sign in with Apple again — existing account signs in.
3. Settings → delete account is available in-app.

Please use the email/password review account below if you want to skip account creation and review the parent/child routine.
```

---

## SUPERSEDED — Build 1140+ Apple login/register split (2026-09-08)

**Do not use this flow.** It caused the 2026-09-09 Guideline 4 rejection.

Historical only: build 1139 failed because login tried to create an account without country (`400 COUNTRY_REQUIRED`). The then-current fix routed unknown Apple IDs to `/register?method=apple` and required a fresh authorize. That discarded the first Authentication Services credential and is now forbidden.

---

## Metadata rejection — missing Terms of Use (EULA) link (2026-08-28, corrected)

**Rejection:** *"The submission offers auto-renewable subscriptions but does not include a functional link to the Terms of Use (EULA) in the app metadata that appears on the app's App Store product page."*

**Root cause:** This was the first submission where Apple subscription products existed in App Store Connect (see `docs/PAYMENTS_V1_STATUS.md` — in-app billing UI still off). App Review’s **written rejection** required a functional Terms of Use (EULA) link in App Store metadata. Guideline 3.1.2(c) itself is about subscription information and Apple’s subscription-agreement rules; it does not literally prescribe this Description URL. The **App Description** at the time had no Terms of Use / EULA link, and no custom EULA was set under License Agreement.

**Correction (2026-08-28):** An earlier version of this fix linked the Description to our own `/terms` page and labelled it "EULA." That was wrong and has been corrected:
- We use **Apple's Standard EULA** — not a custom license agreement — so the Description must link to **Apple's own standard EULA URL**, not to our app's Terms of Use.
- Our own `/terms` page is **platform-neutral** (it also governs the Android/Google Play app) and must never be presented as Apple's EULA. `/terms` is unchanged by this fix and is **not** referenced from the App Description for this purpose.

**Fix — App Store Connect metadata only, no new build required:**
1. In App Store Connect, open the app and, in the sidebar, select the **current iOS app version** (Description is version-specific, localizable metadata — it does **not** live under the app-level *App Information* tab).
2. Update the **Description** field for **every active localization** — at minimum **Swedish** and **English (UK)** — using the text in `docs/app-store-connect-metadata.md` (sv) / `docs/app-store-connect-metadata-en-GB.md` (en-GB). Both now end with a plain-text line pointing to Apple's own EULA: `Användarvillkor (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/` (`Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/` in English).
3. Do **not** create a Custom License Agreement — keep **Standard Apple License Agreement** (License Agreement stays untouched/default).
4. Re-submit the **same build/submission** for review (metadata-only change; no new binary required).

**Paste into App Review Information → Notes (or as a reply to the rejection):**
```
Thank you for flagging this.

We use Apple's Standard End User License Agreement (EULA), not a custom license agreement.

We have now added a functional link to Apple's Standard EULA to the App Description on the App Store product page for all applicable localizations:

https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

Our Privacy Policy is also available in the App Store metadata.

The issue was metadata-only and no binary changes were required.

Thank you for reviewing the updated submission.
```

---

## Build 30 — No ATT / privacy-preserving attribution (2026-08-07)

**Context:** Build **28** was rejected under Guideline **2.1** because the binary linked App Tracking Transparency without showing the ATT prompt. Build **30** removes the ATT Capacitor plugin entirely, does not declare `NSUserTrackingUsageDescription`, and does not access IDFA. Meta advertiser tracking and advertiser ID collection remain disabled. Meta App Events fire only after the user's **marketing consent**. Paid install attribution uses Apple's privacy-preserving mechanisms (SKAdNetwork) with Meta SDK configured accordingly.

**Paste into App Review Information → Notes:**

```
My Starday does not track users across apps or websites owned by other companies and does not use the App Tracking Transparency permission.
The app does not access IDFA. Meta advertiser tracking and advertiser ID collection are disabled.
Advertising attribution uses Apple's privacy-preserving attribution mechanisms. Meta App Events are enabled only after the user's marketing consent.
The App Store privacy information has been updated to reflect that tracking is not performed.
```

**Test account:** see `docs/app-store-demo-konto.md` for App Review credentials (do not paste secrets in public notes).

---

## Build 29 — English Beta native localisation (2026-07-25)

**Scope:** Native shell strings for sv-SE and en-GB (camera, photos, notifications, app display name). Web Child Core English remains behind per-family `english_child_experience` flag (default OFF).

**Market:** Sweden only. English is a product-language beta, not a new storefront.

**Test account:** see `docs/app-store-demo-konto.md` — parent review account, child Anna. <!-- pragma: allowlist secret -->

**Paste into App Review Information → Notes:**
```
Build 29 adds Swedish and English (UK) native permission strings and localised app name.
English child UI is beta and opt-in per family — default experience remains Swedish.
Only Sweden is available as a market. Test with the review account in the demo doc.
```

---

## Build 23 — Universal iPad layout (2026-06-24, after Guideline 4 rejection)

Apple rejected Build 21 on **iPad Air 11-inch (M3)** under **Guideline 4 — Design**: UI did not use the iPad screen (narrow column / unused space).

**Fix (Build 23):**
- `TARGETED_DEVICE_FAMILY = "1,2"` (Universal — iPhone + iPad)
- Removed `UIRequiresFullScreen` (no iPhone-only compatibility window)
- `platform-tablet.css` — widened parent magic hub, full-width bottom nav, centered tour modal
- Mobile nav breakpoint fixed: `(max-width: 767px)` only — iPad uses parent magic bottom nav, not phone tab bar
- iOS build number **23**

**Paste into App Review Information → Notes:**
```
Build 23 is a Universal app optimized for iPad. The parent dashboard uses a full-width dark layout with widened content columns and bottom navigation on tablet screens.

Please review on iPad Air (11-inch) in portrait — the dashboard welcome tour and home hub should fill the screen without unused black side bars.

Review account (full free access):
- Email: review@mystarday.se
- Password: APP_REVIEW_PASSWORD (secret store)
- Child PIN: (APP_REVIEW_CHILD_PIN)
```

**Reply to Guideline 4 in App Store Connect:**
```
Thank you for your feedback on iPad layout.

In Build 23 we have optimized the app for iPad as a Universal app:
- Universal target (iPhone + iPad) restored
- Tablet-specific CSS widens the dashboard hub, bottom navigation, and onboarding tour
- Navigation uses tablet-appropriate layout above 768px width

Please review on iPad Air 11-inch. The app should now use the full screen width.

Thank you.
```

---

## Build 22 — iPhone-only target (superseded by Build 23)

Build 22 set iPhone-only targeting as a quick fix. Build 23 replaces it with proper Universal iPad layout.

---

## Build 22 — iPhone-only target + business model reply (2026-06-24, after Guideline 4 + 2.1(b))

Apple rejected Build 21 on **iPad Air 11-inch (M3)**:

1. **Guideline 4 — Design:** App UI not optimized for iPad (narrow column with unused screen space).
2. **Guideline 2.1(b) — Information Needed:** Questions about paid content / subscriptions.

### Guideline 4 fix

**Root cause:** Xcode had `TARGETED_DEVICE_FAMILY = "1,2"` (Universal) while the app is intentionally **phone-primary** (`app.md` F0). The web UI uses mobile-first layouts (~400–512px columns). On iPad this produced a centered phone-width column instead of a full tablet layout.

**Fix (Build 22):**
- `TARGETED_DEVICE_FAMILY = 1` (iPhone only) in `ios/App/App.xcodeproj/project.pbxproj`
- `UIRequiresFullScreen = true` in `ios/App/App/Info.plist` (iPhone compatibility mode on iPad)
- iOS build number **22**

**App Store Connect before upload:** In the version’s **General → App Information**, ensure the app is listed as **iPhone only** (do not require iPad screenshots). iPad users may still install the iPhone app in compatibility mode; that is intentional for our phone-first product.

**Paste into App Review Information → Notes:**
```
Build 22 is an iPhone-only app (TARGETED_DEVICE_FAMILY = 1). Our product is intentionally phone-first; iPad installation uses Apple's iPhone compatibility mode rather than a separate tablet layout.

Please review on iPhone, or on iPad in iPhone compatibility mode. The previous universal target was incorrect for our launch scope.

Review account (full free access):
- Email: review@mystarday.se
- Password: APP_REVIEW_PASSWORD (secret store)
- Child PIN: (APP_REVIEW_CHILD_PIN)
```

**Reply to Guideline 4 in App Store Connect:**
```
Thank you for your feedback.

Min Stjärndag is intentionally designed as a phone-first app for parents managing daily routines on their phone. We had incorrectly configured the Xcode project as Universal (iPhone + iPad) while our UI is optimized for phone screen sizes.

In Build 22 we have corrected this:
- TARGETED_DEVICE_FAMILY is now iPhone only (1)
- UIRequiresFullScreen is enabled for iPhone compatibility mode on iPad

We do not claim iPad-optimized layout in this version. Families who use a shared iPad can install the iPhone app in compatibility mode.

Thank you for your review.
```

### Guideline 2.1(b) — Business model answers

**Paste as reply to Apple's 2.1(b) message:**

```
Hello App Review,

Thank you for your questions about our business model. Please find detailed answers below.

1. Who are the users that will use the paid content, subscriptions, and features in the app?

Parents and guardians (family account holders). Children use PIN login only and cannot make purchases. Subscriptions, when offered in a future release, apply at the household (family) level — one subscription per family.

2. Where can users purchase the content, subscriptions, and features that can be accessed in the app?

This review build (1.1, Build 22) is completely free. No In-App Purchase products are configured in App Store Connect for this version, and all purchase UI is disabled in the app (iap-manager.js stub returns canPurchase: false).

When we enable subscriptions in a future release, purchases will be available only through Apple In-App Purchase (RevenueCat + StoreKit) inside the native iOS app. We do not offer web checkout, Stripe, or any external payment link for digital content accessed in the app.

3. What specific types of previously purchased content, subscriptions, and features can a user access in the app?

In this build, there is nothing to purchase and no previously purchased digital content to restore.

Planned for a future release (not active in this build):
- Basic monthly subscription (product ID: se.mystarday.app.basic) — core app: schedules, daily routines, star rewards, co-parent access, child PIN login, push notifications.

Complimentary access (no purchase):
- Founding-member families (first 200 signups and all pre-launch families) receive lifetime free Basic access and are never charged.

4. What paid content, subscriptions, or features are unlocked within the app that do not use In-App Purchase?

None. There is no paid digital content unlocked without In-App Purchase.

- All subscription/payment UI is disabled in this build.
- No Stripe or web checkout exists (removed before App Store launch).
- Admin manual grants are internal support only, not a user-facing purchase path.
- The review account (review@mystarday.se) is a founding-member account with complimentary lifetime access for testing.

Please evaluate this version as a free app using the review credentials above.

Thank you,
Pontus Burman
```

---

## Build 20 — Apple Sign In visible errors + diagnostics (2026-06-22, after 2.1(a) rejection build 19)

Apple rejected Build 19 with the same symptom: *remained on the login screen* when using Sign in with Apple on iPad.

**Root cause (web layer):** On the native app’s first screen (role-selection), the Apple button was visible but error messages and the email-conflict linking prompt lived inside the hidden `parent-login-section`. Failed logins (401 JWT, 409 conflict, missing token) produced **no visible feedback** — identical symptom to a native plugin failure.

**Fix (Build 20):**
- `roleAppleError` + `roleAppleLinkingPrompt` on role-selection screen
- No silent returns when Apple auth returns without `idToken`
- Step logging → `POST /api/client-log` + `[APPLE]` server logs
- iOS build number **20** (no Swift changes)

**Paste into App Review Information → Notes:**
```
Build 20 fixes Sign in with Apple error handling on the login screen. All Apple Sign In outcomes now show a visible message on the screen where the user tapped the button.

If Sign in with Apple still fails, please use the email/password review account below. We would appreciate knowing whether the Apple authentication sheet appears and whether any error message is shown after authentication.
```

**Reply to App Review (optional):**
```
Thank you for your feedback.

We have identified an issue in our login flow where certain Sign in with Apple error states could leave the user on the login screen without displaying a visible error message. We have implemented additional handling and user feedback for all Apple Sign in outcomes and are submitting Build 20.

To help us verify that we are addressing the same issue observed during review, could you please let us know:
- Whether the Apple authentication sheet appears after tapping "Sign in with Apple"
- Whether authentication completes and returns to the app
- Whether any error message is displayed
- At what point the app remains on the login screen

If possible, a screen recording would be greatly appreciated.

Thank you for your assistance.
```

**Server log grep after review attempt:** see `AGENTS.md` — `journalctl` on the app systemd unit, filter `[APPLE]` or `[CLIENT-LOG]`.

---

## Build 16 — Apple Sign In iPad fix (2026-06-18, after 2.1(a) rejection)

Apple rejected Build 15: Sign in with Apple error on iPad Air 11-inch (M3), iPadOS 26.5.

**Root cause:** `@capacitor-community/apple-sign-in` omits `ASAuthorizationControllerPresentationContextProviding` — required on iPad.

**Fix:** Vendored patched `Plugin.swift` applied during `npm run cap:sync:ios` (before AND after `pod install`), with verification script.

**Mac build checklist:**
```bash
npm install --legacy-peer-deps
npm run cap:sync:ios
grep presentationContextProvider node_modules/@capacitor-community/apple-sign-in/ios/Sources/SignInWithApple/Plugin.swift
# must show: presentationContextProvider = self
```

**Review Notes addendum:**
```
Sign in with Apple works on iPad in Build 16. If Apple Sign In fails, use the email/password review account credentials listed above.
```

---

## Build 15 — Resubmission (2026-06-16, after 2.1(b) rejection)

Apple rejected Build 14 because subscription text remained in the web UI (landing page, pricing page, dashboard HTML). Build 15 removes **all** user-facing subscription/payment references.

**Paste into App Review Information → Notes:**

```
This version (Build 15) is a completely free app. We have removed all In-App Purchase code and all subscription/payment UI text from the application.

No In-App Purchase products exist or are configured in App Store Connect. There is no subscription purchase flow anywhere in the app.

The review account provided in the Review Notes section has full complimentary access as a founding member. Please test core functionality using the provided credentials. <!-- pragma: allowlist secret -->

Thank you.
```

**Reply to Apple's message in App Store Connect:**

```
Hello App Review,

Thank you for your follow-up.

We understand the issue: our app previously contained text references to subscriptions in the web content loaded by the native app, even though no In-App Purchase products were ever created in App Store Connect.

In Build 15 we have removed all subscription and payment UI from the entire application. The app is now 100% free with no references to paid subscriptions or In-App Purchases.

No IAP products are configured in App Store Connect, and we do not intend to offer In-App Purchases in this version. Please review the app as a free application using the provided test account.

Thank you,
Pontus Burman
```

---

## Build 14 — Resubmission (2026-06-16)

**Paste into App Review Information → Notes:**

```
In this version (Build 14), we have completely removed all In-App Purchases and subscription purchase code from the app. No IAP products are configured in App Store Connect. The app is 100% free to use for all users during our founding-member program (first 200 families receive lifetime complimentary access).

Please use the provided review account to test the application. No subscription purchase flow is available or required.
```

**If replying to Apple's message instead of resubmitting:**

```
Hello App Review,

Thank you for your message.

My Starday currently operates an early-adopter program where the first 200 families receive complimentary lifetime access ("Founding Members").

The review account provided to App Review is one of these founding-member accounts and therefore has full access without requiring a subscription purchase. Because of this, no subscription purchase flow is displayed for the review account.

No In-App Purchase products are configured in App Store Connect for this version. We are preparing our subscription offering for families registered after the founder limit in a future release.

For this review, please evaluate the app using the provided review credentials and core functionality.

Thank you for your review.
Best regards,
Pontus Burman
```

---

## App Purpose

**Min Stjärndag** ("My Starday") is a family routine app for parents and children aged 3–10. Parents create structured daily schedules, children earn stars by completing activities, and redeem stars for rewards in the "Skattkammaren" (treasure chamber). The app supports Swedish and English, includes PIN-protected child views, and runs as both a web app and native iOS app.

Key features:
- Parent dashboard with weekly schedule builder
- Child view (PIN-protected, e.g. `APP_REVIEW_CHILD_PIN`) with three focused tabs: **Idag**, **Skattkammaren**, **Familj**
- Push notifications for schedule reminders
- Apple Sign In for parents
- Skattkammaren (reward redemption system)
- Familjehallen (family projects and shared story — read-only for children in V0)
- Swedish + English language support

---

## Test Account

Please use our dedicated App Store review test account:

| Field | Value |
|-------|-------|
| **Parent email** | `review@mystarday.se` |
| **Parent password** | `APP_REVIEW_PASSWORD (secret store)` |
| **Child name** | Anna |
| **Child PIN** | `APP_REVIEW_CHILD_PIN` |
| **App URL** | https://mystarday.se |

**Note:** This account is pre-seeded in our database and is not connected to any real family's data. It contains only fictional review content. The account has **lifetime free** access — no subscription or payment is required to test.

---

## How to Test the Full Flow (No Own Account Needed)

### Parent mode

1. **Open the app** on a physical device (recommended) or simulator
Sign in with Apple works on iPad in Build 16. If Apple Sign In fails, use the email/password review account credentials listed above.
3. **View the parent dashboard** — shows the review family with one child profile (**Anna**)

### Switch to child view

4. From the dashboard, tap **"Barnet loggar in"** (or go to child login), then select **Anna**
5. **Enter child PIN** `APP_REVIEW_CHILD_PIN` on the numeric keypad
6. You are now in the **child view** with three bottom tabs:

| Tab | Purpose |
|-----|---------|
| **☀️ Idag** | Today's schedule — tap activities to mark them complete and earn stars |
| **💎 Skattkammaren** | Rewards, star balance, and treasure-chamber rooms |
| **🏡 Familj** | Family hall — shared projects and family story (may be empty if no projects exist) |

### Core loop to verify

7. On **Idag**, tap an activity to mark it done — star count increases
8. Switch to **Skattkammaren** — view rewards and star balance
9. Switch to **Familj** — family hall loads (empty state is OK)
10. **Return to parent view** — tap **"Jag är vuxen"** → enter PIN from APP_REVIEW_CHILD_PIN (or parent PIN if set)
11. **Test settings** — Inställningar → Integritetspolicy and Användarvillkor (Terms of Service)

---

## Child PIN for Review

- **PIN:** `APP_REVIEW_CHILD_PIN`
- **Child name:** Anna (🌟)
- **Purpose:** Demonstrates the PIN-gated child view. Use this PIN when switching between parent and child modes.

---

## Two Separate PINs

Min Stjärndag has **two independent PIN systems**:

| PIN Type | Example Value | Set By | Purpose |
|----------|--------------|--------|---------|
| **Child PIN** (Barn-PIN) | `APP_REVIEW_CHILD_PIN` | Parent in Settings | Child login / child → parent switch |
| **Parent PIN** (Föräldra-PIN) | `1234` | Parent in Settings → Föräldralås | Protects parent mode — prevents children from accessing the parent dashboard |

- Child PIN (`APP_REVIEW_CHILD_PIN`): set per child. Used when Anna logs in.
- Parent PIN: set per family. When set, every child logout + "Jag är vuxen" click requires this PIN before the parent dashboard is shown.

---

## Screenshot note (internal)

App Store Connect accepts only: **1242×2688**, **1284×2778**, or landscape **2688×1242** / **2778×1284**. Capture in Xcode Simulator (native shell), not mobile web.

---

## Build Information

| Field | Value |
|-------|-------|
| Bundle ID | `com.mystarday.app` |
| Production URL | https://mystarday.se |
| Current SW version | v222 |
| Push notifications | Enabled via APNs (production + sandbox) |
| Sign in with Apple | Enabled |
| Rate limits | 100 req/min on auth endpoints |
| Test account | Pre-seeded, lifetime free, no setup required |

---

## Notes for the Reviewer

- The native iOS app loads **https://mystarday.se** in a Capacitor shell (remote URL, not a bundled offline copy). A network connection is required for the first load.
- The child view uses a **3-tab bottom navigation**: Idag · Skattkammaren · Familj. Skattkammaren is no longer in the parent hamburger menu when testing as a child.
- The app works in both Swedish (default) and English. You can switch language in the parent's settings.
- Push notifications are sent via APNs. Simulators cannot receive push — this is an iOS limitation. On a physical device they work correctly.
- Apple Sign In requires a real Apple ID and cannot be tested on the simulator. Please test on a physical device.
- **Child onboarding (iPad/iOS):** Step 1 shows an emoji grid (tap to select) plus an optional profile photo below. A default emoji (🌟) is pre-selected so you can continue without tapping if preferred.
- The review test account has no payment information and no real personal data. All content is fictional.
- If you need to reset the test data, contact us at `support@mystarday.se` and reference this review build.

---

## Privacy & Compliance

- The app stores only non-sensitive family data (names, ages, routines)
- Passwords are hashed with scrypt (OWASP parameters N=16384, r=8, p=1)
- Push notification tokens are stored securely and can be deleted on request
- GDPR: users can export or delete their data via Settings → Radera konto
- Privacy Policy: https://mystarday.se/privacy
- Terms of Service: https://mystarday.se/terms

---

## Contact

For reviewer issues or questions:
- **Email:** `support@mystarday.se`
- **App support URL:** https://mystarday.se

We respond to App Store reviewer inquiries within 24 hours.
