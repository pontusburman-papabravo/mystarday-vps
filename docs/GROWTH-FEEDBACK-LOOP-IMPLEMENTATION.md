# Growth Feedback Loop — Implementation (v1)

**Branch:** `cursor/growth-feedback-loop-v1`  
**Status:** Implemented behind feature flags (default OFF); hardened in PR #841 review  
**No merge / deploy / mass communication in this PR track.**  
**No staging environment** — see `docs/GROWTH-FEEDBACK-DARK-LAUNCH-PLAN.md`.  
**Review:** `docs/GROWTH-FEEDBACK-PR841-REVIEW.md`.

POS / constitution: Rules 1–2 (no surprise before value; one clear next step).  
Program plan: `docs/PRODUCT-PROGRAM-EXECUTION-PLAN-2026-08.md` Track B.  
Referral base: `docs/referral-program.md` (v0 tracking, no rewards).

---

## 1. Goal

Measurable loop:

**Acquisition → registration → first value → concrete feedback → referral → stuck-family follow-up preview**

Not another general dashboard. Answers:

| Question | Source |
|----------|--------|
| Where did users come from? | `family_acquisition_attribution` + waitlist UTMs |
| Did they reach first value? | `family_activation_state` / Journey milestones |
| What blocked them? | Stuck cohorts + stuck feedback prompts |
| What do they appreciate? | `family_growth_feedback` (`first_value` / `three_routine_days`) |
| Who is ready to recommend? | Referral eligibility after proven value |

---

## 2. Audit summary (attribution gaps)

| Stage | Before | After (this PR) |
|-------|--------|-----------------|
| Landing UTM | `localStorage` via `utm-capture.js` | Same + platform/locale; `?ref=` also on `/` and `/en` |
| Waitlist | `utm_source` column unused (`null`) | Client sends UTM; consent + locale + platform |
| Email register | Analytics event only | Durable row in `family_acquisition_attribution` |
| OAuth register | No server attribution | Body fields + `POST /api/account/attribution` |
| Store campaign IDs | Not in app | Still not wired (documented gap) — platform field only |
| First success ↔ source | Join via events | Join via attribution table + activation state |
| Referral UI | Generic `/register` share | Personal `?ref=` only when eligibility gate passes |
| Stuck families | Onboarding-incomplete list only | Multi-cohort admin preview with acquisition |

**Where attribution still drops:** native App Store / Play install campaign parameters (Apple `pt`/`ct`, Google Play referrer) are not ingested in this PR — requires store/SDK plumbing outside the web funnel.

---

## 3. Event taxonomy

### Client allowlist (`src/routes/analytics.js`)

| Event | When |
|-------|------|
| `referral_landing` | `?ref=` first stored |
| `referral_shown` | Personal referral CTA eligible + shown |
| `referral_copied` | Parent copied personal link |
| `referral_link_shared` | Parent shared personal link |
| `referral_signup` | New family registered with code (server) |
| `referral_qualified` | Referred family hits P0 (existing) |
| `growth_feedback_shown` | Client after first render (deduped) |
| `growth_feedback_dismissed` | Parent dismisses prompt |
| `growth_feedback_submitted` | Answer stored (no free-text in analytics) |
| `waitlist_signup` | EN waitlist form success (client) |
| `waitlist_account_signup` | Waitlist email linked at registration (server) |
| `waitlist_launch_invite` | Reserved — human-approved send only |
| `waitlist_child_created` / `waitlist_first_success` | Reserved for funnel completion tracking |

### Server-only

| Event | When |
|-------|------|
| `signup_attribution` | Normalized attribution persisted |
| `funnel_signup_started` | Existing |

Metadata rules: normalized `utm_*` / `source` / `medium` / `campaign` / `content` / `platform` / `landing_locale` / `referral_code`. **No raw URLs. No fbclid / tokens / secrets in durable table.**

---

## 4. Data model

### `family_acquisition_attribution`

| Column | Notes |
|--------|-------|
| `family_id` PK | |
| `source`, `medium`, `campaign`, `content`, `term` | Clamped lengths |
| `referral_code` | VARCHAR(12) |
| `landing_locale` | `sv-SE` / `en-GB` |
| `platform` | `web` \| `pwa` \| `ios` \| `android` |
| `first_touch_at` | Client capture time when valid |
| `registered_at` | Server registration time |

Idempotent **first-touch** upsert (`COALESCE` fill-gaps only — never overwrite set fields).

