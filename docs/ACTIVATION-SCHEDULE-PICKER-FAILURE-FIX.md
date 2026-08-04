# Activation — schedule picker failure (Pontus)

## Symptom

Parent stuck on messaging equivalent to **“kunde inte ladda scheman för att välja”** during Activation / onboarding schedule choice.

## Root causes (multiple, not one bug)

1. **Silent partial failure** — `library-schema.js` and `assign-schedule.html` `loadCategories()` swallow errors; UI shows empty lists or generic copy with no **Fortsätt ändå**.
2. **Session race** — `GET /api/onboarding/template-groups` during session refresh returns **401**; onboarding step 1 shows `templatesLoadFailed` and disables continue with no defer path.
3. **Empty global library** — fresh or mis-synced `default_schedule` → zero template groups; treated like failure though it is **empty state**, not network error.
4. **Wrong surface** — Hem coach `save_schedule` redirected to `/onboarding#stepStarterPlan` without inline recoverable picker; any load error felt like “coach lock-in”.
5. **Timeout** — no bounded wait or auto-retry on combined parallel fetches.

Contributing factors: family scope OK when authed; wrong `child_id` rare; archived/invalid = templates with **zero items** (now filtered server-side); locale/bootstrap race on template-groups meta.

## Fix (v771)

- **`GET /api/family/activation/schedule-options`** — single authoritative list (starter + family templates, valid items only).
- **`activation-schedule-picker.js`** — loading state, 12s timeout + `AbortController`, one auto-retry, manual retry, empty vs error, stale response ignored via generation counter + abort on destroy.
- **Recoverable actions** on coach and picker: report, continue anyway, create schedule link.
- **Human copy** via `home.activationRecoverable.errors.*` (not raw error codes).

## Verification

- `npm run test:gate` includes `test/activation-recoverable-steps.test.js`
- Prod smoke after deploy: normal load, empty library, simulated 401/5xx (staging), retry, report, continue anyway, child-first unchanged.

## Global flag

Do **not** enable `activation_first_success_v1` globally until this build is deployed and prod-smoke is green.
