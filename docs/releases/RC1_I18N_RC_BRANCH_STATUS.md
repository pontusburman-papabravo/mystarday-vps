# RC-1 English family app — branch status (2026-07-31)

**Branch:** `cursor/rc1-i18n-safe-rewards-profile-fordig-b0f7`  
**Base:** `main` (post #796 parent session handoff merge)

## Verified in code + automated tests

| Area | Status | Tests / gates |
|------|--------|----------------|
| Reward display localization (provenance-safe) | Done | `test/reward-localization-provenance.test.js`, `test/family-content-display.test.js` |
| Child `/api/me/rewards` + `/api/me/goal` content locale | Done | `resolveChildContentLocaleForFamily` (no `localizeAll`) |
| en-GB registration reward `source_default_id` when library match | Done | `src/lib/reward-provenance.js`, `register.js` |
| Child profile (`/family/child/:id`) system copy en-GB | Done | `family-*-GB.json` `childProfile.*`, `test/i18n-planning-family.test.js` |
| För dig primary view system copy en-GB | Done | `for-dig-*-GB.json`, `for-dig.js` (`scheduleName`, `pt()`) |
| Reports link on child profile | Capability-gated | `components.reporting.has` via `fetchPackageAccess` |
| i18n audits | Green | `npm run audit:i18n:strict`, `audit:i18n:baseline` (0 hits) |
| CI gate | Green | `npm run test:gate` (test env per root AGENTS.md) |

## PR #791 handling

**Not merged.** Open PR #791 proposed `localizeAll: true` for all reward names on English child locale. This branch **rejects** that approach:

- Only `source_default_id` + `modified_by_family = false` rows localize (unchanged `isSystemSeededReward`).
- Registration seeds set `source_default_id` when `default_reward` match is unambiguous (icon + cost + name, or unique icon+cost).
- Legacy rows without provenance stay in stored language (safe default).
- Expanded `sv-to-en.json` reward map for library titles (subset of #791, without broad auto-translate).

## PR #796 dependency

#796 (opaque parent session handoff) is **merged on main**. RC-1 child/parent locale behaviour still depends on handoff + session restore for Journey C / R4-E; see physical QA below.

## Physical QA — NOT RUN (required before device sign-off)

- R4-E normal pass
- R4-E stress pass
- Manual journeys A–D (`docs/releases/RC1_I18N_RELEASE_REQUIREMENTS.md`)
- iPhone Safari / native WebView
- Android Chrome / WebView
- Child handoff after session handoff deploy on target environment
- Service worker update verification after deploy

## Explicitly out of RC-1 scope (unchanged)

- Swedish admin, SEO articles, resurser PDFs, full Reports product copy, legal en review, Professional Report PDF
