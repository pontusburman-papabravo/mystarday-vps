# Product Program — Execution Plan (August 2026)

**Type:** Audit + planning only (no product code in this deliverable)  
**Analyzed commit:** `5eb6a0f6a9e4c057afcc2909dbc2ec81d41b8fde` (`origin/main`, 2026-08-03)  
**Branch for this document:** `cursor/product-program-baseline-2026-08`  
**Node / npm (audit VM):** v20.20.2 / 10.8.2  
**Authority order:** POS → `.ai/` + `.cursor/rules/` → code → `SYSTEM_ANALYSIS.md` (context only)

---

## 1. Preflight (verified 2026-08-03)

| Check | Result |
|-------|--------|
| `git status --short` | Clean working tree |
| `git branch --show-current` | `cursor/product-program-baseline-2026-08` (tracks `origin/main` at creation) |
| `git rev-parse HEAD` | `5eb6a0f6a9e4c057afcc2909dbc2ec81d41b8fde` |
| `git rev-parse origin/main` | Same SHA |
| `HEAD..origin/main` | Empty (in sync) |
| `origin/main..HEAD` | Empty before doc commit |

**Recent `origin/main` (top 10):**

- `5eb6a0f6` feat(admin): Meddelanden och incidenter i separata inboxar (#838)
- `048b98df` Merge #836 native IAP / RevenueCat sandbox gate
- `3f3147c1` fix(deploy): ops scripts from VPS_APP_PATH (#837)
- `8cd91091` perf(admin): faster /admin first load (#835)
- `1f8fff61` fix(iap): canonical product contract, sandbox gate, readiness
- `0f44ae84` Merge #834 restore DB lifecycle
- `823`–`820` child delsteg + activity order parity (merged 2026-08-02)

**Open PRs (sample — verify before acting):** #831 ops backup report, #825 integrity/IAP+SSRF audit, #813 RC1 handoff/locale harness (test-only), #789 P0 account deletion (`pin_notification_log`), several ops/incident docs. **Recently merged:** #838, #837, #836, #835, #832–834, #823–822, #820.

**Prod DB flag state:** Not queried (no prod mutation). Defaults below come from **migrations + env kill switches** on a fresh `npm run migrate`.

---

## 2. Executive summary

Five tracks share one bottleneck: **time to first real value** (schema → verified child access → completion → parent sees it). Stability and performance are gates, not competitors. English launch is **RC-blocked on automation and device smoke**, not on bulk i18n migration (program marked complete in docs; gaps are release bugs).

**Recommended strategic order for implementers:**

1. **P0/P1 stability** — account deletion (#789), integrity audit (#825), RC1 prod smoke green (#813 + secrets).
2. **Activation truth** — align KPIs, milestones, and Hem authority (Engine vs Journey vs readiness).
3. **Measurable responsiveness** — child-dashboard script budget, hub load path.
4. **Growth feedback loop** — surveys, admin KPIs, referral v0 (tracking only).
5. **English RC-2** — after RC-1 automated PASS.

---

## 3. Source of truth per domain

| Domain | Canonical in code (main @ 5eb6a0f6) | Normative docs | Conflicts |
|--------|--------------------------------------|----------------|-----------|
| **Product principles** | — | `product-operating-system/00*`, `15` | — |
| **P0 activation (48h)** | `family_activation_state` + `src/lib/activation-p0.js`, `activation-p0-core.js` | `docs/aktivering-exekveringsplan.md`, `docs/tillvaxt-retention-krav.md` | Docs use **June 2024** family counts (189); not refreshed in repo |
| **First Success / Engine** | `src/core-engine/`, `GET /api/family/first-success` (`src/routes/family/first-success.js`) | `docs/FIRST-SUCCESS.md`, `docs/first-success/ENGINE_SPEC.md` | POS PA-01 “one coach” vs **three** Hem surfaces (readiness + engine + journey) |
| **Family Journey** | `src/lib/journey/*`, `family_milestones`, `GET /api/me/journey-context` | `docs/family-journey-implementation-contract.md`, `docs/retention-migration-plan.md` | `docs/family-journey-system-spec.md` claims Fas 2–5 “spec only”; **code + tests** implement Fas 2–5 paths |
| **Retention comms** | `src/lib/journey/communication-gate.js` | `docs/retention-migration-plan.md` (ADR) | Gate **exists**; ADR once said “ska införas” — **resolved in code** |
| **Routing / wizard gate** | `parent.onboarding_completed`, `src/routes/auth/*` redirect | `docs/plattform-webb-ios-android.md` | `onboarding.js` L1123: **must not** use `onboarding_completed` for product logic |
| **Legacy 7-day program** | `parent_activation_program`, `/api/me/activation-program` | `docs/foraldaraktivering-7-dagar-spec.md` | Sunset via flags `activation_program_api_deprecated` (410) — **default OFF** in migration |
| **Hem exceptions** | `GET /api/family/readiness` (`src/routes/family/core.js` ~679+) | `docs/vuxenmeny-v2.md` | Intentional “exception” layer, not journey coach |
| **i18n** | `src/lib/locale.js`, `config/i18n/*`, `family.preferred_locale` | `docs/i18n-english-plan.md`, `docs/release-candidate-en-launch.md` | Plan says “in progress”; RC doc says **program complete** — treat RC + gates as SoT for launch |
| **English child UX** | `features.english_child_experience` + `child_en` pack | `docs/i18n-english-plan.md` §6b | en-GB parent can still get `child_se` without family feature |
| **Payments (native)** | `src/routes/iap.js`, RevenueCat (#836) | `docs/app-store-iap.md` | Stripe removed; web billing UI gated separately |

### 3.1 Who controls “next step” on Hem (actual runtime)

| System | API / module | Active when | Role |
|--------|----------------|-------------|------|
| **Readiness** | `/api/family/readiness` → `home-readiness.js` | Always (parent Hem) | Operational exceptions (PIN, invites, approvals) |
| **Product Engine coach** | `/api/family/first-success` → `engine-coach.js` | `first_success_engine_api` **missing or true**; env `FIRST_SUCCESS_ENGINE_API=false` kills | Policy-based coach `#engineCoachMount` |
| **Journey coach** | `/api/me/journey-context` → `journey-coach.js` | `family_journey_context_api` **and** coach flags ON | Experience registry coach `#journeyCoachMount` |
| **Activation program UI** | `/api/me/activation-program` | Not deprecated + env launch | Legacy banner/Aha; migrating to Journey |

**Client arbitration:** `engine-client.js` logs `engine_authority_conflict` if readiness + engine or duplicate celebrations. `journey-coach.js` hides when `EngineClient.isReadinessBlockingCoach()`. `dashboard-home-hub.js` stacks **both** coach mounts in `#parentHubCoachSlot` (engine then journey).

**Normative POS:** single Journey-fed coach (PA-01). **De facto main:** Engine defaults **ON** without DB row; Journey context API defaults **OFF** on fresh migrate → Engine + readiness often dominate until ops enables Journey wave-1 flags.

---

## 4. Track A — Onboarding, first routine, child login, retention

### 4.1 Code map (activation funnel)

| Step | Server | Client / notes |
|------|--------|----------------|
| Register | `src/routes/auth/register.js` — `onboarding_completed=false`, `loadDefaultContent(locale)`, ~56 activities | `public/login.html`, marketing UTMs |
| Onboarding wizard | `src/routes/onboarding.js`, `public/js/onboarding.js`, `onboarding-starter-plan.js` | ACT-1 flags in `activation-flags.js` |
| `schema_saved` | `recordActivationMilestone` in onboarding; `seed-child-default-schedule.js` | Analytics `starter_plan_saved` |
| Child create | onboarding + `src/routes/children.js` | `child_profile_created` |
| Starter / weekly schedule | onboarding POSTs, `schedules` routes, `seed-child-default-schedule.js` | Template library needs prod harvest locally |
| `onboarding_completed` | `POST /api/onboarding/complete` → `mark-parent-onboarding-complete.js` | Auth redirect only |
| Barnhandoff | onboarding handoff routes, `parent-session-handoff` integration tests | Flags: `activation_child_handoff_v1`, `family_journey_handoff_v2` |
| **Child access (P0)** | **`child_access_completed_at` only via `POST /api/auth/child-login`** (`child-login.js`); deprecated parent endpoint `onboarding.js` L1110–1118 | Analytics `child_access_completed` |
| First completion | `activation-first-completion.js` in daily-log transaction | `first_completion_recorded` |
| First star / parent ack | Journey ingest milestones; `journey-parent-ack.js`, platform-runtime optional | `first_success` = child completion ∧ parent saw |
| Journey milestones | `src/lib/journey/ingest.js`, `db/family-milestones.js` | Gated by `family_journey_ingest_enabled` |
| Nudges / email | `activation-nudge-scheduler.js`, `child-handoff-reminder-scheduler.js`, `activation-program-email-scheduler.js` | All call **Journey Gate** |
| Push | `journey-push-scheduler.js`, `push-reminder-scheduler.js`, activation push schedulers | Dedupe tests in gate |

### 4.2 Verified behaviors / fixes on main

| Item | Evidence |
|------|----------|
| Parent click does **not** set child access | `src/routes/onboarding.js` L1110–1118 (deprecated endpoint) |
| Delsteg expand (child) | #820 merged |
| Child activity order = parent/API | #821–#823 merged; tests `child-daily-log-order*`, `golden-path-fas6-*` |
| Handoff client `sessionRestored` | #806 per `docs/releases/RC1_I18N_RC_BRANCH_STATUS.md` |

### 4.3 Open / unverified product risks

| ID | Issue | Status |
|----|-------|--------|
| A-R1 | RC1 full prod smoke not green | `docs/releases/RC1_I18N_RC_BRANCH_STATUS.md` — BLOCK |
| A-R2 | Account deletion if `pin_notification_log` missing | Open PR #789 |
| A-R3 | Dual/triple coach on Hem | Architectural — `engine-coach.js` + `journey-coach.js` + readiness |
| A-R4 | `docs/aktivering-exekveringsplan.md` KPI baselines stale | Refresh via `scripts/diagnose-churn.js` (prod read-only, human-run) |

### 4.4 Motivated / resolved (do not re-litigate without new data)

| Claim | Verdict |
|-------|---------|
| Onboarding TDZ (`IS_ADD_CHILD`) | Fixed 2026-05-29 per CLAUDE.md |
| `child_access` from parent handoff click | **Intentionally removed** — login-only semantics |
| Journey Gate “not built” | **Built** — `communication-gate.js` + scheduler tests |

---

## 5. Track B — Growth, feedback, attribution

### 5.1 Code map

| Capability | Location |
|------------|----------|
| UTM capture | `public/js/utm-capture.js`, landing routes |
| Meta / marketing | `public/js/meta-app-events.js`, `marketing-events.js`, `docs/meta-app-events.md` |
| Waitlist | `waitlist` table, landing EN routes |
| Referral | `referral_program` flag (default OFF); analytics `referral_*` events in `analytics.js` |
| Surveys / feedback | `src/routes/surveys/`, `src/routes/feedback.js` |
| Support / messages | `src/routes/messages.js`, admin inbox (#838) |
| Activation cohorts | `parent_activation_program`, admin `admin-activation-program.js`, `/api/admin/activation-program/*` |
| Retention dashboards | Admin analytics, `admin-journey-daily-analysis.js`, L1 governance |
| Email templates | `email_templates`, Journey Gate + win-back (`win-back-sender.js`, auto-approve flag) |
| Journey Gate | All legacy schedulers listed in `retention-migration-plan.md` |

### 5.2 Gaps

- Referral **rewards** explicitly deferred until `activation_rate_48h` > 25% (`docs/referral-program.md`).
- GSC / organic KPIs in strategy docs — **not** wired in repo beyond SEO pages and analytics whitelist.

---

## 6. Track C — Stability & verified bugs

### 6.1 Test matrix (automation on main)

| Area | Representative tests |
|------|----------------------|
| Parent/child sessions | `auth-integration.test.js`, `parent-session-handoff*.test.js`, `golden-path-fas6-dual-session*.test.js` |
| Handoff | `onboarding-handoff-resume.test.js`, `onboarding-handoff-p0.test.js`, RC1 handoff unit tests |
| Child login | `validate-child-login.test.js`, `child-login-cross-family.integration.test.js`, `child-access-integration.test.js` |
| Delsteg | `substep-icon-nullable.test.js` + child UI tests |
| Completion | `rewards-integrity.integration.test.js`, `golden-path-fas6-concurrent-completion.integration.test.js` |
| Schedule order | `child-daily-log-order.integration.test.js`, `daily-log-child-order.test.js` |
| Service worker | `route-inventory`, deploy contracts; SW `CACHE_NAME` = `stjarndag-v762` @ analyzed SHA |
| Locale | `i18n-*` gate files, `test:e2e:i18n` |
| Rewards | `rewards-integrity`, `reward-visibility`, barnets-samling regression tests |
| Account deletion | Covered in family account routes — **#789** for missing table edge case |
| Scheduler idempotency | `scheduler-lock.test.js`, `scheduler-registry-contract.test.js` |

**CI gate:** `npm run test:gate` per root `AGENTS.md` / rule 130 (unit + DB suites in `package.json`).

### 6.2 Bug inventory

| Source | Freshness | Action |
|--------|-----------|--------|
| `docs/TEKNISKA-KANDA-BUGGAR.md` | **Stale** (2026-05-29) | Use as history; verify each item before P0 |
| Open PR #825 | 2026-08-02 integrity audit | Triage SSRF/IAP findings before next native release |
| `docs/releases/RC1_*` risk rows R1–R3 | Needs RC smoke on **current** SHA | File small release bugs per template in `release-candidate-en-launch.md` |

---

## 7. Track D — Performance & responsiveness

### 7.1 Static measurements (@ 5eb6a0f6, local `public/` bytes)

| Page | `<script src>` count | Blocking (approx) | Deferred | Local JS+CSS (linked, excl. CDN) |
|------|---------------------|-------------------|----------|----------------------------------|
| `dashboard.html` | 79 | ~78 | 1 | ~881 KB |
| `child-dashboard.html` | 106 | ~106 | 0 | ~1.15 MB |
| `onboarding.html` | 22 | 22 | 0 | ~384 KB |
| `login.html` | 19 | ~18 | 1 | ~321 KB |

**Large modules (reference):** `schedule.js` ~52 KB, `dashboard.js` ~42 KB, `child-dashboard.js` ~31 KB (orchestrator; many splits). **CSS:** `tailwind.build.css` ~68 KB; parent magic CSS ~78 KB on dashboard.

**CDN on child:** SortableJS from jsDelivr (`child-dashboard.html`).

**Service worker:** `CACHE_NAME = stjarndag-v762`; runtime caching pattern (not a simple static `PRECACHE_URLS` array). Bump required on static changes per rule 150.

**Native:** `capacitor.config.ts` — remote WebView (see repo config); no bundled web assets in store builds.

### 7.2 Harnesses & smokes

| Harness | Command / location |
|---------|-------------------|
| CI gate | `npm run test:gate` |
| English E2E | `npm run test:e2e:i18n` |
| RC1 prod smoke | `npm run test:e2e:rc1-prod-smoke` (needs secrets; BLOCK per RC status) |
| RC1 QA fixture | `npm run rc1:qa:prepare` |
| Mobile browser QA | `npm run rc1:mobile-browser-qa` |
| Platform engine perf | `test/platform-engine/performance.test.js` |
| Golden path timing | `golden-path-fas6-baseline-timing.integration.test.js` |

### 7.3 Performance priorities

1. **Child dashboard** — highest script count and bytes; defers nothing; critical path for completion tap.
2. **Parent dashboard** — 79 scripts; magic hub relocates DOM mounts but does not reduce parse cost.
3. **Celebration path** — must stay ≤2s, non-blocking (POS MO-01) — `child-dashboard-celebrations.js` extracted.

---

## 8. Track E — English launch

### 8.1 RC / candidate state

| Item | Value |
|------|--------|
| **Candidate SHA** | `5eb6a0f6` (= `origin/main` at audit) |
| Dedicated RC branch | Not required; RC docs reference **main** + deploy SHA via `/health` `git_sha` |
| i18n program | Declared **complete** through #770 in `docs/release-candidate-en-launch.md` |
| RC-1 automation | **BLOCK** — `docs/releases/RC1_I18N_RC_BRANCH_STATUS.md` (handoff ladder / prod prepare) |
| Open harness PR | #813 (test-only; stabilizes smoke) |

### 8.2 i18n gates (must stay green)

| Gate | Command |
|------|---------|
| test:gate | `npm run test:gate` |
| STRICT audit | `npm run audit:i18n:strict` |
| BASELINE audit | `npm run audit:i18n:baseline` |
| E2E English journey | `npm run test:e2e:i18n` |
| Workflows | `.github/workflows/ci.yml`, `e2e-i18n.yml`, `rc1-web-release-gate.yml`, `rc1-prod-smoke.yml` |

### 8.3 Rollout flags (DB seeds — not prod-verified)

| Flag / feature | Migration default | Notes |
|----------------|-------------------|-------|
| `english_language_offer` | ON | Existing-family offer (`1810000000006`) |
| `features.english_app` | dev, OFF | Per-family via `family_features` |
| `features.english_child_experience` | dev, OFF | Required for `child_en` |
| `market_uk_open` / `market_us_open` | See `1810000000007`, `1810000000008` | Registration gates |

### 8.4 Known RC risk areas (verify on en-GB family)

From `docs/release-candidate-en-launch.md`: day-off modal (R1), library upload copy (R2), daily log nav (R3) — treat as **checklist**, not closed until smoke on current SHA.

### 8.5 Device / store

- Physical matrix: **incomplete** per `docs/i18n-english-plan.md` and RC status.
- Store metadata / legal EN: RC-2 scope in `release-candidate-en-launch.md`.
- Native binaries: Capacitor remote WebView — store release still needs Xcode/Play pipelines outside this repo audit.

---

## 9. Feature-flag matrix (migration defaults + kill switches)

Prod `enabled` may differ if ops toggled admin flags. **Rollback:** set `enabled=false` in `feature_flag` or use env overrides where documented.

### 9.1 Activation (ACT-1)

| Key | Default @ migrate | Owner module | Dependencies | Rollback |
|-----|-------------------|--------------|--------------|----------|
| `activation_onboarding_v1` | ON (`180922`) | `activation-flags.js` | `ACTIVATION_ONBOARDING_LAUNCH_AT` cohort | Disable flag |
| `activation_child_handoff_v1` | ON | same | Handoff UI | Disable flag |
| `activation_first_star_guide_v1` | ON | same | First-star UX | Disable flag |
| `activation_ai_starter_plan` | ON (`180934`) | same | AI starter plan | Disable flag |
| `activation_onboarding_handoff_film_v1` | ON (`180937`) | same | Film step | Disable flag |
| `activation_nudge_v1` | ON (`180932`) | `activation-nudge-scheduler.js` | Journey Gate | Disable flag |
| `activation_first_star_mode_v1` | OFF (seed) | first-star tests | Mode-specific UI | Keep OFF |
| `activation_signup_slim_v1` | ON (`180924`) | signup-slim-journey tests | Journey evaluator for coach | Disable flag |
| `referral_program` | OFF | referral analytics | — | Keep OFF |

### 9.2 Family Journey

| Key | Default @ migrate | Notes |
|-----|-------------------|-------|
| `family_journey_context_api` | **OFF** (`180892`) | Master API — **must ON for journey coach** |
| `family_journey_ingest_enabled` | OFF | Milestone ingest |
| `family_journey_evaluator_enabled` | OFF | Context evaluator |
| `family_journey_registry_v2` | ON (`180931`) | DB registry |
| `family_journey_handoff_v2` | ON (`180931`) | Context handoff banner |
| `family_journey_parent_ack_v1` | ON (`180931`) | Parent ack modal |
| `family_journey_onboarding_v1` | ON (`180931`) | Onboarding experiences |
| `family_journey_coach_v1` | OFF (`180893` DO NOTHING) | Hem coach |
| `family_journey_push_v1` | OFF | Journey push scheduler |
| `family_journey_first_week_v1` | OFF (seed in `180900`) | First-week experiences |
| `activation_program_new_enrollments` | ON (`180893`) | Only program enrollments |
| `activation_program_api_deprecated` | OFF | 410 when ON |
| `activation_program_ui_removed` | OFF | UI removal |

### 9.3 First Success Engine & platform

| Key / env | Default | Rollback |
|-----------|---------|----------|
| `first_success_engine_api` | **No migration** — treated ON if row missing (`first-success-engine-flag.js`) | `FIRST_SUCCESS_ENGINE_API=false` or insert flag OFF |
| `platform_runtime_enabled` | OFF (`180895`) | `PLATFORM_RUNTIME_ENABLED=false` overrides DB (`FIRST-LIVE-ENABLE-CHECKLIST.md`) |

### 9.4 Retention / ops / i18n / IAP

| Key | Default | Notes |
|-----|---------|-------|
| `retention_reengagement_v1` | See `180870` migration | Uses Journey Gate |
| `win_back_auto_approve` | ON (`180850`) | Win-back sender |
| `english_language_offer` | ON | Existing families offer |
| `custody_schedule_beta` | ON (`180872`) | FEAT-1 |
| `maintenance_mode` | OFF | App 503 except IAP webhooks |
| RevenueCat | env keys | #836 sandbox gate in code |

---

## 10. KPI matrix

| KPI | Definition in code / analytics | Admin / script | Notes |
|-----|-------------------------------|----------------|-------|
| signup | `signup_completed` | Analytics, registration | |
| child created | `child_created` milestone / activation state | Funnel admin | |
| routine ready | `routine_ready` / `schema_saved_at` | Activation state | |
| child access | `child_access_completed_at`, event `child_access_completed` | **Verified PIN login only** | |
| first completion | `first_completion_at`, `first_completion_recorded` | P0 reconciliation | |
| first star | Daily log stars + journey milestones | | |
| parent saw completion | `parent_saw_completion` milestone | `journey-parent-ack.js` | |
| First Success | `first_success` milestone (= completion ∧ parent saw) | Journey + Engine policy | |
| P0 activated 48h | `p0_activated_at` in `family_activation_state` | `activation-p0-core.js` | Primary ACT KPI |
| Day 7 / Day 14 | Journey first week + activation program retention API | `GET /api/admin/activation-program/retention` | North Star in strategy docs |

---

## 11. Recommended PR order (next implementation branches)

| Order | Branch theme | Depends on | Overlaps |
|-------|--------------|------------|----------|
| 1 | Merge **#789** account deletion P0 | — | `src/routes/family/account.js`, migrations |
| 2 | Merge **#813** RC1 smoke harness | — | `test/e2e/*`, no product |
| 3 | **#825** integrity — triage P0 only | — | `iap`, `safe-url-fetch`, admin |
| 4 | RC1 prod smoke green | #813 + secrets | `scripts/run-e2e-rc1-prod-smoke.js` |
| 5 | Journey wave-1 enablement **policy** (ops + doc) | Human decision | `feature_flag`, no code or admin-only |
| 6 | Coach authority consolidation | 5 | `engine-coach.js`, `journey-coach.js`, `dashboard-home-hub.js`, POS PA-01 |
| 7 | Child dashboard perf (script budget) | — | `child-dashboard.html`, SW |
| 8 | RC release bugs R1–R3 | 4 | i18n locale files, targeted JS |
| 9 | Referral v0 tracking hardening | activation stable | analytics, landing |
| 10 | English RC-2 store + legal | 4–8 | docs, store metadata, flags |

**File overlap hotspots:** `public/dashboard.html` + `dashboard-home-hub.js` + coach modules; `public/child-dashboard.html` + order/delsteg JS; `src/routes/onboarding.js` + `activation-flags.js`; `config/i18n/*` for any copy fix.

---

## 12. Risks & human decisions

| Decision | Options | Recommendation |
|----------|---------|----------------|
| Canonical Hem coach | Engine vs Journey vs merge | **Decide explicitly** — POS says Journey; Engine is default ON today |
| Enable `family_journey_context_api` globally | ON vs staged | Staged with admin metrics; requires ingest + evaluator ON |
| RC1 prod smoke | Run with QA fixture vs founder account | **Fixture only** per `rc1-qa-fixture.md` |
| English child pack | Require `english_child_experience` for store EN | **Yes** for child-facing store claims |
| IAP sandbox vs prod keys | RevenueCat | Follow #836 ops checklist |
| Refresh activation baselines | `diagnose-churn.js` on prod | Founder-run read-only; update strategy docs |

---

## 13. Release & rollback strategy

| Layer | Roll forward | Rollback |
|-------|--------------|----------|
| Web deploy | Merge `main` → GitHub Actions → VPS | Revert commit; `git revert` + deploy |
| DB migrations | Idempotent forward-only | REL-02 one-release compatibility; use down migrations only in dev |
| Feature flags | Admin system flags API | Flip `feature_flag.enabled` |
| Engine | `FIRST_SUCCESS_ENGINE_API=false` | Instant 503 → readiness fallback |
| Platform runtime | SQL OFF + env | `FIRST-LIVE-ENABLE-CHECKLIST.md` |
| IAP | RevenueCat dashboard + app keys | Disable webhook processing via env |
| English | `english_app` family feature | Per-family OFF |
| SW cache | Bump `CACHE_NAME` | Users get new SW on next visit |

**Pre-deploy:** ops backup gate (#827+) on VPS workflows — not exercised in this audit.

---

## 14. Stale or contradictory documentation

| Document | Issue |
|----------|-------|
| `docs/aktivering-exekveringsplan.md` / `tillvaxt-retention-krav.md` | Family counts and dates **2026-06-24** |
| `docs/family-journey-system-spec.md` | “Fas 2 spec only” vs implemented journey fas2–5 tests |
| `docs/family-journey-implementation-contract.md` | Status “väntar workshop” vs code shipped |
| `docs/TEKNISKA-KANDA-BUGGAR.md` | Last updated **2026-05-29** |
| `docs/i18n-english-plan.md` | “In progress” vs `release-candidate-en-launch.md` “complete” |
| `docs/releases/RC1_I18N_RC_BRANCH_STATUS.md` | Dated **2026-08-01** — re-verify #806/#838 on **5eb6a0f6** |
| `docs/first-success/DECISION-BOUNDARIES.md` | Open questions on `onboarding_completed` vs Engine — partially answered in `onboarding.js` L1123 |
| `retention-migration-plan.md` | Gate “ska införas” — **implemented** |

---

## 15. GO / NO-GO — start delivery tracks

| Track | GO? | Condition |
|-------|-----|-----------|
| **A Activation & retention** | **CONDITIONAL GO** | Fix coach authority decision + keep gate green; optional Journey wave-1 enable |
| **B Growth & feedback** | **GO** (low scope) | Tracking, surveys, admin KPIs — no referral rewards |
| **C Stability** | **GO** | #789 + #825 P0 triage before feature work |
| **D Performance** | **CONDITIONAL GO** | After P0; child-dashboard script diet |
| **E English launch** | **NO-GO** until RC-1 automated PASS | Harness + device matrix + R1–R3 smoke on current SHA |

---

## 16. Next-agent execution order (copy-paste)

1. Confirm `git rev-parse origin/main` still matches §1 or re-run this audit’s preflight.
2. Run `npm run test:gate` and `npm run test:e2e:i18n` (env per `AGENTS.md`) — stop if red.
3. Review open PRs **#789**, **#813**, **#825** — merge or split P0 fixes first.
4. Execute RC1: `npm run rc1:qa:prepare` (dry-run then real) with secrets; `npm run test:e2e:rc1-prod-smoke` — target green handoff ladder.
5. Human: decide **Engine vs Journey** coach ownership; document ADR if Engine retired from Hem.
6. If Journey chosen: enable in order `family_journey_ingest_enabled` → `evaluator` → `context_api` → `coach_v1` with admin monitoring (no merge to main without rollback SQL).
7. File small PRs for RC items R1–R3 only after reproduced on `5eb6a0f6` or newer.
8. Child perf: measure completion tap path on mid-range Android; reduce `child-dashboard.html` scripts in dedicated PR.
9. Refresh activation baselines (`diagnose-churn.js`) and update strategy docs in a **docs-only** PR.
10. RC-2 store/legal only after §15 Track E flips to GO.

---

## 17. Self-review (planning artifact)

```
Self-review: PE ✓ Mobile ✓ CPO ✓ UX ✓ Game N/A QA ✓ Security ✓ AISA ✓
Issues found and fixed: none (documentation only)
POS governed by: 00, 05 (PA-01), 10 (Journey authority), 15 (quality gates)
```

---

*End of execution plan. No product code, merge, deploy, or live-environment mutation in this branch.*
