# Skolstart 2026 — Product Experience Gate <!-- pragma: allowlist secret -->

**Date:** 2026-08-17  
**Branch:** `cursor/skolstart-2026-launch-readiness-d1e5`  
**Prod SHA (audited):** `663e25d2c1ba9ceef216d0af14289068f8c96563`  
**Method:** Code + integration tests + prod read-only audit (2026-08-17) + physical QA records in repo

---

## Executive summary

| Priority | Gate | Status |
|----------|------|--------|
| 1 | Onboarding | **YELLOW** → **GREEN** after this PR (NU/NÄSTA default fix) |
| 2 | Ready-made routines | **GREEN** |
| 3 | Family Device | **RED** (flags OFF; code ready) |
| 4 | Visual timer | **YELLOW** (opt-in, discoverable in settings) |
| 5 | Ease of use | **YELLOW** (Family Device blocker for shared-phone promise) |

**Marketing without Family Device rollout:** GO for routines, NU/NÄSTA, stars. **NO_GO** for “slip onödiga inloggningar på familjens mobil” until flags ON.

---

## School-start product gate

### ONBOARDING — GREEN (with this PR)

| Check | Result |
|-------|--------|
| Slim signup live (`activation_signup_slim_v1` ON prod) | 3 questions → auto child + schedule → home |
| Ready-made schedule default | Age-scored starter plan + canonical copy |
| Unnecessary config before value | Slim skips legacy 6-step wizard |
| NU/NÄSTA for new child | **Fixed:** `POST /api/onboarding/schedule` now applies `one_at_a_time` preset when child UX still factory-off |
| Weekend modal (school templates) | P2 — one extra tap for Mon–Fri templates |

**Friction fixed this round:** ACT-1 slim/starter paths skipped activity-guide screen → new children had `show_now_next=false` despite marketing “nu och härnäst”. Server now enables NU/NÄSTA silently (timer still opt-in).

### READY-MADE ROUTINES — GREEN

| Asset | Prod / manifest |
|-------|-----------------|
| Canonical activities | **31** (`v1.1.json`) |
| Canonical schedules | **8** (Förskola vardag, Skola vardag, Morgonrutin, Kvällsrutin, Helg, Lov, Sommarlov, Jullov) |
| Schedule items | **98** |
| Onboarding picker | 6 groups → 5 distinct schedules (`dag` duplicates förskola — P2 confusion) |

**Age bands (source review):**

| Band | Best fit | Gap |
|------|----------|-----|
| 5–7 | Förskola vardag or Skola vardag (boundary ~6) | Skola sleep 20:30 late for young; no förskoleklass-specific schedule |
| 8–10 | Skola vardag | Homework optional (reasonable); after_school defaults to hem silently |
| 11–13 | Skola vardag | Primary-school copy (“Sagostund”, “Pyjamas”); no teen schedule |

**Quality:** Frozen contract tests (`standard-library-v11-content.test.js`). Parent can recognize morning/school/evening — not “configure another system.”

### FAMILY DEVICE — RED (code GREEN, prod OFF)

| Gate item | Status |
|-----------|--------|
| A. Source tests green | **PASS** — 40+ integration/contract tests in `test:gate` |
| B. Auth/adult privilege tests | **PASS** |
| C. Child/adult boundary | **CODE TESTED** |
| D. One-child family | **CODE + API pilot harness** |
| E. Multi-child family | **CODE + API pilot harness** |
| F. Force-close/reopen | **CODE TESTED**; general native session **PHYSICALLY TESTED** (Aug 2026) — not FD flags ON |
| G. Parent return | **CODE TESTED** (`profile-switch-parent-return`) |
| H. Native | **CODE TESTED**; **no FD-specific physical sign-off** |
| I. Web/PWA | **CODE TESTED** |
| J. P0/P1 open defects | None in code review |
| K. Existing users safe | Flags OFF → legacy child-login path unchanged |
| L. Rollback documented | See rollout plan below |

