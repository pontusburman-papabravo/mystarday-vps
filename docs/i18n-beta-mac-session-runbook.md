# English Beta — Mac afternoon session runbook

**Prepared:** 2026-07-25 (cloud agent)  
**Target:** Physical builds + device smoke on local Mac  
**Merged main:** `9305f43e` (PR #722 + ATT fix #720)

---

## Already done (cloud agent)

| Step | Status | Detail |
|------|--------|--------|
| PR #722 review | ✅ DONE | Docs + version bumps only; no new markets |
| PR #720 ATT fix | ✅ MERGED via #722 | `AttTrackingCoordinator.swift` in build 29 |
| PR #722 merge | ✅ DONE | Merge commit `9305f43e` |
| `npm run test:gate` | ✅ PASS | 0 failures |
| `audit:i18n:strict` | ✅ 0 hits | |
| `audit:i18n:baseline` | ✅ 240/289 | Did not increase |
| GitHub CI on #722 | ✅ SUCCESS | Before merge |

### Versioning on main (verify before archive)

```
iOS:     MARKETING_VERSION 1.3, CURRENT_PROJECT_VERSION 29
Android: versionName 1.3.0, versionCode 9
SW:      stjarndag-v675 (web deploy separate from native)
```

### Market gates (unchanged)

```
market_se_open = true
market_eu_open = false
market_uk_open = false
market_us_open = false
market_other_open = false
```

---

## Mac setup (first 5 min)

```bash
cd <your-local-clone>
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"

git fetch origin --prune
git checkout main
git pull --ff-only origin main
git rev-parse HEAD
# Expected: 9305f43e (or later on main)
```

Optional sanity:

```bash
npm ci --legacy-peer-deps --include=dev
node --test test/i18n-store-beta-builds.test.js test/ios-att-tracking.test.js
```

---

## Part A — iOS build 29 → TestFlight

### A1. Sync

```bash
export META_CLIENT_TOKEN='…'   # from Meta App Dashboard → Settings → Advanced
npm run cap:sync:ios
node scripts/verify-meta-native-release.mjs
```

### A2. Xcode checklist (open `ios/App/App.xcworkspace`)

| Check | Expected |
|-------|----------|
| Bundle ID | verify in Xcode project settings |
| Team / signing | Your Apple Developer team |
| MARKETING_VERSION | 1.3 |
| CURRENT_PROJECT_VERSION | **29** |
| `sv.lproj/InfoPlist.strings` | In target |
| `en-GB.lproj/InfoPlist.strings` | In target |
| `sv.lproj/Localizable.strings` | In target |
| `en-GB.lproj/Localizable.strings` | In target |
| CFBundleLocalizations | sv + en-GB |
| NSUserTrackingUsageDescription | Swedish ATT string present |
| Sign in with Apple | Entitlement present |
| Push | Entitlement present |
| Associated domains | Present if configured |

### A3. Archive + upload

1. Scheme: **App** (Release)
2. Destination: **Any iOS Device**
3. Product → **Archive**
4. **Validate App** → note PASS/FAIL
5. **Distribute App** → App Store Connect → Upload
6. **Do not bump build** if upload succeeds

### A4. Record in this table

| Field | Result |
|-------|--------|
| Archive | NOT TESTED |
| Validation | NOT TESTED |
| Upload | NOT TESTED |
| Build number | 29 |
| TestFlight processing | NOT TESTED |
| Warnings | |

### A5. ATT screen recording (for App Store if resubmitting 2.1)

On physical iPhone after TestFlight install:

1. Delete app
2. Settings → Privacy → Tracking → Allow Apps to Request to Track = ON
3. Install build 29 from TestFlight
4. Launch → **ATT dialog must appear** within ~1s after WebView visible
5. Record screen → attach to App Review Information → Notes

---

## Part B — Android versionCode 9 → Internal Testing

### B1. Environment

```bash
java -version    # JDK 17+ recommended
adb version
```

### B2. Sync + build

```bash
npm run cap:sync:android
npm run android:aab
```

Verify in generated `android/app/build.gradle` (after patch):

- `versionCode 9`
- `versionName "1.3.0"`
- `values-sv/` and `values-en-rGB/` present

### B3. Signing

- Keystore: local only (not in repo)
- Follow `assets/play-store/README.md` if unsure

### B4. Upload

Google Play Console → Internal testing track (not the live release track)

### B5. Record

| Field | Result |
|-------|--------|
| AAB path | |
| Signing | NOT TESTED |
| Upload | NOT TESTED |
| Processing | NOT TESTED |
| Internal release | NOT TESTED |

---

## Part C — Install test builds

| Platform | Source | Device | OS | Prior version | Install type |
|----------|--------|--------|-----|---------------|--------------|
| iOS | TestFlight | | | | clean / update |
| Android | Internal Testing | | | | clean / update |

**Prefer update path** from previous build when possible.

---

## Part D — Physical QA matrix

Fill `docs/i18n-child-core-qa-matrix.md` with **PASS / FAIL / BLOCKED / NOT TESTED only**.

### Language combinations (both platforms)

| # | OS locale | Family locale | english_child OFF | english_child ON |
|---|-----------|---------------|-------------------|------------------|
| 1 | sv-SE | sv-SE | ☐ | ☐ (after activation) |
| 2 | sv-SE | en-GB | ☐ | ☐ |
| 3 | en-GB | sv-SE | ☐ | ☐ |
| 4 | en-GB | en-GB | ☐ | ☐ |

### Parent flows

- [ ] Cold start
- [ ] Login
- [ ] Home / Today
- [ ] Planning
- [ ] Family
- [ ] Settings + language switch
- [ ] Logout / login
- [ ] Force quit + session restore

### Child flows (flag OFF first — expect sv-SE child UI)

- [ ] Child login
- [ ] Today → activity → steps → completion → star
- [ ] Celebration
- [ ] Treasure Chest → redeem
- [ ] My Collection / People / Space
- [ ] World / scene
- [ ] Parent gate

### Native checks

- [ ] Permission dialogs (camera, photos, notifications) — correct language
- [ ] ATT dialog (iOS build 29)
- [ ] Safe areas / keyboard
- [ ] Offline → reconnect (no duplicate stars)
- [ ] Android back button

---

## Part E — Activate test family (ONLY after device PASS)

**Preconditions:** iOS + Android smoke PASS (or explicit go for one platform).

**Candidate:** QA account in `docs/qa-test-account.md` / `docs/app-store-demo-konto.md`

Verify before activation:

```sql
-- family should have:
-- country_code = 'SE', market_region = 'EU'
-- preferred_locale = 'en-GB', english_app ON, english_child_experience OFF
```

Activation (from `docs/i18n-beta-rollout-plan.md`):

```sql
INSERT INTO family_features (family_id, feature_slug)
SELECT f.id, 'english_child_experience'
FROM family f
JOIN parent p ON p.family_id = f.id
WHERE p.email = '<review-account-email>'
ON CONFLICT DO NOTHING;
```

**Document internally** (not in public PR): family ID, time, builds, rollback command.

### English Child smoke (after activation)

Full child loop in English — see Del 15 in task brief. Mark each PASS/FAIL.

### Rollback test

```sql
DELETE FROM family_features ff
USING family f, parent p
WHERE ff.family_id = f.id AND p.family_id = f.id
  AND p.email = '<review-account-email>'
  AND ff.feature_slug = 'english_child_experience';
```

Verify: child reverts to sv-SE, stars/rewards/history intact.

---

## Part F — Screenshots

Follow `docs/i18n-beta-screenshot-plan.md` after stable builds.

Output: `docs/app-store-screenshots/en-GB/` and refresh `sv-SE/` if needed.

---

## Part G — Go / no-go for cohort 2 (3–5 families)

### GO when

- No P0 failures
- No data loss / duplicate stars
- Rollback works
- Language reporting works
- Native permission copy correct

### NO-GO when

- Login blocked
- Completion/reward data issues
- Crashes
- Mixed language in child core flows
- Rollback fails

**Do not auto-advance cohort.** Recommend to product owner.

---

## Part H — App Store / Play metadata

Copy ready in:

- `docs/app-store-connect-metadata-en-GB.md`
- `docs/google-play-metadata-en-GB.md`
- `docs/app-store-review-notes.md` (build 29 notes)

**Do not open new countries** in store consoles.

---

## Blocked items (cannot complete without Mac + devices)

| Item | Owner |
|------|-------|
| Xcode archive | Mac afternoon |
| TestFlight upload | Mac afternoon |
| Android AAB + Play upload | Mac afternoon |
| Physical device smoke | Mac + iPhone + Android |
| Screenshots | After device smoke |
| Test family activation | After PASS |
| Cohort 2+ | Product decision |

---

## Next phase after test-family PASS

**P-i18n-Beta-Feedback-and-Stabilisation** — analyse real language reports, device issues, retention per locale before broader Sweden opt-in.
