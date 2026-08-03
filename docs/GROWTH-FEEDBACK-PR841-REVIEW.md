# Growth & Feedback Loop v1 — PR #841 Review

**Date:** 2026-08-03  
**Branch:** `cursor/growth-feedback-loop-v1`  
**Reviewer role:** Security + Backend + QA + Product (Journey authority)  
**Decision:** see §20

---

## 1. Executive summary

PR #841 implements a flag-gated acquisition → feedback → referral → stuck-cohort loop. Functional scope matches the claimed delivery. Review hardening fixed: CI CSS/SW mismatch, `account_delete` flag bypass, multi-parent onboarding inconsistency, waitlist consent strictness + timestamp/version, analytics poll spam, and weak comment-submit UX. No parallel Journey authority invented; value/blocker checks read `family_activation_state`, `family_milestones`, and `getFamilyCommunicationState`.

**Staging does not exist** — rollout must use prod dark-launch with flags OFF first (see `docs/GROWTH-FEEDBACK-DARK-LAUNCH-PLAN.md`).

---

## 2. Preflight

| Check | Result |
|-------|--------|
| Branch | `cursor/growth-feedback-loop-v1` |
| Working tree at review start | Clean after checkout |
| Commits vs `origin/main` | **10 ahead / 0 behind** (implementation) + hardening commits |
| Mergeable | `MERGEABLE` (GitHub) |
| Merge state | Was `UNSTABLE` (CI CSS fail) |
| PR checks | `test` FAIL (tailwind header v762 vs SW v763); `e2e-i18n` PASS |
| Parallel SW | stability PR #840 → **v764**; this PR → **v763**; main → **v762** |
| Migration IDs | `1810140000000`–`1810140000003` — no collision with `origin/main` (latest `181013…`) |

---

## 3. Branch och SHA

Documented at delivery time in PR body / final status block. Base: `main` @ `93b68773`.

---

## 4. Ändringskarta

| File | Class | Tag |
|------|-------|-----|
| `migrations/1810140000000_family_acquisition_attribution.js` | DATABASE | EXPECTED |
| `migrations/1810140000001_family_growth_feedback.js` | DATABASE | EXPECTED |
| `migrations/1810140000002_waitlist_funnel_fields.js` | DATABASE | EXPECTED / NEEDS REVIEW (consent) |
| `migrations/1810140000003_growth_feedback_loop_flags.js` | DATABASE | EXPECTED |
| `db/family-acquisition-attribution.js` | BACKEND API | EXPECTED |
| `db/growth-feedback.js` | BACKEND API | EXPECTED |
| `db/growth-stuck-cohorts.js` | BACKEND API | EXPECTED |
| `db/waitlist.js` | EMAIL/WAITLIST | EXPECTED |
| `src/lib/acquisition-attribution.js` | BACKEND API | EXPECTED |
| `src/lib/growth-feedback-eligibility.js` | BACKEND API | EXPECTED / Journey |
| `src/lib/referral-eligibility.js` | BACKEND API | EXPECTED / Journey |
| `src/lib/activation-flags.js` | BACKEND API | EXPECTED |
| `src/routes/growth-feedback.js` | BACKEND API | EXPECTED |
| `src/routes/admin/growth-stuck-cohorts.js` | ADMIN | EXPECTED |
| `src/routes/account/lifecycle.js` | BACKEND API | EXPECTED |
| `src/routes/auth/register.js` + oauth + create-oauth | BACKEND API | EXPECTED |
| `src/routes/public.js` | EMAIL/WAITLIST | EXPECTED |
| `src/routes/analytics.js` | ANALYTICS | EXPECTED |
| `public/js/utm-capture.js` | CLIENT | EXPECTED |
| `public/js/growth-feedback.js` | CLIENT | EXPECTED |
| `public/js/growth-referral-cta.js` | CLIENT | EXPECTED |
| `public/js/referral-capture.js` / `referral-share.js` | CLIENT | EXPECTED |
| `public/dashboard.html` | CLIENT | EXPECTED / CONFLICT RISK (Hem) |
| `public/admin/*growth-stuck*` | ADMIN | EXPECTED |
| `public/sw.js` + `config/cache-version.json` | SERVICE WORKER | CONFLICT RISK |
| `public/css/tailwind.build.css` | SERVICE WORKER/CSS | CONFLICT RISK (CI) |
| `test/*growth*` / `acquisition*` | TEST | EXPECTED |
| `docs/GROWTH-*` | DOCUMENTATION | EXPECTED |

