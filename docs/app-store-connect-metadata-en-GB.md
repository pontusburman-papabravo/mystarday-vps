# App Store Connect — English (en-GB) Metadata

> **Beta listing copy** for English-speaking families in **Sweden only**.
> App name: **My Starday**. Do not imply UK/US/EU availability outside Sweden.

> **⚠️ EULA fix (2026-08-28):** The Terms of Use line below links to **Apple's Standard EULA** (`https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`) — we use the standard agreement, not a custom one, and our own `/terms` page (platform-neutral, also covers Android) must not be described as Apple's EULA. Update this **Description** under the current iOS app version in App Store Connect (not the app-level *App Information* tab), for the English (UK) localization, and resubmit the same build. See `docs/app-store-connect-metadata.md` for the primary (Swedish) fix and `docs/app-store-review-notes.md` for the reviewer reply.

---

## App Information

**App Name:** My Starday

**Subtitle** (max 30 characters):
> Daily routines for children

---

## Description

My Starday helps parents and children enjoy calmer mornings and evenings — together.

**For parents:**
Create daily schedules with activities and rewards, follow progress, and give stars when your child does well. Share selected reports with nursery or school via secure links.

**For children:**
Children sign in with their own PIN and see a colourful, star-based view of today's schedule. They earn stars for completed activities — designed for preschool-age independence.

**What you get:**
- Daily and weekly schedules tailored to your child
- Star rewards and Treasure Chest
- Push reminders for routines and progress
- Secure sharing with educators and therapists
- Offline mode — works without internet

Suitable for families with children aged 3–10.

**English Beta (Sweden):** English UI is rolling out gradually. Swedish remains the default. Report language issues in Settings → Feedback.

Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: [APP_URL]/privacy

---

## Keywords

daily schedule children,picture schedule,routine app,family rewards,star chart,preschool routine,visual schedule kids

---

## Promotional Text (max 170 characters)

Build calm routines with picture schedules and stars. My Starday — one step at a time. ★ English Beta in Sweden.

---

## Review Notes (add to App Store Connect)

- **English Beta** — child and parent UI available in en-GB behind per-family flag; default remains Swedish.
- **Market:** Sweden only. Do not enable other storefronts.
- **Test account:** see `docs/app-store-demo-konto.md` (review parent account, child Anna).
- **Native build:** includes sv + en-GB permission strings and app name localisation.
- **Build:** 29 — i18n native shell + server communications P0.

---

## Release Notes (TestFlight / beta)

- English (UK) language support for parent and child experience (beta, opt-in)
- Localised native permission dialogs (camera, photos, notifications)
- Localised transactional emails and push reminders (en-GB families)
- Swedish experience unchanged by default

---

## URLs

| Field | Value |
|-------|-------|
| Support | `[APP_URL]/kontakt` |
| Marketing | `[APP_URL]` |
| Privacy | `[APP_URL]/integritet` |

---

## Screenshot captions (en-GB)

See `docs/i18n-beta-screenshot-plan.md`.
