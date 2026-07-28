# English Launch — Release Candidate

**Status:** RC-1 in progress  
**Last updated:** 2026-07-28  
**Audience:** Product, QA, release engineering  
**Related:** [`docs/i18n-glossary.md`](i18n-glossary.md), [`docs/qa-test-account.md`](qa-test-account.md), [`docs/e2e-i18n-english-journey.md`](e2e-i18n-english-journey.md)

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

## Open PR triage (2026-07-28)

GitHub currently shows **6 open draft PRs** (not 13). Older cloud-agent branches may exist without PRs — treat them as **stale** unless revived for a release bug.

| PR | Title | Recommendation |
|----|-------|----------------|
| **#770** | Schedule PDF / print i18n | **Merge** — final planned i18n vertical; CI green |
| **#743** | Daily log nav / empty state bug | **RC-1 bug** — evaluate on `main`; merge if still reproduces; not i18n programme |
| **#744** | Give extra stars modal i18n | **Review vs `main`** — modal may already use `schedule.modals.giveStars`; close if duplicate |
| **#745** | Day off modal i18n | **Review vs `main`** — close if already covered by home pack |
| **#746** | Image archive upload UI i18n | **Review vs `main`** — merge only if gap remains; else close |
| **#716** | Child Core inventory docs (blocked) | **Close** — superseded by merged child-core PRs (#718, #763, #764, #767) |

### Recommended sequence

1. Merge **#770** → mark i18n programme complete on `main`.
2. Rebase or close **#744–#746** after diff against `main` (avoid double locale keys).
3. Triage **#743** as release engineering, not i18n.
4. Close **#716** with link to merged child work.
5. Delete stale `cursor/i18n-*` branches that have no open PR and are fully merged.

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
