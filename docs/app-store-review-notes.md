# App Store Review Notes — Min Stjärndag

> English — paste this directly into the App Store Connect "Review Notes" field.
> Last updated: 2026-08-31 | IAP reviewer path — submit **1.4.3 (1139)** (READY BUT OFF + dedicated sandbox family)

---

## 2026-08-31 — IAP reviewer path (READY BUT OFF)

**Do not paste secret values into git.** Replace the secret *names* with live values only in App Store Connect → App Review Information.

Ordinary families cannot purchase. Billing stays off (`payment_enabled = false`, `BILLING_UI_DISABLED = true`). App Store Connect already has auto-renewable Monthly and Yearly products, so reviewers must be able to reach those sheets on a **dedicated** account.

**Build to select in App Store Connect:** **1.4.3 (1139)**. Do not submit an older 1.4.3 build.

**Founder device proof (2026-08-31, `EVIDENCE_SOURCE: founder_observation`):** Monthly/Yearly prices distinct after yearly availability; Sandbox Account sign-in reaches the StoreKit sheet; prior sandbox E2E purchase recorded in `docs/PAYMENTS_V1_SANDBOX_E2E_RUN_LOG.md`. Subscription copy follows the in-app language (live SW `stjarndag-v914`). Do **not** submit until the founder says to submit.

### Paste into App Review Information → Notes

Use this when **Sign-In Information is already the IAP review account** (preferred for subscription review). Do not put the literal word `PASSWORD` in the password field — paste the real value from the secret store / VPS `data/app-review-iap.secret`.

```
Thank you for reviewing My Starday 1.4.3 (1139).

This build uses Apple In-App Purchase (StoreKit) for Premium. There is no web checkout.

The Sign-In Information account is the IAP review account. After login:
- Stay in the parent experience.
- Open Settings → Subscription (or the Premium / paywall screen).
- Monthly and Yearly open Apple’s system purchase sheet.
- Restore Purchases is on the same screen.
- Sign in to a Sandbox Apple ID first: iOS Settings → App Store → Sandbox Account (bottom). The sheet should show Environment: Sandbox.

A separate complimentary review account (founding / free Premium, no purchase sheet) is available on request if you need to verify the non-paying family path.

Sign in with Apple is on Create account. Choose language and country first, then tap Continue with Apple. The system sheet must appear on iPhone and iPad.

App language is set in Settings and applies to Subscription / Premium copy. StoreKit sheet language follows the device language.

Children cannot purchase (PIN login only). One subscription covers the household.

Founding and complimentary families keep free Premium and are never charged through IAP.

Terms of Use (Apple Standard EULA):
https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
```

### App Review Information — Sign-In Information

For this submission, put the **IAP** account in the official username/password fields (`APP_REVIEW_IAP_EMAIL` / `APP_REVIEW_IAP_PASSWORD` from the secret store or VPS `data/app-review-iap.secret`). Never commit those values. Never leave the password as the placeholder word `PASSWORD`.

---

## Metadata rejection — missing Terms of Use (EULA) link (2026-08-28, corrected)

**Rejection:** *"The submission offers auto-renewable subscriptions but does not include a functional link to the Terms of Use (EULA) in the app metadata that appears on the app's App Store product page."*

**Root cause:** This is the first submission with Apple subscription products live in App Store Connect (see `docs/PAYMENTS_V1_STATUS.md` — in-app billing UI is still off, but the ASC subscription group/products now exist, which triggers Apple's EULA-link requirement on the product page). The **App Description** pasted into App Store Connect never included a link to any Terms of Use / EULA, and no custom EULA is set in App Store Connect → License Agreement, so App Review found neither.

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
