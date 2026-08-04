# Activation First Success — Physical QA Gate

**Prompt:** 1G (responsive) + **1H** (physical iPhone final) + **1I** (current prod iPhone regression) + **1J** (Android Activation completion gate)  
**Date:** 2026-08-04  
**Prod URL:** `https://mystarday.se` <!-- pragma: allowlist secret -->

## Status

| Platform | Status |
|----------|--------|
| **Physical iPhone** (Activation baseline v768) | **PASS** |
| **Physical iPhone on current prod v769** (Prompt 1I) | **PASS** |
| **Physical Android core flow** (founder `.env`, SM-G991B, v769) | **PASS** — parent API, picker child, completion, `adb` launch |
| **Physical Android Activation** (QA family override, First Success coach on device) | **NOT RUN** — QA credentials file unavailable locally |
| **Child-first entry** (cold launch, existing child session) | **FAIL** — flicker / redirect loop (see §1J) |
| **Responsive iPhone** (390×844) | **PASS** (sv-SE + en-GB QA families) |
| **Responsive Android** (412×915) | **PASS** (sv-SE + en-GB QA families) |

**Slutstatus:** `CURRENT PROD ANDROID CORE FLOW PASS — ACTIVATION FIRST SUCCESS ANDROID TARGETED GATE NOT YET RUN`

**Prompt 1J gate outcome:** `PHYSICAL ANDROID ACTIVATION BLOCKED — QA CREDENTIALS UNAVAILABLE`

## iPhone device and app version

| Field | Value |
|--------|--------|
| Device | iPhone 15 Pro (`iPhone16,1`) |
| iOS | 26.5.2 |
| UDID | `00008130-000E211A28C1401C` |
| Bundle ID | `se.mystarday.app` |
| App version (native shell) | 1.3 (build 29) |
| Capacitor server | `https://mystarday.se` |
| Xcode workspace / scheme | `ios/App/App.xcworkspace` / `App` |
| On-device UI automation | None (XCUITest / Maestro / Appium not configured) |

## Prod SHA / cache (Activation release identity)

Physical First Success validation was executed against the **dark-launch release identity**:

| Signal | Value |
|--------|--------|
| `git_sha` (Activation baseline) | `5048d9e902266f758f59030e050fa48b46f1f3f4` |
| `cache_version` / SW `CACHE_NAME` | `stjarndag-v768` |

**Current production (Prompt 1I):**

| Signal | Value |
|--------|--------|
| `git_sha` | `8fea1f5543664ce75db8e8e23c014aea70bd97fd` |
| `cache_version` / SW `CACHE_NAME` | `stjarndag-v769` |

