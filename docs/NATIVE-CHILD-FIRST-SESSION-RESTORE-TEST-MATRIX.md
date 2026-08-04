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
| 11 | Background/foreground | Not simulated in Cloud — physical checklist |
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
npm run audit:i18n:strict
npm run lint:public
npm run check:css
npm run check:routes
```

## Physical checklist (operator Mac)

### Android — SM-G991B (mandatory before MERGE READY)

- [ ] Source founder activation QA env per `docs/founder-qa-test-account.md` (mode 600; do not paste secrets)
- [ ] `./scripts/ops/run-native-child-first-device-gate.sh`
- [ ] Parent-first setup → child PIN → Child Today stable
- [ ] **5/5** cold launches: `force-stop` → launch → **no flicker**, **no loop**, **no new PIN**
- [ ] Correct child, family, schema
- [ ] Completion + star
- [ ] Parent restore (Förälder flow)
- [ ] Back button per contract
- [ ] Process kill/reopen repeated

### iPhone 15 Pro (mandatory before MERGE READY when device attached)

- [ ] Parent-first still works
- [ ] Child login + force close/reopen
- [ ] Child session resume
- [ ] Parent restore
- [ ] No new redirect loop

## Slutstatus Cloud

**CONDITIONAL MERGE — PHYSICAL DEVICE REGRESSION PENDING** until Android 5/5 and iPhone checklist PASS on branch.
