# Skolstart 2026 — Product Experience Gate <!-- pragma: allowlist secret -->

**Date:** 2026-08-17 (updated after Family Device global rollout)  
**Main SHA:** `7fc83f4077ef5bd4aabfdcc0addbf999f5616c84`  
**Prod SHA:** `8a2771694a4078e755f3cf733066cf2e5df743cb`  
**Method:** Code + integration tests + prod audit + automated prod pilot + founder physical smoke (2026-08-17)

---

## Executive summary

| Priority | Gate | Status |
|----------|------|--------|
| 1 | Onboarding | **YELLOW** → **GREEN** after this PR (NU/NÄSTA default fix) |
| 2 | Ready-made routines | **GREEN** |
| 3 | Family Device | **GREEN** (global rollout 2026-08-17; physical smoke PASS) |
| 4 | Visual timer | **YELLOW** (opt-in; discoverability PR #1018 pending) |
| 5 | Ease of use | **GREEN** |

**Marketing:** GO for routines, NU/NÄSTA, stars, shared-phone (qualified copy). Timer remains QUALIFIED until discoverability PR merges.

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

### FAMILY DEVICE — GREEN (global rollout complete)

| Gate item | Status |
|-----------|--------|
| A. Source tests green | **PASS** — 40+ integration/contract tests in `test:gate` |
| B. Auth/adult privilege tests | **PASS** |
| C. Child/adult boundary | **PASS** — prod pilot + founder physical smoke |
| D. One-child family | **PASS** — `SHARED_ONE_CHILD_SERVER` prod pilot |
| E. Multi-child family | **PASS** — `SHARED_MULTI_CHILD_SERVER` prod pilot + founder 2-child smoke |
| F. Force-close/reopen | **PASS** — founder physical smoke 2026-08-17 |
| G. Parent return | **PASS** — `ADULT_PRIVILEGE_SERVER` + founder physical smoke |
| H. Native | **PASS** — founder phone (Capacitor WebView) |
| I. Web/PWA | **PASS** — prod pilot |
| J. P0/P1 open defects | None |
| K. Existing users safe | Legacy `/child-login` + PIN unchanged on non-trusted devices |
| L. Rollback documented | See rollout record below |

**Prod global flags (2026-08-17, all `true`):** `trusted_device_v1`, `family_device_entry_v1`, `family_device_daily_ux_v1`, `adult_privilege_v1`

**Widget flags unchanged:** `native_widget_enabled`, `widget_completion_enabled` remain `false`.

**Physical evidence:** Founder family phone smoke PASS (enrollment, force-close/reopen, child flow, adult return, multi-child switch).

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
| Family Device | **PASS** | **PASS** | **PASS** |
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
| Family Device benefit | **LIVE** — trusted shared phone → child day or profile picker; adult area PIN/biometric protected |

---

## Family Device global rollout

### Decision

**FAMILY_DEVICE_GLOBAL_ROLLOUT = PASS** (2026-08-17)

**Evidence:** Pontus physical smoke PASS on founder phone; automated prod pilot PASS on deployed SHA `8a277169`; health remained healthy after staged flag enable.

### Rollout record (2026-08-17)

**Pre-rollout state:** All four flags `false` globally.

**Enabled in order (verified after each step):**

1. `trusted_device_v1` = true  
2. `family_device_entry_v1` = true  
3. `family_device_daily_ux_v1` = true (requires entry)  
4. `adult_privilege_v1` = true  

**Widgets not enabled:** `native_widget_enabled`, `widget_completion_enabled` remain `false`.

**Post-rollout verification:**

```bash
FAMILY_DEVICE_PILOT_CONFIRM=1 FAMILY_DEVICE_PILOT_ALLOWED_BASES=<prod-origin> npm run family-device:prod-pilot
# Result: FAMILY_DEVICE_AUTOMATED_PROD_PILOT=PASS (all scenarios, CROSS_FAMILY_ACCESS=0)
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
| 4 | På familjens egen mobil slipper ni onödiga inloggningar | **QUALIFIED** | Global FD ON; use: *"På familjens egen mobil kan barnet komma tillbaka till sin dag utan att logga in på nytt varje gång."* Adult area remains PIN/biometric protected; unknown devices unchanged |
| 5 | Barnet kan följa sin dag och samla stjärnor själv | **GO** | Core child path; PIN login today |

---

## Changes in this round

- `src/routes/onboarding.js` — default `one_at_a_time` child UX after schedule save  
- `config/i18n/onboarding-*.json` — preview fallback copy aligned with manifest  
- `test/onboarding-schedule-default-ux.integration.test.js` — regression  
- This document

---

## Pontus involvement

Family Device global rollout complete. Remaining approvals:

1. **Marketing launch** (newsletter/Meta) — copy in `docs/marketing/SKOLSTART_2026_LAUNCH.md` (do not send until explicit go)
2. **Timer discoverability PR #1018** — optional merge when ready
