# App Store Review Notes — Min Stjärndag

> English — paste this directly into the App Store Connect "Review Notes" field.
> Last updated: 2026-06-10 | SW v224

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
2. **Log in** with `review@mystarday.se` / `AppReview2026!`
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
