# RC1 Release Notes (draft)

**Status:** Draft — ships when integration branch merges to `main` with flags **OFF**.  
**Audience:** Team, support, founders — not end-user marketing.

---

## What changes for families?

**With default settings (no action required): nothing visible.**

This release prepares new capabilities behind feature flags. Existing families keep the same onboarding, parent dashboard, child experience, stars, and schedules until flags are deliberately enabled on staging.

---

## What we are shipping (behind flags)

### When `platform_runtime_enabled` is turned ON (staging only initially)

- After a child completes an activity, the app can show **Experience Pack** feedback tied to their world progression — a natural consequence of routine, not a separate points game.
- Progression unlocks are stored server-side; the child world can reflect what they have discovered.
- Parent Journey flow (handoff → first success → celebration) stays the same authority; runtime adds child-side feedback when enabled.

**Default: OFF.** Families see no change.

### When `family_journey_first_week_v1` is turned ON (staging only initially)

- After the family reaches **first success**, parents get a **gentle first-week guide** (days 1–7): morning/evening nudges, calm messaging if a day is missed, and a **warm week reflection** on day 7 — written as a short story, not statistics.
- On days 5–6 the app intentionally stays quiet so the family leads.
- If a family is also in the legacy 7-day activation program, the activation banner is hidden while first week is active (no double coaching).

**Default: OFF.** Families see no change.

---

## What changes for everyone (no flag)

### Reliability & CI (#401)

- Faster, more reliable automated tests — reduces risk of shipping regressions.
- Route inventory checked in CI.
- `npm ci` works with `legacy-peer-deps` (Capacitor peer dependency fix).

No app behavior change.

### Platform Engine library (#396)

- Internal game-platform skeleton for future worlds and progression rules.
- Not wired to the live app UI until Platform Runtime (#400) is enabled.

Families see no change.

---

## What does not change

- Login, registration, and onboarding flows (unless flags enabled on staging)
- Star economy, rewards, and Skattkammaren
- Child universe/world (unless `platform_runtime_enabled` ON)
- Payments / IAP
- Email and push (except future journey push extensions)
- Admin panel core flows

---

## Enabling new experiences (operators only)

| Capability | Flag | Default | First enable |
|------------|------|---------|--------------|
| Platform Runtime / Experience Pack | `platform_runtime_enabled` | OFF | Follow FIRST-LIVE-ENABLE-CHECKLIST in docs/first-success/ |
| First Week parent journey | `family_journey_first_week_v1` | OFF | Staging; requires Journey wave flags |

**Never enable both flags globally without a signed runbook and rollback plan.**

Emergency off:

```sql
UPDATE feature_flag SET enabled = false
WHERE key IN ('platform_runtime_enabled', 'family_journey_first_week_v1');
```

Plus runtime kill-switch env var set to `false` in server env.

---

## Known limitations (RC1)

- Platform Engine (#396) and Platform Runtime (#400) share one table name with different schemas — **must be unified on integration branch before release**.
- First week: push notifications for days 1–7 not included in RC1.
- First week: child-side “discovery moment” on day 4 is parent-informed; world unlocks remain server-driven.
- Legacy 7-day activation program still exists until `activation_program_ui_removed` is enabled in a later wave.

---

## Support / FAQ

**“Why don’t I see the first week guide?”**  
The feature is off by default. Existing families are unaffected.

**“Did we lose our streak?”**  
No. First week messaging explicitly avoids streak punishment. Streak mechanics are unchanged.

**“Two banners on Hem?”**  
Should not happen when first week flag is on (activation suppressed). Report if both appear.

---

## Executive summary

RC1 is an **infrastructure and preparedness** release: safer CI, platform skeleton, proof-of-product runtime, and first-week journey — all **inactive on live** until flags are turned on in a controlled staging test.

---

*Draft · RC1 integration pending · 2026-06-30*