**Prod flags (all `false`):** `trusted_device_v1`, `family_device_entry_v1`, `family_device_daily_ux_v1`, `adult_privilege_v1`

**Physical evidence gap:** `docs/ACTIVATION-FIRST-SUCCESS-PHYSICAL-QA-RESULT.md` (force-close, child session) does **not** cover trusted-device cold start with flags ON. `native-app-test-checklist.md` §12 (shared device) unchecked.

### VISUAL TIMER — YELLOW

| Check | Result |
|-------|--------|
| Code live | `activityTimerV2Available: true`, kill switch off |
| Default for new child | **OFF** (`activity_timers_enabled=false`) |
| Enable path | Child settings → “Aktivitetstimer” toggle; onboarding preset `time_and_order` if parent uses legacy activity guide |
| Child UX | Hourglass metaphor in `child-dashboard-activity-timer.js`; reduced-motion honored |
| Discoverability | **P1** — parent must find child settings; not surfaced in slim onboarding success screen |

**Qualified marketing:** “Visuellt timglas” only with “kan aktiveras per barn” qualifier.

### CHILD EXPERIENCE — GREEN

| Check | Result |
|-------|--------|
| NOW/NEXT/LATER zones | When `show_now_next=true` (now default after schedule save) |
| Touch targets | 44pt+ on primary actions; card size setting available |
| Pictograms | `image_url` > `icon_key` > emoji |
| First-star focus mode | Reduces chrome for first completion |
| A11y | Star count in header uses text + emoji; large card mode via `data-activity-card-size` |

**Historical VI concern (small coloured numbers):** Large card mode + star as emoji suffix mitigates; no open P0.

### PARENT EXPERIENCE — GREEN

| Task | Path |
|------|------|
| Edit today | Dashboard / schedule |
| Copy ready-made routine | Library + onboarding templates |
| Enter child mode | Child login or (future FD) trusted device |
| Enable timer | Child profile settings |
| See progress | Dashboard + reports |

**P2:** Duplicate `dag`/`forskola` template in onboarding picker.

### ACCESSIBILITY — GREEN

Contract tests + large card mode + reduced-motion on celebrations/timer. No colour-only critical paths on NU/NÄSTA labels (text + icons).

### PLATFORM PARITY

| Capability | Web/PWA | iOS | Android |
|------------|---------|-----|---------|
| Onboarding slim | **PASS** | **PASS** (same WebView) | **PASS** |
| Standard library | **PASS** | **PASS** | **PASS** |
| Family Device | **FAIL** (flags OFF) | **FAIL** | **FAIL** |
| Timer | **QUALIFIED** | **QUALIFIED** | **QUALIFIED** |
| Child view | **PASS** | **PASS** | **QUALIFIED** (child-first cold launch fixed v770) |
| Adult return | **PASS** (PIN) | **PASS** (PIN + biometric native) | **PASS** |

---

## First 10 minutes acceptance (slim signup, tired parent)

**Scenario:** New account → slim onboarding → hand phone to child → first star.

| Metric | Estimate (slim path, prod flags) |
|--------|----------------------------------|
| **Major taps (parent)** | ~12–15 (register fields, 3 slim answers, success → home, open child login or handoff) |
| **Text inputs** | 4–6 (name, email, password, child name, birthday, routine type) |
| **PIN/login challenges (child)** | 1 child PIN entry (unless parent uses handoff film) |
| **Configuration decisions** | 1 (routine type); template auto-selected |
| **Dead-ends** | 0 on happy path (resume paths for `child_without_schema`) |
| **Unclear screens** | 0 P0; weekend modal P2 for school templates |

**API golden path (integration):** register → login → child → schedule → child-login → daily-log → complete ≈ 7 API calls, &lt;3s local.

---

## Returning family acceptance

