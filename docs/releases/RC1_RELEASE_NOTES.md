# RC1 Release Notes

**Status:** Draft — ships when integration branch merges to `main` with flags **OFF**.  
**Audience:** Team, support, founders.

---

## Summary for families

**With default settings: nothing changes.**

RC1 prepares new capabilities behind feature flags. Existing families keep the same onboarding, parent home, child experience, stars, schedules, and rewards until flags are deliberately enabled on staging.

---

## What ships (inactive by default)

### Platform Runtime & Experience Pack (#400)

When `platform_runtime_enabled` is turned on (staging first):

- After a child completes an activity, the app can show gentle world feedback tied to progression — a natural consequence of routine, not a separate points game.
- Progression is stored server-side; the child world can reflect discoveries.

**Default: OFF.** No visible change on live.

### First Week parent journey (#402)

When `family_journey_first_week_v1` is turned on (staging first):

- After **first success**, parents get a calm day 1–7 guide: morning/evening nudges, reassurance if a day is missed, and a warm week reflection on day 7.
- Days 5–6 stay intentionally quiet.
- If a family is also in the legacy 7-day activation program, that banner is hidden while first week is active.

**Default: OFF.** No visible change on live.

### Platform Engine library (#396)

Internal skeleton for future worlds and progression rules. Not wired to live UI until Platform Runtime is enabled. Families see no change.

### CI & test reliability (#401)

Faster, more reliable automated tests; route inventory in CI; `npm ci` works with Capacitor peer-deps fix. No app behavior change.

---

## What stays the same (flags OFF)

- Login, registration, onboarding
- Star economy, Skattkammaren, streaks
- Child universe/world appearance
- Parent dashboard (Hem) — no new banners or coaches
- Payments / IAP
- Email and push
- Admin core flows
- Legacy Journey (handoff → first success → celebration)

---

## For operators

| Capability | Flag | Default |
|------------|------|---------|
| Platform Runtime | `platform_runtime_enabled` | OFF |
| First Week journey | `family_journey_first_week_v1` | OFF |

Emergency off:

```sql
UPDATE feature_flag SET enabled = false
WHERE key IN ('platform_runtime_enabled', 'family_journey_first_week_v1');
```

Plus platform runtime env kill-switch off in server env.

First enable on staging: follow `docs/first-success/FIRST-LIVE-ENABLE-CHECKLIST.md` (#400). First week requires existing Journey wave flags.

---

## Known limitations

- **#396 + #400** share table name `child_progression_node` with incompatible schemas — must unify on integration branch before release.
- First week push notifications not in RC1.
- Legacy 7-day activation program remains until `activation_program_ui_removed` in a later wave.

---

## Support FAQ

**"Why don't I see the first week guide?"**  
Off by default. Existing families unaffected.

**"Did we lose our streak?"**  
No. Streak mechanics unchanged; first week messaging avoids streak punishment.

**"Two banners on Hem?"**  
Should not happen when first week is on (activation suppressed). Report if both appear with only one flag enabled.

---

## Release status

RC1 is an **infrastructure and preparedness** release: safer CI, platform skeleton, proof-of-product runtime, and first-week journey — all **inactive on live** until controlled staging enable.

**Current status: BLOCKED** — four PRs need one integration branch before merge. See `RC1_RELEASE_CHECKLIST.md`.

---

*Draft · RC1 integration pending · 2026-06-30*
