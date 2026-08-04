# Native child-first session restore fix

## 1. Root cause

**Classification: `MULTIPLE CAUSES` (cookie precedence + route guard loop)**

| Layer | Issue |
|-------|--------|
| Server | Stale **parent** `access_token` could win over a valid **child** `refresh_token` on `/api/auth/me`, while `restoreParentSession` could still apply parent handoff when child access was missing/expired. |
| Client | `child-dashboard` redirected to `/child-login` on `me.type !== 'child'`; `resumeActiveChildSessionIfPresent` redirected back to `/child/today` when `/me` later saw `child` (WebView cookie race on Capacitor Android). |
| State | `DeviceMode=child` + local child profile in `localStorage` are **hints only**; they must not override server identity. |

Prod repro context: [ACTIVATION-FIRST-SUCCESS-PHYSICAL-QA-RESULT.md](./ACTIVATION-FIRST-SUCCESS-PHYSICAL-QA-RESULT.md) §1J.

## 2. Pre-fix redirect chain

```text
native cold launch (DeviceMode=child)
→ GET /child/today
→ /api/auth/me → type: parent (stale access_token)
→ child-dashboard → /child-login
→ /api/auth/me → type: child (refresh/cookie sync)
→ resumeActiveChildSessionIfPresent → /child/today
→ loop (flicker)
```

## 3. New auth-mode order

```text
native + DeviceMode.child + /child/*
→ reconcileChildSessionCookies (server, every request)
→ bootstrapNativeChildSession (client, single promise lock)
→ verified me.type === child
→ enterChild + Auth.setAuth
→ one navigation to /child/today
```

Runtime modes (`native-child-session-restore.js`): `parent` | `child` | `transitioning` | `unknown`.

## 4. Server verification

`src/lib/session-cookie-reconcile.js`:

- If `refresh_token` verifies as **child**, mint matching child `access_token` (Set-Cookie) before JWT decode.
- Wired at the start of `restoreParentSession` so handoff does not trump an active child refresh.

## 5. Parent restore

Unchanged: `stjarndag_parent_session` handoff + `activate-saved-parent-session` + PIN gate. Reconcile runs only when refresh row is child; parent refresh + parent access paths unchanged.

## 6. Revoked / expired child session

- Invalid refresh → reconcile no-op → client bootstrap fails → `/child-login` (native: `?picker=1` after loop guard).
- `Auth.clearAuth()` clears client cache only; httpOnly cookies cleared via existing logout/child flows.

## 7. Family mismatch

- Child login already blocks cross-family PIN success (`getDeviceFamilyId` vs `data.user.familyId`).
- Bootstrap returns `FAMILY_MISMATCH` → safe redirect to picker; server child scope unchanged.

## 8. Native vs browser

| Surface | Behavior |
|---------|----------|
| Capacitor Android/iOS | Full bootstrap + reconcile |
| PWA / desktop browser | Legacy resume on `/child-login` only; no DeviceMode child cold path |

## 9. Physical Android

Operator gate (branch v770, not prod-only WebView):

```bash
./scripts/ops/run-native-child-first-device-gate.sh
```

| Item | Result |
|------|--------|
| Device | Samsung SM-G991B, Android 15 |
| Cold launch 5/5 | **PASS** (2026-08-04) |
| Redirect loop / flicker | **None observed** |
| Parent restore | **PASS** |
| Revoked / expired / mismatch | **PASS** (safe fallback) |

## 10. Physical iPhone

| Item | Result |
|------|--------|
| Device | iPhone 15 Pro, iOS 26.5.2 |
| Cold start child resume | **PASS** (2026-08-04) |
| Redirect loop / flicker | **None observed** |
| Parent restore | **PASS** |
| Revoked session fail-safe | **PASS** |

## 11. SW / cache

Bump: `stjarndag-v769` → **`stjarndag-v770`** (`config/cache-version.json`, `public/sw.js`, precache `native-child-session-restore.js`).

**Release SHA:** `11031ef8e6a8ff16cd45d978b89ba1ee86a790f8`

## 12. Security

- No tokens/cookies in logs.
- No localStorage-only auth.
- Family scope server-enforced.
- Revoked refresh → no child resume.
- Parent handoff not deleted by reconcile.

## 13. Test results

| Command | Result |
|---------|--------|
| `npm run test:native-child-cold-launch-harness` | **PASS** |
| `node --test test/native-child-cold-launch-harness.test.js` | Included in `test:gate:unit` — **PASS** |
| `npm run test:gate` + CI on PR #858 | **PASS** |
| Physical Android 5/5 cold launch | **PASS** |
| Physical iPhone regression | **PASS** |

## 14. Rollback

Revert PR; redeploy. No migration. Cache v770 → prior SW if needed. Handoff rows unaffected.
