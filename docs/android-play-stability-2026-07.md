# Android Play stability — incident log (2026-07-09)

Internal reference for Family Policy resubmission and overnight fixes.

## Rejection context

Google Play rejected **versionCode 3** for app stability during Family Policy review. Symptoms on Android WebView (Samsung SM-S942B, Android 16):

1. Crash / blank screen after login
2. Session lost on app reopen
3. Could not complete reviewer flow

## Root causes found

| Issue | Cause | Fix (main) |
|-------|--------|------------|
| JS error on every page | `native-debug.js` patched read-only `location.assign` | Removed patch; v1.0.5 |
| Login → dashboard crash loop | Auto-redirect when already logged in + GPU crash on dashboard | Stop auto-redirect on Android; flat dashboard CSS |
| Blank login (logo only) | Early `return` skipped `AppEntry.init()` | Fall through to init; show role pick |
| Debug overlay on all users | `native-debug` injected unconditionally | Gate behind `NATIVE_DEBUG_OVERLAY=true` |
| Post-login dashboard GPU crash | Parent magic 3D + dashboard-magic CSS on WebView | **Classic dashboard on Android**; strip GPU CSS |

## Server-side fixes (no new AAB required)

Remote WebView loads UI from the deployed web app. Server-side fixes ship via git deploy:

- `platform-native.css` — disable `backdrop-filter`, `filter:blur`, 3D transforms on `is-native-android`
- `parent-magic-shell.js` — skip 3D orbs on Android
- `dashboard-home-hub.js` — skip `magic-3d-scene` classes on Android
- `login.html` / `app-entry.js` — Android login flow stability
- `native-debug.js` — diagnostics (gated in prod)

## AAB / native (when resubmitting)

- **versionCode 5** in `assets/play-store/android-version.json`
- `scripts/patch-android-main-activity.mjs` — `WebView.setWebContentsDebuggingEnabled(true)` for internal `chrome://inspect` (optional)
- Build: `npm run cap:android` → signed AAB

## Reviewer test path (updated)

1. Install from Internal testing track
2. App opens → redirects to `/login`
3. Tap **Jag är vuxen** (not only "Logga in" on welcome)
4. Email: review demo account (see `docs/app-store-demo-konto.md`)
5. Parent dashboard (Hem) should load without crash
6. Child: Anna, PIN from APP_REVIEW_CHILD_PIN

## Re-enable debug (internal only)

On VPS `.env`:

```
NATIVE_DEBUG_OVERLAY=true
```

Restart the application service. Or append `?native_debug=1` to any URL (injects overlay for that session).

## Verification commands

```bash
curl -s "$APP_URL/login" | grep native-debug   # empty when overlay off
curl -s "$APP_URL/sw.js" | grep CACHE_NAME
```

## Status (2026-07-10)

- [x] Fixes merged to `main` and deployed to VPS
- [x] `NATIVE_DEBUG_OVERLAY` off in prod (normal users)
- [x] **v568** — classic dashboard on Android: keep essential scripts (`parent-magic-auto`, `dashboard-activity-modal`, `birthday-picker`, `dnd-touch-bridge`), retain `app-view-toggle.css` for top chrome safe-area, guard optional dashboard init, prefetch CSRF after auth
- [x] **v569** — **först visa data**: parallel dashboard-stats fetch on Android; skip duplicate `/api/auth/me` in `initParent`; CSRF non-blocking
- [x] **v570** — cache-bust dashboard JS (`?v=2.40.0-android`); activity-modal ScheduleCore guard; lightweight GET fetch on Android
- [x] **v571** — fix `Maximum call stack size exceeded` — remove GPU CSS MutationObserver; data-first Android init; `var` shared dashboard state
- [ ] Human QA on physical Android (paused — tester)
- [ ] AAB v5 upload + Play resubmission

### Android magic flat mode (2026-07-11)

- [x] **v575** — Re-enable parent magic view on Android (flat CSS, no 3D orbs)
- Magic shell + `dashboard-home-hub` loaded; GPU CSS (`parent-magic-3d`) still stripped
- Stability fixes retained: data-first init, `logDashboardStability`, `var` shared state

### Android classic mode (superseded)

Magic view was temporarily **disabled** on Android during Play review (v547–v574). Now **flat magic** with GPU guards.

POS: 15 Section B (native stability)
