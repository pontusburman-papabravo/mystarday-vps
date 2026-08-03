# Activation — sv-SE coach hardening

## Symptom

`npm run test:activation-first-success-browser` reported `multiple_primary_coaches` for **sv-SE** while **en-GB** passed.

Harness counts visible primary mounts:

- `#activationFirstSuccessCoachMount`
- `#engineCoachMount`
- `#journeyCoachMount`

## Root cause

Race between **async coach initialization** and **First Success hub authority**:

1. `journey-coach.js` runs `pollCoach()` on `DOMContentLoaded` (and on an interval).
2. `engine-coach.js` runs `load()` on `DOMContentLoaded`.
3. `ActivationFirstSuccessHub.load()` runs later (e.g. from `dashboard-home-hub.js` ladder).

When Journey/Engine rendered **before** the hub cached `enabled + show_primary_coach`, legacy coaches stayed visible even though `shouldSuppressLegacyCoaches()` would return true **after** hub load.

sv-SE was more likely to hit this because signup-journey coach content (localized copy, `signup_journey.active`) populated Journey coach early; en-GB often had an empty or deferred coach surface in the same window.

`shouldSuppressLegacyCoaches()` previously keyed off a narrow `cache.flagOn` bit instead of the full cached payload.

## Fix

`public/js/activation-first-success-hub.js`:

1. `shouldSuppressLegacyCoaches()` uses `cache.data.enabled && cache.data.show_primary_coach`.
2. After a successful First Success render, `refreshLegacyCoachMounts()` re-runs `EngineCoach.load({ force: true })` and `JourneyCoach.pollCoach()` so legacy mounts hide immediately.

Flag **OFF** path unchanged (hub returns disabled; legacy coaches follow existing Journey/Engine rules).

## Expected coach matrix

| State | First Success mount | Engine/Journey primary |
|-------|----------------------|-------------------------|
| Flag OFF | hidden | legacy behavior |
| Flag ON, pre-`first_success` | exactly one primary | suppressed |
| Flag ON, post-`first_success` | hidden | may show per Journey/Engine rules |
| Growth / readiness warnings | unchanged | system warnings not hidden |

## Verification

```bash
npm run test:activation-first-success-browser
npm run test:gate
```

SW/cache bump when client JS changes (e.g. `stjarndag-v768`).
