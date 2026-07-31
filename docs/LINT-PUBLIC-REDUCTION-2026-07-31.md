# lint:public reduction — Fas 5 (2026-07-31)

**Branch:** `cursor/lint-budget-reduction-01b8`  
**Start commit:** `6fdf5261` (budget 673)  
**Baseline `origin/main`:** `6dc079b04d0a4061a52bf2b36cebd122c78db8ff`

## Steg 1 — inventering (baseline)

Källa: `npx eslint public/js public/admin -f json` → `.local/lint-public-baseline.json` (ej committad).

| Metric | Value |
|--------|--------|
| Warnings | **673** |
| Errors | **0** |
| Fixable (`fix` flag) | **96** |

### Warnings per regel

| Regel | Count | Prioritet |
|-------|-------|-----------|
| `no-unused-vars` | 542 | P3 |
| `no-var` | 101 | P4 (safe autofix) |
| `prefer-const` | 30 | P3 (risky autofix on module state) |

**P1-regler** (`no-undef`, `no-unreachable`, `no-fallthrough`, `no-dupe-*`, …): **0** i baseline.

### Top 20 filer (warnings)

| Fil | Warnings |
|-----|----------|
| `public/js/schedule.js` | 64 |
| `public/js/dashboard.js` | 47 |
| `public/js/child-memory-hall.js` | 42 |
| `public/admin/admin-library.js` | 37 |
| `public/js/child-dashboard.js` | 36 |
| `public/js/family.js` | 33 |
| `public/admin/admin-families.js` | 32 |
| `public/js/reports.js` | 32 |
| `public/js/library.js` | 31 |
| `public/admin/admin-surveys.js` | 30 |
| `public/js/daily-log.js` | 17 |
| `public/js/engine-coach.js` | 14 |
| `public/admin/admin-survey-rapport.js` | 11 |
| `public/js/dashboard-card-actions.js` | 9 |
| `public/js/library-schema.js` | 9 |
| `public/admin/admin-dagensnyhet.js` | 8 |
| `public/js/auth.js` | 8 |
| `public/js/child-login.js` | 8 |
| `public/js/onboarding.js` | 8 |
| `public/js/platform.js` | 8 |

### Prioriteringsmatris

| Prioritet | Regeltyp | Exempel i repo |
|-----------|----------|----------------|
| P1 | Potentiellt runtimefel | Ingen träff i baseline |
| P2 | State / listeners | Shadowing + unused i event handlers (ej batch 1) |
| P3 | Underhållbarhet | `no-unused-vars` (542), delvis `prefer-const` |
| P4 | Stil | `no-var` (101, autofix-safe i isolerade filer) |

## Batch 1 — säker autofix + små manuella fixar

### Autofix (`eslint --fix`, endast `no-var`)

| Fil | no-var fixade |
|-----|----------------|
| `public/js/child-memory-hall.js` | 39 |
| `public/js/engine-coach.js` | 14 |
| `public/js/engine-voice.js` | 4 |
| `public/js/living-world-scenes-catalog.js` | 3 |
| `public/js/ambient-objects-pack.js` | 2 (+ regenerate sync) |
| `public/js/engine-coach-change.js` | 2 |
| `public/js/landing-events.js` | 1 |
| `public/js/login-magic.js` | 1 |

`prefer-const` **ej** mass-autofix (`schedule.js`, `child-dashboard.js` — risk enligt `lint-public.mjs`).

### Manuella lint-only (ingen beteendeändring avsedd)

| Fil | Ändring |
|-----|---------|
| `public/admin/admin-journey-rollout.js` | `prefer-const` (1) |
| `public/js/dashboard-polish.js` | `var` → `let` för MutationObserver |
| `public/admin/admin-family-hub.js` | `catch (_e)` |
| `public/admin/admin-l1-governance.js` | `_data` parameter |
| `public/admin/admin-nav.js` | borttagen död `PARENT_LABELS` |
| `public/admin/admin-user-stats.js` | `window.loadUserStats` export |
| `public/js/activation-program-aha-card.js` | borttagen död `escapeHtml` |
| `public/js/child-avatar.js` | `_onPick` parameter |
| `public/js/child-catalog-room.js` | borttagen oanvänd `target` |

### Batch 1 resultat

| | Före | Efter | Minskning |
|--|------|-------|-----------|
| Warnings | 673 | **599** | **74** |
| Budget | 673 | **599** | −74 |
| Produktfiler (runtime intent) | — | 0 beteendeförändringar | — |
| Tester | test:gate green | test:gate green | — |

**Produktfel:** inga. `ambient-objects-pack.js` krävde `npm run generate:ambient-objects` efter `--fix` (genererad fil).

## Kvar efter batch 1

| Kategori | ~Count |
|----------|--------|
| `no-unused-vars` | ~530 |
| `prefer-const` (ej autofixad) | ~28 |
| `no-var` (kvar i stora filer) | ~0–2 |

## Follow-up (ej Fas 5 utan beslut)

- Domänbatcher unused vars: `schedule.js`, `dashboard.js`, `family.js`, admin-library.
- `prefer-const` per fil med granskning av reassignment.
- Större dead-code i legacy child worlds / memory hall.
- Service Worker, push-native DB, onboarding/activation, betalflöde — **ej** i Fas 5.

## Gates (batch 1)

| Kommando | Resultat |
|----------|----------|
| `npm run lint` | exit 0 |
| `npm run lint:public` | 599/599 OK |
| `npm run test:gate` | 281 pass, 0 fail |
| `npm run check:ambient-objects` | OK efter regenerate |