| Check | Result |
|-------|--------|
| Reopen app | Parent session refresh; child session via cookies |
| Schedules preserved | Yes |
| Onboarding not repeated | `onboarding_completed=true` |
| Timer settings retained | Per-child column |
| Family Device benefit | **Only after rollout** — today same as legacy PIN |

---

## Family Device global rollout

### Decision

**FAMILY_DEVICE_GLOBAL_ROLLOUT = NO_GO** until Pontus approves global flag enable + short physical smoke (3 actions below).

**Rationale:** Code and automated gates are ready; prod flags OFF; no physical sign-off with all four flags ON on shared family phone.

### Rollout plan (after approval)

**Current state:** All four flags `false` globally, no family overrides in prod audit.

**Target state (global ON, in order):**

1. `trusted_device_v1` = true  
2. `family_device_entry_v1` = true  
3. `family_device_daily_ux_v1` = true (requires entry)  
4. `adult_privilege_v1` = true  

**Do NOT enable:** `native_widget_enabled`, `widget_completion_enabled` (pre-public gate).

**SQL (run on prod after backup):**

```sql
UPDATE feature_flag SET enabled = true WHERE key IN (
  'trusted_device_v1',
  'family_device_entry_v1',
  'family_device_daily_ux_v1',
  'adult_privilege_v1'
);
```

**Staged alternative (safer):** Per-family override via admin for 5–10 internal/pilot families first (`family_feature_override`), then global SQL above.

**Verification after enable:**

```bash
# Disposable prod pilot (API) — set SMOKE_BASE_URL to approved prod origin
FAMILY_DEVICE_PILOT_CONFIRM=1 npm run family-device:prod-pilot
```

**Rollback:**

```sql
UPDATE feature_flag SET enabled = false WHERE key IN (
  'trusted_device_v1',
  'family_device_entry_v1',
  'family_device_daily_ux_v1',
  'adult_privilege_v1'
);
```

Revoked trusted devices remain revoked; families fall back to legacy `/child-login` + PIN.

**Expected UX after rollout:** Shared phone + one child → child Idag without PIN; multi-child → profile picker; adult return → PIN/biometric; no daily parent login on trusted device.

### Pontus physical smoke (max 5 actions, only if approving rollout)

1. Enroll shared family phone (Settings → Den här enheten → Delad).  
2. Force-close app → reopen → lands on child Idag (one-child) or picker (multi).  
3. Child completes one activity.  
4. Tap Vuxen → enter parent PIN → parent home.  
5. Byt barn (if 2+ children) → other child’s schedule.

---

## School-start marketing promises

| # | Promise | Status | Evidence |
|---|---------|--------|----------|
| 1 | Kom igång snabbt med färdiga rutiner | **GO** | Slim 3-step + canonical 8 schedules; auto-seed by age |
| 2 | Barnet ser vad som händer nu och härnäst | **GO** (post-fix) | `show_now_next=true` after schedule save; NU/NÄSTA zones |
| 3 | Visuellt timglas hjälper barnet se tid kvar | **QUALIFIED** | Opt-in per child; not default |
| 4 | På familjens egen mobil slipper ni onödiga inloggningar | **NO_GO** | All FD flags OFF in prod |
| 5 | Barnet kan följa sin dag och samla stjärnor själv | **GO** | Core child path; PIN login today |

---

## Changes in this round

- `src/routes/onboarding.js` — default `one_at_a_time` child UX after schedule save  
- `config/i18n/onboarding-*.json` — preview fallback copy aligned with manifest  
- `test/onboarding-schedule-default-ux.integration.test.js` — regression  
- This document

---

## Pontus involvement

Repository-side work is complete pending merge.

**Pontus only needs to approve:**

1. **Family Device global rollout** (or staged pilot) — single approval  
2. **Merge + deploy** this PR  
3. **Marketing launch** (newsletter/Meta) — copy in `docs/marketing/SKOLSTART_2026_LAUNCH.md`

**Optional 5-minute physical smoke** only if enabling Family Device flags.
