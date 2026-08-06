# English Launch — Release Candidate

**Status:** RC-1 in progress · **Core i18n implementation complete — English release readiness NO-GO pending RC-1/RC-2** (styrande: [`docs/releases/RC1_I18N_RC_BRANCH_STATUS.md`](releases/RC1_I18N_RC_BRANCH_STATUS.md), 2026-08-03)  
**Last updated:** 2026-08-06  
**Audience:** Product, QA, release engineering  
**Related:** [`docs/i18n-glossary.md`](i18n-glossary.md), [`docs/qa-test-account.md`](qa-test-account.md), [`docs/e2e-i18n-english-journey.md`](e2e-i18n-english-journey.md)

---

## RC-1 — Recommended order

Run RC-1 **methodically** from this doc. No new broad PRs — each finding becomes a **small release bug** with repro, scope, and smoke test.

| Step | Focus |
|------|--------|
| 1 | **iPhone** physical QA (SE, 13, 15 Pro) |
| 2 | **Android** physical QA (Pixel, Samsung mid-range) |
| 3 | **Known risk areas** (checkboxes below) |
| 4 | Offline / cache / upgrade from older build |
| 5 | English demo family (`npm run seed:english-demo`) |
| 6 | Store screenshots + metadata |
| 7 | Launch flags, monitoring, rollback plan |

**Discipline:** No new features until RC-1 is green.

### Release bug template (when a checkbox fails)

Open a **small PR** — not a reopened i18n epic. Include:

1. **Repro** — device, locale, path (e.g. Home → Ledig dag)
2. **Expected** vs **actual**
3. **Scope** — files/surfaces touched (max one modal or one flow)
4. **Smoke** — unit, E2E, or manual step added to prevent regression
5. **POS** — cite glossary term if copy change ([`docs/i18n-glossary.md`](i18n-glossary.md))

---

## RC-1 — Known risk areas (post-i18n backlog)

These were **closed implementation PRs**; verify on current `main` during RC smoke. If broken → release bug (see template above).

| # | Area | How to verify (en-GB family) | Pass |
|---|------|------------------------------|------|
| R1 | **Day-off modal** | Home → `Ledig dag` / day-off → modal title, body, buttons English; dark theme readable | [x] PR R3 home.dayOffModal (2026-08-06) |
| R2 | **Bildarkiv upload** | Planning → Library → upload image → buttons/toasts English (`library-images.js`) | [x] PR #916 (pending merge/deploy) |
| R3 | **Daily log nav / empty view** | Today (`/daily-log`) → bottom nav + `aria-label` en-GB; child → log loads (not stuck on placeholder) | [x] PR daily-log RC closure (pending merge/deploy) |

**RC-1 engineering (automated):** R1–R3 known risks addressed in code; `test:gate`, `audit:i18n:strict`/`baseline`, `test:e2e:i18n`, and focused browser gates green locally. **RC-2 manual launch** (physical devices, store, legal) remains separate — not PASS without evidence.

**R1 repro hint:** `openLedigDagModal()` / `#ledigDagModal` — strings may still be hardcoded Swedish on `main`.  
**R2 repro hint:** Upload flow toasts (“Laddar upp…”, delete confirm) in `public/js/library-images.js`.  
**R3 repro hint:** After child pick, `#logContent` should load; bottom tab bar present on magic/PWA paths.

---

## English i18n program — complete

**English i18n Program: Complete** — merged through **#770** (PDF/print) on 2026-07-28.

From this point, work is **only** one of:

| Type | Examples |
|------|----------|
| 🐞 **Release bug** | Small scoped fix from RC smoke (incl. leftover Swedish in a modal) |
| 🔧 **Release engineering** | RC checklist, store assets, flags, monitoring |
| 🚀 **New feature** | After English launch — not during RC freeze |

Not “i18n PR #15”. New user-facing strings still require sv-SE + en-GB locale keys.

---