Child-login PIN contrast (#852–#855) ships in this line; global `activation_first_success_v1` remains **OFF**.

## Prompt 1I — Current production iPhone regression (v769)

**Device:** Pontus iPhone XV · iPhone 15 Pro · iOS 26.5.2 · `se.mystarday.app` 1.3 (29)

### Prod verification (automated)

| Check | Result |
|--------|--------|
| `GET /health` → `healthy` | **PASS** |
| `git_sha` = `8fea1f5543664ce75db8e8e23c014aea70bd97fd` | **PASS** |
| `cache_version` = `stjarndag-v769` | **PASS** |
| `GET /sw.js` → `CACHE_NAME` = `stjarndag-v769` | **PASS** |
| VPS release identity (worktree on host) | **Not SSH-verified** (operator shell); public `/health` SHA/cache match expected deploy |
| Global `activation_first_success_v1` | **OFF** (non-override family via `/api/family/activation-config`) |
| QA family overrides | **ON** until documented expiry (see Flagstatus); prod DB `--verify` not re-run in 1I automation |
| Prod child-login PIN CSS contract (#852–#855) | **PASS** (served assets: high-contrast keys, `font-weight: 800`, column digit colors, `:focus-visible`) |

### Physical regression (device)

Native app launched on hardware (`devicectl`); manual checklist on **live v769** web assets in Capacitor WebView.

| Step | Result |
|------|--------|
| App start | **PASS** |
| Parent login | **PASS** |
| Hem — exactly one First Success coach | **PASS** |
| Child login entry | **PASS** |
| PIN keypad (#852–#855): contrast, legibility, focus, not color-only, layout, keyboard | **PASS** |
| QA child login | **PASS** |
| Child Today + schedule order | **PASS** |
| Substep expand | **PASS** |
| Real activity completion | **PASS** |
| Single completion / single star | **PASS** |
| Return to parent | **PASS** |
| Parent session restore | **PASS** |
| Coach hides or advances | **PASS** |
| Background / foreground | **PASS** |
| Force close / reopen + session resume | **PASS** |
| Native crash / critical WebView errors | **None observed** |

**Physical iPhone on current prod v769:** **PASS**

## Genomförd fysisk resa (iPhone 15 Pro) — Activation baseline (1H)

All steps below **PASS** on physical device (manual), unless noted.

| Step | Method | Result |
|------|--------|--------|
| Parent login | Manual (native WebView) | **PASS** |
| Hem — exactly one First Success primary coach | Manual | **PASS** |
| No parallel Journey / Engine primary coaches | Manual | **PASS** |
| Layout / safe area | Manual | **PASS** |
| Child login (picker + PIN keypad) | Manual | **PASS** |
| PIN digit readability | Manual | **PASS** (after v769 contrast deploy) |
| Child Today | Manual | **PASS** |
| Activity order | Manual | **PASS** |
| Substep expand | Manual | **PASS** |
| Real activity completion | Manual | **PASS** |
| Single completion (no double star) | Manual | **PASS** |
| First star / celebration | Manual | **PASS** |
| Return to parent mode | Manual | **PASS** |
| Parent session restore | Manual | **PASS** |
| Background → foreground | Manual | **PASS** |
| Force close → reopen | Manual | **PASS** |
| Session resume | Manual | **PASS** |
| Native crash | Manual observation | **None** |

### Automated (supporting, not a substitute for device)

| Step | Method | Result |
|------|--------|--------|
| Device attach / `devicectl` launch | Automated (Mac) | **PASS** |
| `/health` SHA + cache (baseline) | Automated | **PASS** |
| Responsive prod harness (390×844, 412×915) | Automated (Puppeteer) | **PASS** |
| Founder parent prod API smoke (partial) | Automated | **PASS** (parent); child API hit rate limit during automation only |

## Native / WebView-resultat

- Native shell unchanged (1.3 / 29); remote WebView loads prod web assets.
- No native crashes observed during physical session.
- No critical WebView errors reported during manual pass.

## Responsive QA

Documented in [`ACTIVATION-FIRST-SUCCESS-FOUNDER-DARK-LAUNCH-RESULT.md`](ACTIVATION-FIRST-SUCCESS-FOUNDER-DARK-LAUNCH-RESULT.md): sv-SE and en-GB founder activation QA families, iPhone + Android viewports, single coach, completion, parent restore.

## Android-status

**Physical device connected:** Samsung **SM-G991B**, **Android 15**, `se.mystarday.app` **1.3.0**, prod **v769** / `8fea1f55…`.

### Prompt — founder physical smoke (minimal automation)

No aggressive WebView navigation (prior CDP `child-login` loops caused session flicker — **do not repeat**). Automation limited to **`adb` app launch** and **read-only** DevTools URL path snapshot.

| Check | Result |
|--------|--------|
| Device attach (`adb`) | **PASS** |
| Prod parent API login (founder QA, operator `.env`) | **PASS** |
| Prod child API (picker username + PIN from `.env`) | **PASS** |
| Prod activity completion (single item) | **PASS** |
| Parent session after child completion | **PASS** |
| Global `activation_first_success_v1` | **OFF** |
| Founder family override | **OFF** (expected) |
| First Success coach on founder Hem | **Not shown** (expected — override only on QA families) |
| **Activation coach (exactly one)** | **Not verified on Android device** — requires Prompt 1J QA-family run (blocked: no `~/.config/mystarday/founder-activation-qa.env`) |
| Physical protocol | **Parent login → then child** (mandatory on Android) |
| Manual on device: stable session, PIN (#852–#855), Today, background | **PASS** (founder, parent→child path only) |
| `adb` app launch only (no CDP navigation) | **PASS** |

**Physical Android core flow (founder):** **PASS** — not a substitute for **Activation targeted gate** on QA override family.

Automation: `scripts/ops/founder-android-prod-smoke.mjs` (API + `adb` launch). Artifact: `artifacts/founder-android-prod-smoke.json` (local, no secrets).

### Manual repro — session flicker (Capacitor Android WebView, prod v769)

**Observed on SM-G991B with no Mac automation running:**

| Flow | Result |
|------|--------|
| **Child login first** (cold / barnväljare before parent) | **FAIL** — immediate flicker in/out (logged-in vs logged-out) |
| Force stop → **parent login, then child** | **PASS** — stable session |

**Likely mechanism (code review, not fixed this session):**

1. **`child-login.js`** after PIN success verifies `/api/auth/me` because a **parent `access_token` cookie can shadow** the new child cookie (comment at child-login success path). If the server still sees `type: parent`, login aborts — but timing/WebView cookie commits on Android can race.
2. **`child-dashboard.js` init** loads `Auth.getUser()` from **localStorage** and checks `document.cookie` for `access_token`. After child login it calls `/api/auth/me`; if `me.type !== 'child'` it **`Auth.clearAuth()`** and redirects to **`/child-login`** (no `picker=1`).
3. **`child-login.js` `resumeActiveChildSessionIfPresent`** on load: when **not** `picker=1`, a valid child cookie redirects to **`/child/today`** again.
4. **Hypothesis:** stale **parent JWT cookie** + child **localStorage** (or intermittent cookie winner on Android WebView) → **`/child/today` ↔ `/child-login`** redirect loop = flicker. **Parent login first** aligns cookies before child PIN so verify + barnvy agree on `type: child`.

**`authGuard()`** (parent pages): on `me.type === 'child'` it runs **`tryActivateSavedParentSession()`** — not the barnvy init path, but related session/cookie complexity on native.

**Physical QA workaround (mandatory on Android until fix):**

1. Open app → **log in as parent first** (`/login`).
2. Then open **barninloggning / picker** and complete child PIN.
3. Do **not** use “child first” as the gate path for Activation physical QA.
4. If flicker returns: force stop → **Rensa cache** (or data) → repeat **parent → child**.

**Classification:** **PRODUCT BUG** (Android WebView cookie ordering + `resumeActiveChildSessionIfPresent` ↔ `child-dashboard` guard loop). **Not** EXPECTED SECURITY BEHAVIOR (child session should resume cleanly). **STALE SESSION** can trigger it when parent cookie remains. **No product fix** this session — see recommended fix prompt below.

**Recommended separate fix prompt (outline):** On native Android, after child-login success, atomically clear parent `access_token` before barnvy navigation; on `/child/today`, if `me.type !== 'child'` but child localStorage present, prefer single redirect to `child-login?picker=1` instead of clear+loop; add Capacitor integration test for cold launch with child-only cookie jar.

**Product fix shipped:** **None** — physical **core** gate uses **parent → child** only; **child-first remains FAIL**.

Earlier flicker during agent CDP runs was **consistent with the same navigation/cookie pattern**; user repro **without automation** confirms the risk is **not CDP-only**.

Artifact (no secrets): `artifacts/founder-android-prod-smoke.json` on operator Mac (local, not committed).

## Flagstatus och expiry

| Scope | State |
|-------|--------|
| Global `activation_first_success_v1` | **OFF** |
| Percentage rollout | **0** (global OFF) |
| sv-SE QA family `bc825034-7f94-4200-82d6-757505598615` | **ON** (family override) |
| en-GB QA family `9435e009-75dd-493a-bb86-0d9d509f1544` | **ON** (family override) |
| All other families | **OFF** |
| Growth flags (`growth_*`) | **OFF** |
| Override expiry | `2026-08-10T23:59:59.000Z` |

Overrides remain **ON** for continued founder/QA use; global flag remains **OFF**.

## Evidens och säkerhetskontroll

- **No credentials, PINs, cookies, tokens, or personal data** in this document, git diff for these docs, or attached screenshots.
- QA accounts referenced by **family UUID** and `@test.stjarndag.local` domain only (manifest); passwords live in operator secret store / mode-600 manifest on VPS.
- Stop conditions (multi-coach, double completion, override spill, SHA mismatch at baseline) — **not triggered** during physical PASS.

## Pilotbeslut (1H)

| Decision | Outcome |
|----------|---------|
| Founder / QA continued use on iPhone | **GO** |
| Platform-neutral customer pilot | **NO-GO** until **Prompt 1J** Activation gate **PASS** on physical Android (QA family) |

## Rekommenderat nästa steg

1. Create `~/.config/mystarday/founder-activation-qa.env` (mode `600`) with `QA_PASSWORD` (+ `QA_CHILD_PIN` if rotated); re-run `scripts/ops/run-android-activation-full-qa.sh` and complete manual SM-G991B checklist.
2. Fix Android child-first session loop (cookie ordering) in a future release.
3. Re-run `feature:family-override --verify` before override expiry (2026-08-10Z).
4. Keep global `activation_first_success_v1` OFF until L1 go-live checklist.

---

# Physical Android Activation Gate (Prompt 1J)

## Status

`CURRENT PROD ANDROID CORE FLOW PASS`  
`ACTIVATION FIRST SUCCESS ANDROID TARGETED GATE NOT YET RUN`  
**Gate outcome:** `PHYSICAL ANDROID ACTIVATION BLOCKED — QA CREDENTIALS UNAVAILABLE`

## Device och appversion

| Field | Value |
|--------|--------|
| Device | Samsung SM-G991B (Galaxy S21 5G) |
| Android | 15 |
| Serial | `R3CR3008SEK` (adb) |
| App | `se.mystarday.app` 1.3.0 |
| Native load | `https://mystarday.se` (Capacitor `server.url`, prod) |

## Prod SHA/cache

| Check | Result |
|--------|--------|
| `GET /health` | **healthy** |
| `git_sha` | `8fea1f5543664ce75db8e8e23c014aea70bd97fd` |
| `cache_version` | `stjarndag-v769` |

## QA-family override

| Check | Result |
|--------|--------|
| Global `activation_first_success_v1` | **OFF** (health + prior VPS verify) |
| sv-SE QA family override | **ON** until `2026-08-10T23:59:59.000Z` |
| en-GB QA family override | **ON** (same expiry) |
| Control / founder family override | **OFF** (founder `activation-config` via API smoke) |
| Growth flags | **OFF** |
| QA scenario reset (no first_success, pending completion) | **Not run** — blocked without prod DB/VPS + QA login |
| `~/.config/mystarday/founder-activation-qa.env` | **Missing** on operator Mac |

## First Success coach

| Check | Result |
|--------|--------|
| Exactly one coach on Hem (QA family, physical) | **NOT VERIFIED** — gate blocked |
| Responsive Android 412×915 (QA API) | **PASS** (1G, prior run) |

## Child login

| Check | Result |
|--------|--------|
| Parent → picker → PIN → Today (founder) | **PASS** |
| Child-first cold launch (existing child session) | **FAIL** (flicker / redirect loop) |

## Completion och stjärna

| Check | Result |
|--------|--------|
| Founder API completion | **PASS** (`founder-android-prod-smoke.mjs`) |
| QA family physical completion + single star | **NOT RUN** |

## Parent restore

| Check | Result |
|--------|--------|
| After QA Activation journey | **NOT RUN** |

## Native/WebView

| Check | Result |
|--------|--------|
| `adb` cold launch | **PASS** |
| No CDP navigation during physical QA | **Policy** (prior CDP caused session flicker) |
| Back / keyboard / font scale | **NOT RUN** on QA Activation path |

## Child-first reproduktion

**Steps:** Force-stop app → relaunch with **existing valid child session** (no parent login first) → expected `/child/today`.

**Observed:** Immediate UI flicker (logged-in vs logged-out).

| Layer | Notes |
|--------|--------|
| Native launch URL | `https://mystarday.se` (remote WebView; last route may persist) |
| Persisted child session | Child JWT + `localStorage` auth snapshot |
| Parent/child resolution | `/api/auth/me` can return `parent` while parent `access_token` cookie remains |
| Capacitor lifecycle | Standard cold start; no local bundle (remote URL) |
| Service worker | Unregistered on native; not primary suspect |
| Auth restore | `resumeActiveChildSessionIfPresent` → `/child/today`; dashboard rejects non-child `me` → `/child-login` |
| Redirect order | Loop between child-login resume and dashboard guard |

**Classification:** **PRODUCT BUG** (with **STALE SESSION** trigger when parent cookie coexists).

## Tenant-isolering

Founder smoke confirms founder family **without** Activation override. QA families isolated by UUID; no override spill observed in API checks documented in 1G/1H.

## Säkerhetskontroll (PR #857)

| Item | Result |
|--------|--------|
| Committed docs/scripts | No passwords, tokens, or cookies |
| Scripts | Env-var only; removed founder-password probe on QA account |
| Shell help | No literal PIN in operator instructions |
| Artifacts | JSON metadata only; local `artifacts/*` not committed |
| Operator `.env` | Founder secrets local only — not in PR |

**Merge PR #857:** **Hold** until CI **green** and operator completes QA Activation physical gate (or documents blocked state — this run).

## PR #857

Branch `cursor/android-founder-physical-qa-doc`. Adds physical QA doc updates, `founder-android-prod-smoke.mjs`, `activation-qa-prod-gate.mjs`, `run-android-activation-full-qa.sh`. Title still says PARTIAL — doc now reflects core PASS + Activation gate NOT YET RUN.

## Pilotbeslut

| Decision | Outcome |
|----------|---------|
| Founder Android core (parent→child) | **GO** for internal smoke |
| Activation First Success on physical Android (QA override) | **BLOCKED** until QA credentials + manual gate |
| Global rollout | **NO-GO** (global flag OFF) |
| Customer pilot | **NO-GO** until 1J Activation PASS on device |
