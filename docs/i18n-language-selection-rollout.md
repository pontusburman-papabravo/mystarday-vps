# Language selection rollout (P-i18n-Language-Launch-Foundation)

## New users

1. **Mandatory choice** on `/register` and `/en/register` via `public/js/language-choice.js`.
2. Browser locale **suggests** highlight only — user must tap Svenska or English (Beta).
3. Choice stored in `sessionStorage` (`sd_locale_confirmed`, `sd_preferred_locale`).
4. Registration sends `preferred_locale`; server sets:
   - `family.preferred_locale`
   - `locale_selection_source = registration`
   - `english_beta_offer_state = registration_decided`
   - `locale_selected_at = NOW()`
5. **en-GB** at registration auto-enables `english_app` on `family_features`.

## Existing users

1. One-time offer via `public/js/english-beta-offer.js` when:
   - `preferred_locale = sv-SE`
   - `locale_selection_source = legacy_default`
   - `english_beta_offer_state` in `not_shown` or `remind_later` (after remind date)
2. Actions: stay Swedish · try English beta · remind later (7 days).
3. English is **never** auto-enabled.

## Settings

- `public/js/locale-switcher.js` — Svenska / English (Beta), persists via `PUT /api/family/settings`.
- Switching to en-GB enables `english_app` if missing.

## Beta UX

- `public/js/english-beta-banner.js` — non-blocking banner for en-GB parents.
- CTA: report language issue · switch back to Swedish.

## Feedback

- `POST /api/feedback` type `language` with sanitized `metadata` JSON on `contact_message`.

## Analytics events

Whitelisted in `src/routes/analytics.js`: `language_choice_viewed`, `language_selected`, `existing_family_language_offer_*`, `language_changed`, `english_beta_banner_viewed`, `language_issue_report_*`, `i18n_missing_key`, `i18n_fallback_visible`.

## Feature flags

| Flag | Role |
|------|------|
| `english_app` | Parent/auth en-GB surfaces for existing families; auto-granted on active en-GB choice |
| `english_child_experience` | Separate gate for `child_en` pack (Child Core track) — **default OFF** |
| `engelsk_landingssida` | Public `/en` marketing landing only |
| `english_language_offer` | Global kill switch (`feature_flag`) for existing-family offer only; registration choice unaffected |

## Child fallback (en-GB without Child Core)

When `preferred_locale = en-GB` and `english_app = ON` but `english_child_experience = OFF`:

- Parent/auth surfaces use en-GB where covered.
- **Child dashboard stays `child_se`** (Swedish child UX) via `experiencePackIdForLocale()` — no silent mixed-language child UI.
- Child login is **not** blocked; parents see Swedish child experience until Child Core ships.

## Rollback

1. Disable broken en-GB areas via `english_app` per family or globally (do not revert user locale silently).
2. Pause existing-family offer via `english_language_offer = false` in admin feature flags.
3. Offer “Switch back to Swedish” in beta banner.
4. Do not roll back migration `1810000000005` in normal deploy flow.

## Merge order (with PR #713 / #715)

1. **#713** — Home/Today/nav i18n → merge → deploy → smoke
2. **#715** — Planning/Library/Family i18n (rebase on main) → merge → deploy → smoke
3. **#717** — This foundation (rebase on main after #713+#715; resolve SW/cache conflicts to monotonic higher version)

## Physical QA

**Not completed** — browser/VM smoke only. PR #713 mobile QA remains blocked pending physical devices.

POS: ADR-017, Constitution rules 1–5 (active choice, no surprise, beta honesty).