## i18n project — formally closed

The planned English (`en-GB`) localization programme is **complete** after merge of **#770** (schedule PDF / print). What shipped was not “string translation” but full-product verification:

| Layer | Coverage |
|-------|----------|
| Locale infrastructure | `preferred_locale`, fragments, `pt()` / `I18n`, `LocaleDateTime`, STRICT/BASELINE audits |
| Auth & onboarding | Login, register, child login, email flows |
| Parent surfaces | Home, Journey, Today, Planning, Schedule, Family, Settings |
| Child experience | Core UI, Samling, rewards, read-aloud, native shells |
| Communications | Push notifications, transactional email |
| Export | Schedule PDF / print (`/print-schema`) |
| Quality | `test:gate`, `test:e2e:i18n`, live-site mobile smoke |

### i18n freeze (from RC-1 until English launch)

| Allowed | Not allowed |
|---------|-------------|
| Release bugs (small, scoped fixes) | New large “i18n translation” PRs |
| New user-facing strings via normal locale keys | Re-opening vertical i18n epics |
| RC-1 / RC-2 checklist work | New features unrelated to launch |

**Rule:** Any new i18n gap found during RC is a **release bug** — fix in a small PR, not a new programme phase.

**Ongoing obligation:** All **new** product copy still goes into `config/i18n/*` (sv-SE + en-GB parity). The freeze is on bulk migration work, not on localizing new features.

---

## RC-1 — Functional sign-off

Check each row on a fresh **en-GB** family (`preferred_locale = en-GB`; child flag `english_child_experience` where applicable). Use isolated test families in dev/CI; prod smoke uses [`docs/qa-test-account.md`](qa-test-account.md) only when explicitly approved.

| Area | RC-1 gate | Automated | Manual |
|------|-----------|-----------|--------|
| Auth | Login, register, logout, locale at login, child PIN | `test:e2e:i18n`, auth integration | Login picker, Apple/Google on device |
| Parent app | Home, nav, settings, account | E2E journey, home/planning tests | Portrait thumb, tour overlays |
| Child app | Today, activities, rewards, settings | Child E2E, pack parity tests | Native WebView smoke |
| Journey | Coach, readiness, one next step | Journey tests + E2E | No Swedish chrome on en-GB |
| Planning | Hub links, library entry | Planning tests | Print-schema link |
| Schedule | Week/special days, modals, custody | Schedule surfaces tests | Long labels, DnD |
| Rewards | Parent rewards hub, Skattkammaren | Rewards E2E | Bonus stars terminology |
| Collection (Samling) | Child collection surfaces | Samling E2E | Reload persistence |
| Push | Reminders, handoff, dedupe keys | Scheduler + dedupe tests | Device notification copy |
| Transactional email | Verify, welcome, weekly, win-back | `i18n-auth-email`, escaping tests | Spot-check HTML in inbox |
| PDF | `/print-schema` preview + filename | `test/i18n-print-schema.test.js`, print E2E | Save PDF on iOS Files / desktop Downloads |

**RC-1 functional verdict:** All rows checked → proceed to RC-2.

---

## RC-1 — Quality gates (automated)

These must stay green on `main` during RC. No merge to release branch without them.

| Gate | Command / check | Target |
|------|-----------------|--------|
| Unit + integration | `NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false npm run test:gate` | 0 fail |
| STRICT Swedish audit | `npm run audit:i18n:strict` | 0 hits |
| BASELINE audit | `npm run audit:i18n:baseline` | ≤ baseline limit (0) |
| English E2E | `npm run test:e2e:i18n` | 0 fail, 0 skip |
| CI | GitHub `test` + `e2e-i18n` workflows | Success |
| Live-site smoke | Mobile smoke scripts / manual checklist | Green before store submit |

**Locale parity:** Every new or changed key in `config/i18n/*-sv-SE.json` must have matching `*-en-GB.json` (see `compareLocaleStructures` in tests).

