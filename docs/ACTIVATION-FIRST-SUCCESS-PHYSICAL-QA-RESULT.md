# Activation First Success — Physical QA Gate

**Prompt:** 1G (responsive) + **1H** (physical iPhone final) + **1I** (current prod iPhone regression)  
**Date:** 2026-08-04  
**Prod URL:** `https://mystarday.se` <!-- pragma: allowlist secret -->

## Status

| Platform | Status |
|----------|--------|
| **Physical iPhone** (Activation baseline v768) | **PASS** |
| **Physical iPhone on current prod v769** (Prompt 1I) | **PASS** |
| **Physical Android** | **BLOCKED — NO DEVICE ACCESS** |
| **Responsive iPhone** (390×844) | **PASS** (sv-SE + en-GB QA families) |
| **Responsive Android** (412×915) | **PASS** (sv-SE + en-GB QA families) |

**Slutstatus (1I):** `CURRENT PROD IPHONE PASS — ANDROID PHYSICAL QA BLOCKED`

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

**BLOCKED — NO DEVICE ACCESS** (no physical Android, emulator not used for physical gate, no device farm in repo).

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
| Platform-neutral customer pilot | **NO-GO** until physical Android **PASS** |

## Rekommenderat nästa steg

1. Physical Android QA on hardware or approved device farm.
2. Re-run `feature:family-override --verify` before override expiry (2026-08-10Z).
3. Keep global `activation_first_success_v1` OFF until L1 go-live checklist.
