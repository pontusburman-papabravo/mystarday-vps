# Native child-first session restore — test matrix

## Automated (Cloud)

| # | Scenario | Coverage |
|---|----------|----------|
| 1 | Parent-only session | `session-cookie-reconcile` + gate integration patterns |
| 2 | Child-only valid session | Harness `child-only` case |
| 3 | Parent access + child refresh (native cold) | Harness legacy loop + fixed stable |
| 4 | Parent + expired child refresh | DB integration via refresh verify null |
| 5 | Parent + revoked child refresh | `revoked-access-contract` / handoff suites (gate) |
| 6 | Parent + child family mismatch | `child-login` family guard + bootstrap `FAMILY_MISMATCH` |
| 7 | Two concurrent restore calls | `native-child-session-restore.js` `_bootstrapPromise` lock |
| 8 | Child-dashboard guard during restore | `bootstrapNativeChildSession` before dashboard `/me` |
| 9 | Child-login during restore | Delegates to `NativeChildSessionRestore.resumeActiveChildSessionIfPresent` |
| 10 | Refresh on `/child/today` | `Auth.api` + server reconcile on each request |
| 11 | Background/foreground | Physical checklist (operator) |
| 12 | Process kill/reopen | Harness cold-start trace; physical 5× adb |
| 13 | Parent restore after child | `parent-child-session-restore.test.js` (gate) |
| 14 | Browser/PWA regression | Bootstrap skipped when `!shouldRunNativeChildBootstrap()` |
| 15 | No redirect loop | Harness asserts `redirectLoop === false` (fixed) |
| 16 | ≤1 child verification per bootstrap | Single `bootstrapNativeChildSession` promise |
| 17 | ≤1 terminal navigation | `location.replace` once on successful resume |

### Commands

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
npm run test:native-child-cold-launch-harness
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false npm run test:gate
npm run test:e2e:i18n
npm run test:child-core-harness
npm run test:activation-first-success-browser
npm run audit:i18n:strict
npm run lint:public
npm run check:css
npm run check:routes
```

## Physical device gate (operator Mac, branch v770)

**Branch SHA:** `11031ef8e6a8ff16cd45d978b89ba1ee86a790f8`  
**Cache:** `stjarndag-v770`  
**Client load:** CAP_DEV live-reload / local branch server (not prod v769 WebView-only).  
**Credentials:** per approved secret store only — never committed.

### Android — Samsung SM-G991B (Android 15, adb serial operator-local)

| Check | Result |
|-------|--------|
| Parent-first → child PIN → Child Today stable | **PASS** |
| **5/5** cold launch (`force-stop` → launch) | **PASS** — no flicker, no redirect loop, no new PIN |
| Correct child, family, schema | **PASS** |
| Activity completion + star | **PASS** |
| Parent restore (Förälder flow) | **PASS** |
| Back / background / process kill | **PASS** |
| Revoked / expired / mismatch child session | **PASS** — safe fallback, no loop |

### iPhone 15 Pro (iOS 26.5.2, physical USB)

| Check | Result |
|-------|--------|
| Branch v770 client loaded | **PASS** |
| Child login + force close / cold start | **PASS** — stable Child Today resume |
| No flicker or redirect loop | **PASS** |
| Parent restore | **PASS** |
| Revoked child-session fail-safe | **PASS** |

## Slutstatus

**MERGE READY — physical Android 5/5 and physical iPhone regression PASS on branch `11031ef8` / `stjarndag-v770`.**
