# App Store Review Notes — Min Stjärndag

> English — paste this directly into the App Store Connect "Review Notes" field.
> Last updated: 2026-06-10 | SW v224

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
- Child view (PIN-protected, e.g. `4455`) with three focused tabs: **Idag**, **Skattkammaren**, **Familj**
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
| **Parent password** | `AppReview2026!` |
| **Child name** | Anna |
| **Child PIN** | `4455` |
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
5. **Enter child PIN** `4455` on the numeric keypad
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
10. **Return to parent view** — tap **"Jag är vuxen"** → enter PIN `4455` (or parent PIN if set)
11. **Test settings** — Inställningar → Integritetspolicy and Användarvillkor (Terms of Service)

---

## Child PIN for Review

- **PIN:** `4455`
- **Child name:** Anna (🌟)
- **Purpose:** Demonstrates the PIN-gated child view. Use this PIN when switching between parent and child modes.

---

## Two Separate PINs

Min Stjärndag has **two independent PIN systems**:

| PIN Type | Example Value | Set By | Purpose |
|----------|--------------|--------|---------|
| **Child PIN** (Barn-PIN) | `4455` | Parent in Settings | Child login / child → parent switch |
| **Parent PIN** (Föräldra-PIN) | `1234` | Parent in Settings → Föräldralås | Protects parent mode — prevents children from accessing the parent dashboard |

- Child PIN (`4455`): set per child. Used when Anna logs in.
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
