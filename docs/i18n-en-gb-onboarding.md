# en-GB onboarding localisation — PR inventory

**Branch:** `cursor/i18n-en-gb-onboarding-clean`  
**Depends on:** PR #709 i18n foundation (`family.preferred_locale`, `english_app`, client/server i18n)  
**Scope:** Complete parent onboarding through redirect to Home — **not** Home/dashboard translation.

## Onboarding entry points

| Entry | Route / trigger |
|-------|-----------------|
| Post-register | `/register` → `/onboarding` |
| Incomplete login | `onboarding_completed === false` → `/onboarding` |
| Add child | `/onboarding?flow=add-child` |
| Email handoff resume | `/onboarding?resume=child-handoff` |
| Child wizard (alternate) | `/child-wizard` (shares APIs; out of strict audit for this PR unless touched) |

## Flow branches

```
Auth → /onboarding
├─ ?resume=child-handoff → handoff-context API → step 5 or dashboard
├─ ACT-1 slim (activation_signup_slim_v1, default prod)
│    3 questions → suggest → preview → child + schedule → /dashboard
├─ ACT-1 full wizard (activation_onboarding_v1)
│    7 questions → optional AI → preview → child + schedule
│    → activity guide → handoff film OR step 5 → step 6
├─ Legacy 6-step (flags off OR power-user legacy_template)
│    child → view type → schedule confirm → rewards → handoff → complete
└─ Post-complete: ActivationProgramEnrollChoice (7-day program, optional)
```

Progress is **server-driven** (`family_activation_state.funnel_step`, `parent.onboarding_completed`). No wizard step in localStorage.

## Files migrated to i18n

| File | Role |
|------|------|
| `public/onboarding.html` | Wizard shell — `data-i18n*` |
| `public/js/onboarding-i18n.js` | Bootstrap after `/api/auth/me` |
| `public/js/onboarding.js` | Legacy 6-step wizard |
| `public/js/onboarding-starter-plan.js` | Slim + full starter plan |
| `public/js/onboarding-activation.js` | Handoff CTAs, skip dialog |
| `public/js/onboarding-activity-guide.js` | Completion style step |
| `public/js/onboarding-handoff-film.js` | Post-schema film |
| `public/js/onboarding-first-star.js` | First-star overlay |
| `public/js/activation-program-enroll-choice.js` | Post-onboarding enroll UI |
| `config/i18n/onboarding-sv-SE.json` | Swedish onboarding strings (394 keys) |
| `config/i18n/onboarding-en-GB.json` | English onboarding strings (394 keys) |
| `src/lib/onboarding-locale.js` | Server error resolution |
| `src/routes/onboarding.js` | Localized API errors + template meta |
| `src/routes/activation-program.js` | Localized enroll-choice copy |
| `config/starter-plan-meta.js` | Localized display names |

## Locale keys

Domain prefix: `onboarding.*` (merged from `config/i18n/onboarding-{locale}.json`)

Subdomains: `common`, `pageTitle`, `verifyEmail`, `child`, `activityGuide`, `viewType`, `scheduleReady`, `rewards`, `handoff`, `parentPin`, `invite`, `complete`, `weekend`, `starter`, `handoffFilm`, `firstStar`, `activation`, `loading`, `templateGroups`, `sections`, `errors`

Plural pattern: `key.one` / `key.other` via `I18n.plural()` / `onboardingPlural()`.

## Feature flags (unchanged logic)

| Flag | Effect on onboarding |
|------|---------------------|
| `activation_signup_slim_v1` | 3-question path → dashboard (default prod) |
| `activation_onboarding_v1` | Full starter wizard |
| `activation_child_handoff_v1` | Step 5 handoff CTAs |
| `activation_onboarding_handoff_film_v1` | Film after schema |
| `activation_first_star_guide_v1` | First-star overlay |
| `activation_ai_starter_plan` | AI personalize |
| `english_app` | Required for en-GB UI on existing families |
| `english_child_experience` | **OFF** — child stays `child_se` |

## Resume / locale

1. After family exists: `family.preferred_locale` wins (via `I18n.init(me.preferred_locale)` after `/api/auth/me`)
2. Pre-auth: `sessionStorage.sd_preferred_locale` only until registration
3. Reload mid-onboarding: server funnel_step + DOM `data-i18n` re-applied on init
4. Language change in settings does not reset onboarding progress

## Auth email locale

Unchanged from foundation — verification uses `family.preferred_locale` at registration.

## Analytics

Event names unchanged. Locale may be added as metadata where client already sends properties.

## Post-onboarding boundary

**English onboarding is complete. The post-onboarding Home experience remains part of the next i18n PR.**

Home/dashboard may still show Swedish copy after onboarding redirect — documented for QA.

## QA commands (per family)

```sql
-- Enable English parent flows for QA family
INSERT INTO family_features (family_id, feature_slug)
VALUES ('<family-uuid>', 'english_app') ON CONFLICT DO NOTHING;

-- Verify locale
SELECT preferred_locale FROM family WHERE id = '<family-uuid>';

-- Disable
DELETE FROM family_features
WHERE family_id = '<family-uuid>' AND feature_slug = 'english_app';
```

Do **not** enable `english_app` globally.

## Terminology (en-GB)

| sv-SE | en-GB |
|-------|-------|
| Stjärndag (sv brand) | My Starday |
| Barn | Child |
| Schema | Schedule |
| Rutin | Routine |
| Aktivitet | Activity |
| Delaktivitet | Step |
| Belöning | Reward |
| Stjärna/stjärnor | Star/Stars |
| Skattkammaren | Treasure Chest |
| Barninloggning | Child Login |
| Föräldrakod | Parent PIN |