---

## RC-2 — Manual QA (devices)

### iPhone

| Device | OS | Locale | Notes |
|--------|-----|--------|-------|
| iPhone SE | iOS 15+ | sv-SE regression | Smallest portrait |
| iPhone 13 | Current | en-GB | Primary English path |
| iPhone 15 Pro | Current | en-GB | Safe areas, native shell |

### Android

| Device | OS | Locale | Notes |
|--------|-----|--------|-------|
| Pixel | Current | en-GB | Chrome + WebView |
| Samsung (mid-range) | Current | en-GB | Thumb reach, performance |

### Scenarios (both platforms)

- [ ] Cold start → login → Home → child handoff → complete activity → reward
- [ ] Switch locale at login (sv → en) → legacy notice → Swedish user data unchanged
- [ ] Offline / flaky network → honest messaging (native)
- [ ] Upgrade from previous store build → session + locale preserved
- [ ] Push notification received → English copy on en-GB family
- [ ] Create schedule PDF → preview English → save file → open in Files/Downloads

---

## RC-2 — Store

| Item | Owner | Status |
|------|-------|--------|
| App Store screenshots (en) | | |
| Google Play screenshots (en) | | |
| App Store description + keywords | | |
| Google Play description + keywords | | |
| Localized store metadata (see `i18n-store-beta-builds` work) | | |
| Review notes + demo account | [`docs/app-store-demo-konto.md`](app-store-demo-konto.md) | |

---

## RC-2 — Marketing

| Item | Status |
|------|--------|
| English landing / `en.html` | |
| Waitlist capture | |
| Meta / ads campaign alignment | |
| Demo family (`npm run seed:english-demo` or prod review account) | |
| Glossary-aligned copy ([`docs/i18n-glossary.md`](i18n-glossary.md)) | |

---

## RC-2 — Launch operations

| Item | Reference |
|------|-----------|
| Feature flags (`english_app`, `english_child_experience`) | Gradual rollout plan |
| Monitoring | Errors, 402 paywall, push/email failure rates |
| Rollback | Revert `main` deploy; flags OFF first for flag-related incidents (see `.cursor/rules/170-git-workflow.mdc`) |
| Incident runbook | [`docs/ops-incident-runbook.md`](ops-incident-runbook.md) |

---

## Open PR triage (2026-07-28) — resolved

All draft i18n backlog PRs were **closed** after #770 / #771 merged to keep RC focus. Stale implementation branches should be deleted.

| PR | Action taken |
|----|----------------|
| **#770** | ✅ Merged — schedule PDF / print |
| **#771** | ✅ Merged — this RC doc + i18n freeze |
| **#716** | ❌ Closed — superseded by #718, #763, #764, #767 |
| **#744** | ❌ Closed — give-stars already on `main` via `schedule.modals.giveStars` |
| **#745** | ❌ Closed — RC smoke: day-off modal if Swedish remains |
| **#746** | ❌ Closed — RC smoke: library upload UI if Swedish remains |
| **#743** | ❌ Closed — RC smoke: daily-log nav/empty state if bug persists |

Standard close comment on each PR: *Superseded by merged work on main during the English launch program…*

### Branch cleanup (2026-07-28)

Delete **merged** `cursor/i18n-*` and closed i18n implementation branches on GitHub. Keep only branches with **active RC work** (e.g. open release-bug PRs). After cleanup, `git fetch --prune` locally.

---

## Release discipline (RC-1 → launch)

```
No new functionality until RC-1 is green.
Only: bugs, regressions, release engineering.
```

When RC-1 is green, shift mental model from **building** the English product to **launching** it.

---

## Sign-off

| Role | RC-1 functional | RC-1 quality | RC-2 manual | Launch |
|------|-----------------|--------------|-------------|--------|
| Engineering | | | | |
| QA | | | | |
| Product | | | | |

**RC-1 approved date:** __________  
**English launch date:** __________
