# App Store Review Notes — Min Stjärndag

> English — paste this directly into the App Store Connect "Review Notes" field.
> Last updated: 2026-05-29 | SW v155

---

## App Purpose

**Min Stjärndag** ("My Starday") is a family routine app for parents and children aged 3–10. Parents create structured daily schedules, children earn stars by completing activities, and redeem stars for rewards in the "Skattkammaren" (treasure chamber). The app supports Swedish and English, includes PIN-protected child views, and runs as both a web app and native iOS app.

Key features:
- Parent dashboard with weekly schedule builder
- Child view (PIN-protected, t.ex. `4455`) with star rewards
- Push notifications for schedule reminders
- Apple Sign In for parents
- Skattkammaren (reward redemption system)
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
| **App URL** | https://stjarndag.polsia.app |

**Note:** This account is pre-seeded in our database and is not connected to any real family's data. It contains only fictional review content.

---

## How to Test the Full Flow (No Own Account Needed)

1. **Open the app** on a simulator or test device
2. **Log in** with `review@mystarday.se` / `AppReview2026!`
3. **View the parent dashboard** — shows "Review Family" with one child profile
4. **Switch to child view** — tap the child's card → enter PIN `4455`
5. **Complete an activity** — tap an activity to mark it done and earn a star
6. **Return to parent view** — tap "Byt tillbaka till föräldraläge" → enter PIN `4455`
7. **Open Skattkammaren** (treasure chamber) from the hamburger menu — shows available rewards and redemption history
8. **Test settings** — go to Inställningar → Integritetspolicy and Användarvillkor (Terms of Service)

---

## Child PIN for Review

- **PIN:** `4455`
- **Child name:** Anna (🌟)
- **Purpose:** Demonstrates the PIN-gated child view feature. The reviewer can enter this PIN at any prompt to switch between parent and child modes.

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

## Build Information

| Field | Value |
|-------|-------|
| Bundle ID | `com.mystarday.app` |
| Current SW version | v155 |
| Push notifications | Enabled via APNs (production + sandbox) |
| Sign in with Apple | Enabled |
| Rate limits | 100 req/min on auth endpoints |
| Test account family ID | Pre-seeded, no setup required |

---

## Notes for the Reviewer

- The app works in both Swedish (default) and English. You can switch language in the parent's settings.
- Push notifications are sent via APNs. If you are testing on a simulator, push notifications cannot be received — this is an iOS limitation, not a bug. On a physical device they work correctly.
- Apple Sign In requires a real Apple ID and cannot be tested on the simulator. Please test on a physical device.
- The review test account has no payment information and no real personal data. All content is fictional.
- If you need to reset the test data at any point, contact us at `support@mystarday.se` and reference this review build.

---

## Privacy & Compliance

- The app stores only non-sensitive family data (names, ages, routines)
- Passwords are hashed with scrypt (OWASP parameters N=16384, r=8, p=1)
- Push notification tokens are stored securely and can be deleted on request
- GDPR: users can export or delete their data via Settings → Radera konto
- Privacy Policy: https://stjarndag.polsia.app/privacy
- Terms of Service: https://stjarndag.polsia.app/terms

---

## Contact

For reviewer issues or questions:
- **Email:** `support@mystarday.se`
- **App support URL:** https://mystarday.se

We respond to App Store reviewer inquiries within 24 hours.