**Slutgates** (`test:full`, migration rollback): kör före PR-merge enligt process.

## Batch 2 — prefer-const + säkra unused-vars (post batch 1)

**Start HEAD:** `3dcc79e1` · **Warnings/budget:** 599  
**Slut HEAD:** `94da9c59` · **Warnings/budget:** 494  

### Steg 1 inventering (efter batch 1)

Källa: `npx eslint public/js public/admin -f json` (batch 1 baseline 599).

| Metric | Batch 1 slut |
|--------|----------------|
| `no-unused-vars` | 535 |
| `prefer-const` | 30 |
| `no-var` | 34 |

Blockerade för mass-autofix: `schedule.js`, `child-dashboard.js` (`prefer-const`).

### Delbatch-logg

| Delbatch | Warnings före | Efter | Regel | Filer | Produktpåverkan |
|----------|---------------|-------|-------|-------|-----------------|
| prefer-const | 599 | ~597 | prefer-const | `dashboard-polish.js`, `for-dig.js` | Ingen |
| public helpers | ~597 | ~547 | no-unused-vars, dead code | `skeleton.js`, `calendar-page.js`, `cookie-banner.js`, `birthday-picker.js`, `app-view-mode.js` | Ingen — borttagna helpers ej refererade |
| admin små moduler | ~547 | ~494 | no-unused-vars, window exports | `admin-start`, `admin-waitlist`, `admin-core`, `admin-email-templates`, `admin-retention`, `admin-survey-rapport`, `admin-dagensnyhet`, `admin-newsletter`, `admin-messages-inbox`, `admin-subscription-settings`, `admin-analytics`, `admin-images`, `admin-landing-news` | Ingen — HTML `onclick` / `admin-core` typeof kräver `window.*` |
| library + settings | (inkl. ovan) | 494 | no-unused-vars, window exports | `library-standard.js`, `library-substeps.js`, `library-schema.js`, `child-settings.js`, `custody-settings.js` | Ingen — custody endast unused callback-param |

**Stop condition:** warnings &lt; 500 uppnått (494). Kvarvarande toppfiler är blockerade monoliter.

### Borttagna symboler (ej triviala)

| Symbol | Fil | Sökbevis | Varför oanvänd |
|--------|-----|----------|----------------|
| `fadeInContent`, `showSkeletonNow`, m.fl. | `skeleton.js` | `rg fadeInContent public` — endast definition | Legacy skeleton API efter refactor |
| `DISCLAIMER_DEFAULT`, `formatDelta`, `renderStartShortcuts` | `admin-start.js` | `rg formatDelta public/admin` — inga anrop | Död admin-start copy |
| `wlConfirmDelete`, `executeWlDelete` | `admin-waitlist.js` | HTML använder `showWaitlistDeleteModal` / `executeWaitlistDelete` | Superseded delete flow |
| `readStorage`, `updateToggleUi` | `app-view-mode.js` | `rg updateToggleUi` — inga anrop | Magic-only parent view; toggle borttagen |
| `copied` filter row | `library-standard.js` | Endast `notCopied` används i UI | Render använder full `standardActivities` lista |
| `homes` param | `custody-settings.js` | `bindCustomDaySelects` / `bindOverrides` bodies | Param aldrig läst |

**window exports (lint contract, inte borttagning):** `copyStandardActivity*`, `toggleSubSteps`, `confirmUnpublish`, `doFbSetup`, `loadNewsletterSubscribers`, `filterNewsletterSubs`, `sortNewsletterSubs`, `uploadAdminImage`, m.fl. — verifierat via `public/admin/index.html`, `library.html`, genererad admin HTML.

**Ej fixat (produkt / risk):** `custody-settings.js` `homeB` / `defaultHome` / `mapped` — beräknas men ej applicerat på select `selected`; kräver separat produktfix.

**Lint-disable:** inga nya filövergripande eller lokala disables i batch 2.

### Batch 2 commits

1. `chore(lint): resolve safe prefer-const warnings`
2. `chore(lint): remove unused admin helper state`
3. `chore(lint): remove unused landing and public helpers`
4. `chore(lint): sync lint-public budget 599 → 494` (budget JSON)

### Gates (batch 2)

| Kommando | Resultat |
|----------|----------|
| `npm run lint:public` | 494/494 OK |
| `npm run lint:public:sync-budget` | 599 → 494 (sänkt) |
| `npm run check:ambient-objects` | OK |
| `npm run css:build` | OK |
| `npm run lint` | exit 0 |
| `npm run check:routes` | OK |
| `npm run test:gate` | 281 pass, 0 fail |
| `npm run test:full` | (kör vid merge) |

**Batch 1 regression:** `window.loadUserStats` kvar i `admin-user-stats.js`; `check:ambient-objects` reproducerbar från generator.

### Rekommenderad batch 3

1. `prefer-const` / `no-var` i medelfiler med granskning: `daily-log.js`, `dashboard-card-actions.js`, `auth.js` (endast catch/`_` — ej session paths).
2. Domän-batch `reports.js`, `library.js` (31 w) med HTML/global-kontrakt.
3. Separat scope: `schedule.js`, `dashboard.js`, `family.js`, `admin-library.js`, `child-dashboard.js`.
4. Produktfix: custody select pre-fill (`homeB`, `defaultHome`, parent `mapped`).

**GO WITH FOLLOW-UP** — budget ratchetad, inga lint-regeländringar, blockerade monoliter kvar.
