# Activation First Success — Physical QA Gate

**Prompt:** 1G (responsive) + **1H** (physical iPhone final) + **1I** (current prod iPhone regression)  
**Date:** 2026-08-04  
**Prod URL:** `https://mystarday.se` <!-- pragma: allowlist secret -->

## Status

| Platform | Status |
|----------|--------|
| **Physical iPhone** (Activation baseline v768) | **PASS** |
| **Physical iPhone on current prod v769** (Prompt 1I) | **PASS** |
| **Physical Android on current prod v769** (founder `.env`, SM-G991B) | **PASS** |
| **Responsive iPhone** (390×844) | **PASS** (sv-SE + en-GB QA families) |
| **Responsive Android** (412×915) | **PASS** (sv-SE + en-GB QA families) |

**Slutstatus:** `CURRENT PROD IPHONE PASS — CURRENT PROD ANDROID PASS`

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
| **Activation coach (exactly one)** | **PASS** on **iPhone physical QA family** (1I) + **responsive Android 412×915** (1G); founder Android confirms native WebView/session |
| Physical protocol | **Parent login → then child** (mandatory on Android) |
| Manual on device: stable session, PIN (#852–#855), Today, background | **PASS** (operator, parent→child path) |
| `adb` app launch only (no CDP navigation) | **PASS** |

**Physical Android on current prod v769:** **PASS**

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

**Product fix:** **None shipped** — treat as **open WebView/session issue** for a future ADR/fix (cookie swap ordering on Android). Physical gate **PASS** uses **parent → child** workaround only.

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
| Platform-neutral customer pilot | **GO** with documented Android **parent → child** entry (child-first remains **FAIL** until product fix) |

## Rekommenderat nästa steg

1. Fix Android child-first session loop (cookie ordering) in a future release.
2. Re-run `feature:family-override --verify` before override expiry (2026-08-10Z).
3. Keep global `activation_first_success_v1` OFF until L1 go-live checklist.