**Durable field allowlist** (`STORED_FIELD_ALLOWLIST`): source, medium, campaign, content, term, referral_code, landing_locale, platform, first_touch_at, registered_at.  
**Not stored:** landing path, raw referrer URL, fbclid, tokens, emails, child identifiers.

### `family_growth_feedback`

One row per `(family_id, prompt_key)`. Optional comment ≤500 chars. Context JSONB whitelist: `blocking_step`, `surface`, `trigger`.

### `waitlist` additions

`landing_locale`, `marketing_consent` (default **false**), `marketing_consent_at`, `marketing_consent_version`, `utm_medium/campaign/content`, `platform`, `launch_invited_at`, `converted_family_id`, `converted_at`.

**Conversion match:** verified registration email only (case-insensitive), once; no IP/UTM identity guess.

---

## 5. Funnel definitions

### Web / PWA (sv-SE)

1. Landing visit (+ UTM / ref capture)  
2. Registration (`family_acquisition_attribution`)  
3. Child created  
4. Schema saved  
5. Child access (`child-login`)  
6. First completion / First Success  
7. Feedback (`first_value`)  
8. Referral CTA (if flags + eligibility)

### English waitlist

1. `waitlist_signup` (+ consent, locale `en-GB`)  
2. `launch_invited_at` — **human approval only** (column ready; no auto-send)  
3. Account signup → `converted_family_id` + `waitlist_account_signup`  
4. Child created  
5. First success  

### App (iOS/Android)

Same as web after account creation; `platform` from Capacitor / client. Install-campaign IDs out of scope.

---

## 6. Segment definitions (admin stuck cohorts)

Window default: **48 hours – 14 days** after family creation. QA/test families excluded (`config/internal-qa-families.js`) unless `includeQa=1`.

| Cohort key | Definition | Recommended follow-up (preview) |
|------------|------------|----------------------------------|
| `onboarding_incomplete` | No parent has `onboarding_completed` (family-level `BOOL_OR`) | `preview_handoff_nudge` |
| `schema_no_child_login` | Schema saved, no child access | `preview_child_login_help` |
| `login_no_completion` | Child access, no completion | `preview_first_star_guide` |
| `completion_no_return` | Completion then ≥7d no login | `preview_return_nudge` |
| `core_flow_errors` | Recent core-flow error events | `preview_support_outreach` |

Each family row includes: blocking step, last event, locale, platform, acquisition source, recommended follow-up, **`autoSendAllowed: false`**.

API:

- `GET /api/admin/growth/stuck-cohorts`
- `GET /api/admin/growth/stuck-cohorts/summary`

UI: Admin → Experiment → **Fastnade familjer**. Admin preview is always readable (`requireAdmin`); `growth_stuck_cohorts_v1` does not 503 the list. **No send endpoints.**

---

## 7. Feedback prompts (Journey-gated)

Flag: `growth_feedback_v1` (default OFF).

| Prompt | When |
|--------|------|
| `first_value` | First completion / P0 / first_success; **no** critical blockers |
| `three_routine_days` | ≥3 distinct completion days; no critical blockers |
| `onboarding_no_child_access` | Schema without child login, ≥48h |
| `stuck_blocker` | Stuck in SETTING_UP/FIRST_USE/AT_RISK, 48h–14d |
| `account_delete` | Explicit client intent only |

Positive question: *Blev den här rutinen lite enklare?* / *Did this routine get a little easier?*  
Answers: Ja / Lite / Nej ännu.

Stuck question: *Vad gjorde att ni inte kom vidare?* with step-based options (child login, schedule, technical, too many steps, child refused, other).

**Never** before value for positive prompts. **Never** while readiness/coach blocker competes (client check via `EngineClient.isReadinessBlockingCoach`).

API: `GET/POST /api/growth/feedback` (parent auth, rate limit, CSRF via `/api`).

---

## 8. Referral after proven value

Flags: `referral_program` + `growth_referral_cta_v1` (both default OFF).

Eligible when:

1. Proven value (first completion **or** P0 **or** Journey `first_success`)  
2. No critical activation blockers  
3. Both flags on  

Reuses `referral_code` / `referral` tables and qualify-on-P0 path.  
UI: `public/js/growth-referral-cta.js` (separate from generic dela-appen).  
Generic share remains clean `/register` without forcing `?ref=`.

---

## 9. Feature flags

| Key | Default | Purpose |
|-----|---------|---------|
| `growth_feedback_v1` | OFF | Feedback surface + API eligibility |
| `growth_referral_cta_v1` | OFF | Personal referral CTA |
| `growth_stuck_cohorts_v1` | OFF | Reserved for future outreach; admin preview is not gated |
| `growth_waitlist_funnel_v1` | OFF | Reserved for waitlist funnel ops UI |
| `referral_program` | OFF (existing) | Register capture + qualify |