**Conflict risk surfaces:** `public/sw.js`, `dashboard.html`, migrations registry, admin nav — also touched by stability (#840) and English RC (#842).

---

## 5. Migration och datamodell

### Answers

1. **First-touch** (DB `COALESCE` fill-gaps only; client UTM first-touch 30d TTL). Mixed only in the sense that null gaps may be filled later — never overwrite non-null first-touch fields.  
2. **First-touch cannot be overwritten** once set.  
3. **Client cannot attribute another family** — `POST /api/account/attribution` uses `requireParent` + `req.user.familyId`.  
4. **No raw landing URLs / fbclid / tokens** in durable table. Allowlist: `STORED_FIELD_ALLOWLIST`.  
5. **Indexes:** `source`, partial `referral_code`, `registered_at DESC` — sufficient for admin joins; stuck cohort filters primarily on `family.created_at` + activation columns.

### Safety

- Idempotent `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` / flag `ON CONFLICT DO NOTHING`  
- FK `ON DELETE CASCADE` (attribution/feedback) allowlisted for GDPR family delete  
- Waitlist `converted_family_id` → `ON DELETE SET NULL`  
- Rollback `down()` drops new tables/columns/flags  

### Waitlist consent (hardened)

- Default `marketing_consent = false`  
- Columns `marketing_consent_at`, `marketing_consent_version`  
- Legacy waitlist rows grandfathered to `waitlist_legacy_v0`  
- API requires `marketing_consent === true` (not merely “not false”)

---

## 6. Attribution/API security

| Control | Status |
|---------|--------|
| Auth (`requireParent`) | ✓ |
| Family ownership | ✓ JWT familyId |
| CSRF | ✓ under `/api` |
| Zod/register clamps | ✓ lengths |
| Normalization allowlist | ✓ hardened (HTML/script/email/UUID/JWT/URL) |
| Rate limit | Feedback yes; attribution relies on parent API limits |
| Idempotence | ✓ first-touch upsert |
| Mass assignment | ✓ only known fields read |
| Admin XSS | Attribution values escaped by existing admin patterns; stored values sanitized |

Negative cases covered in `test/growth-feedback-hardening.test.js` + `test/acquisition-attribution.test.js`.

---

## 7. Dataminimering och consent

**Durable allowlist:** source, medium, campaign, content, term, referral_code, landing_locale, platform, first_touch_at, registered_at.

**Never stored as attribution:** email in UTM, auth tokens, session IDs, child name/ID, full referrer URL, landing path, fbclid.

**Client:** `localStorage` key `msd_utm_attribution`, 30-day TTL; cleared after successful register path (existing clear hooks). Platform/locale not marketing cookies. UTM capture is first-party measurement, not Meta pixel (separate consent path for marketing events unchanged).

**Waitlist:** explicit checkbox + consent version `waitlist_en_v1` + timestamp.

---

## 8. Journey authority review

| Beslut | Datakälla | Auktoritet | Fallback |
|--------|-----------|------------|----------|
| Visa feedback efter värde | `family_activation_state.first_completion_at` / `p0_activated_at` / `family_milestones.first_success` | Activation + Journey milestones | `no_value_yet` |
| Visa stuck feedback | Blockers + `getFamilyCommunicationState` + age window | Journey derived state + activation | age/flag off |
| Visa referral | Same proven-value triad + dual flags | Activation/Journey | `no_value_yet` / flag off |
| Dölj referral vid blocker | Shared `getCriticalBlockers` | Activation state | hide CTA |
| Stuck cohort | Shared SQL in `db/growth-stuck-cohorts.js` | Activation + family age | empty list |

**No new activation score.** Product Engine vs Journey long-term authority **not** changed.

**Hardened:** `onboarding_incomplete` now means *no parent has completed* (aligned with stuck cohort `BOOL_OR`).

---

## 9. Feedback UX

- Mount: static `#growthFeedbackMount` on Hem only  
- Deferred 1.2s; skips when readiness coach blocking  
- Dismiss persisted in `localStorage` (14d TTL)  
- Shown event client-deduped  
- Flag OFF → API `flag_off`, empty UI  
- Child dashboard does not load growth scripts  
- Comment attaches to the chosen answer (no silent first-answer submit)  
- `account_delete` still intent-driven **and** flag-gated  

---

## 10. Referral abuse review

- Codes: `STJ-` + 4 Crockford-like chars — not PII, not sequential family IDs  
- Self-referral blocked (`referrer.family_id !== req.user.familyId`)  
- Invalid ref does not block signup  
- Duplicate pending: `ON CONFLICT DO NOTHING`  
- CTA requires `referral_program` **and** `growth_referral_cta_v1`  
- Copy does not promise rewards  

---

## 11. Stuck cohort-definition

Canonical helper: `db/growth-stuck-cohorts.js` only.

```
family.created_at ∈ [now-14d, now-48h]
archived_at IS NULL
QA excluded (config/internal-qa-families)
blocking_step ∈ {onboarding_incomplete, schema_no_child_login, login_no_completion, completion_no_return, core_flow_errors}
autoSendAllowed === false always
```

Admin routes behind `requireAdmin` + `growth_stuck_cohorts_v1`. No send endpoints.

---

## 12. Waitlist conversion

**Match rule:** verified registration email (case-insensitive) → `linkWaitlistConversion` once (`converted_family_id IS NULL`).  
**No** IP/UTM/OAuth-identity guess. OAuth path also links when email present.  
Invite column `launch_invited_at` prepared; **no auto-send**.

---

## 13. Feature flag-matris

| feedback | referral CTA | stuck | referral program | Expected |
|---------:|-------------:|------:|-----------------:|----------|
| OFF | OFF | OFF | OFF | Nothing new visible |
| ON | OFF | OFF | OFF | Feedback only |
| OFF | ON | OFF | OFF | No personal CTA (`referral_program_off`) |
| OFF | ON | OFF | ON | CTA after proven value |
| OFF | OFF | ON | OFF | Admin preview only |
| ON | ON | ON | ON | All parts, isolated |

Client cannot enable server paths — `isActivationFlagEnabled` is DB-backed fail-closed.

---

## 14. Analytics och mätbarhet

| Event | Trigger | Dedupe | Scope | Properties | Consent |
|-------|---------|--------|-------|------------|---------|
| `signup_attribution` | Persist attribution | first-touch store | family | normalized utm_* | first-party |
| `growth_feedback_shown` | Client after render | localStorage per prompt | family | prompt_key, reason | first-party |
| `growth_feedback_dismissed` | Client dismiss | per dismiss | family | prompt_key | first-party |
| `growth_feedback_submitted` | Server insert | unique (family,prompt) | family | prompt_key, answer, has_comment | first-party |
| `referral_shown` | Server GET eligible | per request (accept) | family | code | flags on |
| `referral_copied` / `referral_link_shared` | Client | action | family | code | flags on |
| `referral_landing` / `referral_signup` | Client/server | existing | family | code | program flag |
| `waitlist_signup` / `waitlist_account_signup` | Client/server | email unique / once | waitlist/family | locale | marketing consent |

**Not in analytics:** feedback free-text, full email, child names, auth tokens, full referral URL.

---

## 15. Testresultat

| Command | Result | Notes |
|---------|--------|-------|
| `NODE_ENV=test … npm run test:gate:unit` | **1842 pass / 0 fail** | Includes new hardening tests |
| `NODE_ENV=test … npm run test:gate:db` | **357 pass / 0 fail** | First full gate hit flaky `40P01` on Fas6 concurrent milestone truncate; re-run green |
| Targeted growth unit files | **48 pass / 0 fail** | attribution + hardening + loop + utm + referral-v0 |
| `npm run lint:public` | **172/172 warnings OK** | Budget unchanged |
| `npm run check:css` | green | SW/CSS header v763 synced |
| CI on PR #841 | test SUCCESS ×2, e2e-i18n SUCCESS | After hardening push |

Added: `test/growth-feedback-hardening.test.js` (in `test:gate:unit`).

**HEAD verified:** `07a34d09dc7d6fc8623b2d2a6a9e4185cf801783`

---

## 16. Konfliktrisker

| Risk | Detail |
|------|--------|
| SW version | This PR v763 vs stability #840 v764 — merge order matters; bump loser after merge |
| `dashboard.html` | Hem mounts — coordinate with other Hem PRs |
| Admin nav | Experiment menu |
| CI css:build | Must keep `tailwind.build.css` header = CACHE_NAME |

Do **not** rebase onto moving main while parallel agents still push SW bumps — document and coordinate.

---

## 17. Service worker

- This PR: `stjarndag-v763`  
- `origin/main`: `stjarndag-v762`  
- Stability branch: `stjarndag-v764`  
- Growth assets are small JS modules; flag-off means no UI even if stale HTML loads scripts (API returns flag_off).  
- No further bump in hardening unless static assets change after conflict resolution.

---

## 18. Ändrade filer (hardening pass)

See git diff for this review turn: eligibility, attribution normalize, growth-feedback route/client, waitlist migration/db/public route, analytics allowlist, dashboard mounts, CSS sync, tests, docs.

---

## 19. Kvarvarande blockers

| Item | Severity | Notes |
|------|----------|-------|
| SW coordination with #840 | Process | Merge order / single SW bump |
| Manual dark-launch verification | Process | No staging — follow dark-launch plan |
| Referral rewards | Out of scope | Still OFF / deferred |
| Attribution rate limit dedicated | Low | Parent API limits sufficient for v1 |
| `referral_shown` may fire without visible CTA if client errors after GET | Low | Acceptable for v1 |

None of the above are data-loss or auth HOLD blockers after hardening.

---

## 20. Mergebeslut

**Superseded by Prompt 2C final gate (2026-08-03):** see `docs/GROWTH-FEEDBACK-PR841-FINAL-MERGE-GATE.md` — **HOLD** (rebase on integration base #840+#842; SW **v765** retained; CI/tests pending).

Prior review: **CONDITIONAL MERGE** (pre–child-core/RC rebase).

---

## 21. Dark-launch-rekommendation

Follow `docs/GROWTH-FEEDBACK-DARK-LAUNCH-PLAN.md` Fas 0 → 1 → 2 → 3 → 4. Never “enable in staging”.

---

```
Self-review: PE ✓ Mobile ✓ CPO ✓ UX ✓ Game N/A QA ✓ Security ✓ AISA ✓
Issues found and fixed: CSS/SW CI mismatch; account_delete flag bypass; onboarding blocker vs cohort mismatch; waitlist consent default/strictness/timestamp; feedback shown poll spam; comment UX; missing Hem mounts; weak tests
POS governed by: Constitution 1–2; Journey/activation as value authority; referral v0 no rewards; Track B measurement
```
