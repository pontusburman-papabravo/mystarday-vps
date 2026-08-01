# Google Play Review — Test Account & Notes

> English — paste into Play Console **App content → App access** or release notes for reviewers.
> Same test account as Apple App Store.

---

## App Purpose

**Min Stjärndag** ("My Starday") is a Swedish family routine app for parents and children aged 3–10. Parents create daily schedules, children earn stars for completed activities, and redeem stars in the treasure chamber ("Skattkammaren").

**Android-specific login:** Native Google Sign In + email/password. **No Apple Sign In** on Android (by design).

---

## Test Account (required — app needs login)

| Field | Value |
|-------|-------|
| **Parent email** | `APP_REVIEW_EMAIL` |
| **Parent password** | `APP_REVIEW_PASSWORD (secret store)` |
| **Child name** | Anna |
| **Child PIN** | `APP_REVIEW_CHILD_PIN` |

This account is pre-seeded with fictional data only. No real family data.

---

## How to Test (step by step)

1. Install the app from the internal/closed testing track.
2. On the login screen, tap **Logga in** (email login).
3. Enter `APP_REVIEW_EMAIL` / `APP_REVIEW_PASSWORD (secret store)`
4. Parent dashboard shows "Review Family" with one child (Anna).
5. Switch to child view → enter PIN from APP_REVIEW_CHILD_PIN.
6. Tap an activity to mark complete and earn a star.
7. Return to parent mode via menu → parental gate PIN from APP_REVIEW_CHILD_PIN.
8. Open **Skattkammaren** from navigation — rewards and history.
9. **Settings → Integritetspolicy** — privacy policy loads in-app.

### Optional: Google Sign In

Google Sign In only works for accounts **already registered** with the same email. The review account can use email/password above; Google button is for returning users who linked Google on Android.

### Push notifications

Opt-in via settings. If testing push, allow notifications when prompted.

---

## Permissions

| Permission | Why |
|------------|-----|
| Internet | Loads app from `https://mystarday.se` |
| Notifications | Optional schedule reminders |
| Camera | Optional child profile photo |

No location, contacts, or microphone.

---

## Legal & Support

| Item | URL |
|------|-----|
| Privacy policy | https://mystarday.se/privacy |
| Terms of service | https://mystarday.se/terms |
| Support | https://mystarday.se |
| Contact email | info@mystarday.se |

Data stored in EU. No ads. No third-party analytics without consent.

---

## Notes for Reviewer

- The app is a **WebView shell** loading our production web app — this is intentional (single codebase for web + iOS + Android).
- **Parental gate (PIN)** protects switching from child mode to parent mode — this is a child safety feature.
- **In-app purchases** are not enabled in this build (lifetime-free families). Subscription via Play Billing may be added later via RevenueCat.
- App language: Swedish (primary). Some English on marketing pages.