Enable per environment via admin feature flags — no auto mass comms.

---

## 10. GDPR / data minimization

- No raw landing URLs stored when normalized fields suffice  
- No click IDs / tokens (`fbclid` accepted on register for compat, **not** written to attribution table)  
- Feedback comments capped at 500 chars; context keys whitelisted  
- Waitlist requires **explicit** marketing consent (`=== true`) + version/timestamp  
- Attribution never blocks registration (errors logged, signup continues)  
- Admin segments for human review only  
- Feedback submit remains flag-gated (including `account_delete`)  

---

## 11. Human approval still required

| Action | Auto? |
|--------|-------|
| Waitlist launch invitation email | **No** — column only |
| Stuck-family outreach email/push | **No** — preview segments |
| Win-back / activation nudges | Existing Journey Gate + env flags (unchanged) |
| Referral rewards | **No** — still deferred per referral spec |

---

## 12. Tests

| File | Coverage |
|------|----------|
| `test/acquisition-attribution.test.js` | UTM normalize, clamp, secrets, direct, platforms |
| `test/growth-feedback-hardening.test.js` | Ownership/Journey consistency, consent, abuse, analytics |
| `test/utm-attribution.test.js` | RegisterSchema + client contract |
| `test/growth-feedback-loop.test.js` | Flags, eligibility, admin, analytics, clients, waitlist |
| `test/referral-v0.test.js` | Updated for eligibility gate + gated CTA |

Run:

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
# Gate uses the repo test script defaults; unset outbound email keys for local runs.
env -u RESEND_API_KEY -u RESEND_API_KEY_WEEKLY \
  npm run test:gate
```

---

## 13. Rollback

1. Set flags OFF: `growth_feedback_v1`, `growth_referral_cta_v1` (customer surfaces). Admin stuck preview is not flag-gated; it has no send path. 
2. Optional: drop tables via migration `down` (safe if unused)  
3. Revert SW to previous `CACHE_NAME` if static rollback needed  

No destructive change to existing referral/activation tables.

---

## 14. DOM / surface proof (implementation)

| Surface | Selector / file |
|---------|-----------------|
| Feedback mount | `#growthFeedbackMount` — `public/js/growth-feedback.js` |
| Referral CTA | `#growthReferralCtaMount` — `public/js/growth-referral-cta.js` |
| Waitlist consent | `#waitlistConsent` — `public/en.html` |
| Admin cohorts | `#growthStuckSection` — `public/admin/index.html` |

Screenshots: capture after flags ON against prod/QA with dark-launch plan (no staging).

---

## 15. Key files

| Area | Paths |
|------|-------|
| Migrations | `migrations/1810140000000_*` … `1810140000003_*` |
| Attribution | `src/lib/acquisition-attribution.js`, `db/family-acquisition-attribution.js` |
| Feedback | `src/lib/growth-feedback-eligibility.js`, `src/routes/growth-feedback.js`, `db/growth-feedback.js` |
| Referral gate | `src/lib/referral-eligibility.js`, `src/routes/account/lifecycle.js` |
| Stuck admin | `db/growth-stuck-cohorts.js`, `src/routes/admin/growth-stuck-cohorts.js` |
| Waitlist | `db/waitlist.js`, `src/routes/public.js`, `public/js/landing-waitlist.js` |
| Clients | `utm-capture.js`, `growth-feedback.js`, `growth-referral-cta.js`, `referral-capture.js` |

---

## 16. Self-review

```
Self-review: PE ✓ Mobile ✓ CPO ✓ UX ✓ Game N/A QA ✓ Security ✓ AISA ✓
Issues found and fixed: OAuth attribution gap; waitlist UTM null; referral before value; fbclid durable storage removed;
  CSS/SW CI sync; account_delete flag bypass; onboarding blocker alignment; waitlist consent at/version;
  feedback shown dedupe; Hem static mounts
POS governed by: Constitution 1–2, Track B growth plan, referral v0 (no rewards), Journey/activation for value gates
```

---

## 17. Post-rebase gate (Prompt 2C)

After child-core (#840) + RC harness (#842) integration: SW/cache remain **`stjarndag-v765`** (growth scripts not in `STATIC_ASSETS`). Full matrix: `docs/GROWTH-FEEDBACK-PR841-FINAL-MERGE-GATE.md`.

*End of implementation note. No live mass communication from this PR track.*
