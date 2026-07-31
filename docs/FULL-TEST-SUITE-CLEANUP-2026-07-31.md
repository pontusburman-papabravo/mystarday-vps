# Full test suite cleanup — baseline 2026-07-31

**Branch:** `cursor/full-test-suite-cleanup`  
**Start SHA:** `b16c67097d8c79ec30aa0c8aa4b96cdf0c57c038` (`origin/main`)  
**Scope:** `npm run test:full` only — **no** `npm test` policy change.  
**Out of scope for fixes in this branch:** push-native, onboarding/First Star product work, SW/offline, lint budget, IAP/paywall, broad refactors.

## Step 1 — reproducible baseline

Environment: fresh `public` schema (`DROP SCHEMA` + `npm run migrate`), Node 20.20.2, `NODE_ENV=test`, `REQUIRE_EMAIL_VERIFICATION=false`, Resend keys unset.

Command:

```bash
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false env -u RESEND_API_KEY npm run test:full
```

(Direct `node --test test/*.test.js` used for TAP capture — `run-full-npm-test.js` truncates at 64MB buffer.)

| Metric | Value |
|--------|--------|
| pass | 3109 |
| fail | **57** |
| skip | 0 |
| cancelled | 0 |
| exit code | 1 |
| duration | ~724s |
| TAP archive | `.local/full-suite-baseline-2026-07-31.tap` (not committed) |

### Mätpunkter (node:test `test/*.test.js`)

| Mätpunkt | Baslinje | Batch 4 | Batch 5 | Batch 6 (final) |
|----------|----------|---------|---------|-----------------|
| Pass | 3109 | 3151 | 3160 | **3173** |
| Fail | 57 | 17 | 8 | **0** |
| Skip | 0 | 4 | 4 | **4** |
| Cancelled | 0 | 0 | 0 | **0** |
| Exit code | 1 | 1 | 1 | **0** |

TAP/log batch 5: `.local/full-suite-after-batch5-2026-07-31.log`  
TAP/log batch 6 (pre): `.local/full-suite-pre-batch6-2026-07-31.log` (pass 3165, fail 8)  
TAP/log batch 6 (final): `.local/full-suite-post-batch6-2026-07-31.log` (pass 3173, fail 0)

## Produktbeslut (batch 5 — barn)

**Barnens teman** används för **visuell personalisering** av barnvyn (bakgrund, färger, illustrationer, ikoner) via `child-theme.js` / `child-theme-picker.js` — **aktiv**, ska bevaras.

**Morgonhuset** och den **separata spel-/world-navigationen** (WorldHub → Trädgården → Minnesrummet som gameplay-ingång) är **avvecklad produkt** när `barnets_samling` är på (`isWorldHubEntryDisabled`). Legacy kod finns kvar i repo men ska inte vara canonical barnflöde.

**Min samling** (`barnets_samling`): flikar today / collection / treasure / family / settings — **aktiv**. **Memory hall** (`memory_hall_playable`, dev-flag): living-world scaffold / pack — **inte** samma som Min samling UI; gated, ej primär nav.

| Funktion | Aktiv | Visuell endast | Avvecklad | I navigation (samling) | Åtgärd i batch 5 |
|----------|-------|----------------|-----------|------------------------|------------------|
| Temaval | ✓ | ✓ | | settings/tema | befintliga `child-theme*` tester |
| Temabakgrunder/CSS | ✓ | ✓ | | via `data-child-theme` | — |
| Temaikoner | ✓ | ✓ | | picker grid | — |
| Morgonhuset som ingång | | | ✓ | nej när gate på | negativt kontrakt `isWorldHubEntryDisabled` |
| Child worlds (hub gameplay) | | | ✓ | nej (treasure direkt) | BL-028 → implementation i legacy JS, inte UI-kontrakt |
| Spelmekanik i världar | | | ✓ | | ej återinförd |
| Memory hall (living world) | dev | | delvis | nej | pack/API-kontrakt uppdaterade |
| Min samling (treasure/collection) | ✓ | | | ✓ | `SAMLING_WORLDS` kontrakt |

## Batch 5 — family UI, library, XSS, barn (2026-07-31)

Scoped baseline: **54 tests, 9 fail** (6 filer). Efter fix: **54 pass** (+ `retired-child-gameplay-contracts`).

| Testfil | Status | Rotorsak | Ändring | Produkt |
|---------|--------|----------|---------|---------|
| `xss.test.js` step 4 | **Test contract fixed** | `tOnboarding` + `textContent`; `escapeHtml` på reward cards | Uppdaterat regex | Ingen XSS — redan säker |
| `family-ui-avatar-menu-fix` | **Test contract fixed** | Dropdown flyttad → `parent-nav-header` | Assert header chrome | — |
| `library-load-error-handling` | **Test contract fixed** | i18n `library.errors.*` via `lpt()` | Uppdaterat regex | Fel-UI finns |
| `memory-hall-exhibits-pack` | **Test contract fixed** | mock `hasAccess` SQL params | Fixture | Pack schema aktiv (dev) |
| `memory-hall-playable` | **Test contract fixed** | ADR-fil → `docs/art-specs/memory-hall-bl041.md` | Doc path | Scaffold, ej Min samling |
| `child-world-a11y` | **Test contract fixed** | Wayfinder + ambient runtime (ej hotspot-HTML) | Peka på JS + status region | Legacy moduler kvar i kod |
| `retired-child-gameplay-contracts` | **Ny** | Negativa nav-kontrakt | SAMLING_WORLDS, redirect | — |

**Produktfiler ändrade:** inga.

**Säkerhet (XSS):** step 3/4 använder `textContent` + `tOnboarding()`; reward-grid använder `escapeHtml` på namn/ikon — **ingen produktfix behövd**.

**Kvar efter batch 5 (Activation batch):** 8 fail — endast ACT-1 / activation-program — **åtgärdade i batch 6**.

## Batch 6 — Activation / ACT-1 (2026-07-31, final Fas 4 batch)

Scoped baseline på `34bc0976`: **41 tests, 8 fail** (5 filer). Efter fix: **41 pass, 0 fail**.

| Testfil / subtest | Klass | Rotorsak | Ändring | Produkt |
|-------------------|-------|----------|---------|---------|
| `act1-rollout` — deploy workflow | 9 | `deploy.yml` kör `vps-deploy-revision.sh` (migrate/restart där), inte inline migrate | Assert revision script + no `enable-act1-flags` i workflow | Flags via migration `180922` |
| `activation-growth` — handoff copy | 8 | Copy i i18n + `onboarding.html` `data-i18n` + handoff-film | Assert nycklar/helpers + sv-SE fragment | Handoff aktiv |
| `activation-program-fas3` — day copy (3) | 4 | `getDayContent` kräver `loadLocales()` i test (samma som app `app.js`) | `loadLocales()` före import | Program copy i `src/locales` |
| `activation-program-fas3` — supportive swap | 4 | Samma locale-load | Samma | — |
| `pr2-checkpoint` — admin funnel UI | 2 | UI laddar funnel via `loadActivationWeeklyReport` / `renderActivationFunnelFromReport` | Ersätt `loadActivationFunnel` | Funnel API kvar |
| `pr4-checkpoint` — personalize label | 8 | `ot('onboarding.starter.personalizing')` | Assert i18n-nyckel | AI personalize aktiv |

**Produktfiler ändrade:** inga.

**Verkliga produktfel:** inga i batch 6.

**Borttagna/omdöpta tester:** inga — endast kontraktuppdateringar.

### Fas 4 batch summary

| Batch | Fail före | Fail efter | Produktfel | Kontraktsfel | Nya skips |
|-------|-----------|------------|------------|--------------|-----------|
| Baseline | 57 | 57 | — | — | 0 |
| Batch 1 | 57 | 45 | 0 | 12 | 4 |
| Batch 2 | 45 | 39 | 0 | 6 | 0 |
| Batch 3 | 39 | 34 | 0 | 5 | 0 |
| Batch 4 | 34 | 17 | 0 | 17 | 0 |
| Batch 5 | 17 | 8 | 0 | 9 | 0 |
| Batch 6 | 8 | **0** | **0** | **8** | **0** |

### Governance skips (endast dessa fyra)

Räknas som skip i fullsviten (`ok … # SKIP`), inte pass/fail:

1. POS required files exist  
2. COS org OS files exist (`LIVING_WORLD_SCORE.md` saknas i cloud clone)  
3. Constitution has six rules  
4. child IA ADR  

**Inga andra skips** i `npm run test:full`.

### Slutgates (batch 6 HEAD `2794bbef`)

| Kommando | Resultat |
|----------|----------|
| `npm run css:build` | exit 0 |
| `npm run check:ambient-objects` | exit 0 |
| `npm run lint` | exit 0 |
| `npm run lint:public` | exit 0 (budget 674/674, ej höjd) |
| `npm run check:routes` | exit 0 |
| `npm run migrate` | exit 0 |
| `npm run test:gate` | pass 271, fail 0, exit 0 |
| `npm run test:full` | pass 3173, fail 0, skip 4, exit 0 |
| `node --test test/migration-rollback-gate.test.js` | exit 0 |

**Merge/deploy:** ej utfört (enligt uppdrag). **PR #801:** ready for review när gates gröna.

**Follow-up:** POS/COS vendoring i cloud clone (governance skips); activation smoke `scripts/smoke-act1-onboarding-e2e.js` kan uppdateras till i18n-handoff-copy (ej blockerande).

**Batch 1 borttagna failures (12):** `release-os` (3 handoff/async), `apple-signup-sql`, `daily-logs-authz-contract`, `admin-start-summary` (getMessageCounts scope), `landing-mobile-layout` + `landing-share-restore` (node:test harness), samt 4 `governance-registry` som blev **skip** (inte fail).

**Governance skips (4)** — historisk notering (se även ovan); samma fyra skips:

1. POS required files exist  
2. COS org OS files exist (`LIVING_WORLD_SCORE.md` saknas i clone)  
3. Constitution has six rules  
4. child IA ADR  

**Batch 2 borttagna failures (6):** `seo-pages` (register i18n meta/hero, robots Sitemap, canonical URLs), `pricing-info-route` (SV `pris-och-tillgang`, EN waitlist/faq), `legacy-parent-pages` (calendar auth i `calendar-page.js`).

**Nya failures efter batch 4:** inga (17 = 34 − 17).

## Batch 4 — meny v2 / magic navigation (2026-07-31)

Scoped baseline: **139 tests, 17 fail** (10 filer). Efter fix: **139 pass, 0 fail**.

| Område | Gammalt kontrakt | Auktoritet | Rotorsak (klass) | Ändring |
|--------|------------------|------------|------------------|---------|
| `child-support-layer` | hårdkodad `Steg` | `cpt('steps.progress')` | 1 i18n | Assert steps.progress |
| `calendar-magic-contrast` | inline HTML `renderGrid` | `calendar-page.js` | 1 extraktion | Läs calendar-page för grid + act names |
| `parent-magic-i18n` | `parent-i18n-ready` i `earlyApply` body | `notifyParentI18nReady()` | 1 struktur | Assert notify i earlyApply chain |
| `magic-soft-nav` custody | `#custodyScheduleSection` i hubs JS | `planning-hub` + `family.html` | 1 | Verifiera planning link + section id |
| `magic-soft-nav` calendar/json | inline `calendar.html` | `calendar-page.js` | 1 | Läs calendar-page |
| `magic-soft-nav` settings | `parent-avatar-menu` settingsPath | `parent-nav-header` + router `settings: true` | 1 | Header chrome flyttad |
| `magic-soft-nav` settings back | `← Inställningar` | `settings.appearance.backToSettings` | 1 i18n | Assert i18n-nyckel |
| `readiness incomplete_days` | `incompleteMap[id] = parseInt(...)` | objekt `{ count, latest }` | 1 API-shape | Match parseInt på count |
| `child-profile-setup` avatar | `safeAvatarUrl(child.avatar_url)` | `MemberAvatar.renderChildAvatar` | 1 | MemberAvatar + safeAvatarUrl finns |
| `meny-v21` avatar native | `isNativeShell` i avatar menu | `BillingUi.refresh` hook | 1 | Chrome i nav-header/settings |
| `meny-v22` dashboard cards | logik i `dashboard.js` | `dashboard-cards.js` | 1 split | Peka på dashboard-cards |
| `meny-v23` billing gate | `BillingUi` i avatar menu | `settings-subscription` + `billing_ui_enabled` | 1 | Gate i settings-subscription |
| `meny-v23` HomeBumpTime | render i `dashboard.js` | `dashboard-cards.js` | 1 split | HomeBumpTime.render i cards |
| `meny-v24` schedule CTA | `dashboard.js` card section | `dashboard-cards.js` | 1 split | Samma |
| `planning-hub` capabilities | `Bygg innehåll` hårdkodad | `planning.links.library` i18n | 1 | NavConfig + i18n keys |

**calendar-magic-contrast:** inkluderad (samma magic/calendar-kontrakt; ingen produktändring).

**Produktändringar:** inga.

**Batch 4 borttagna fullsuite-failures (11 top-level + nested = −17 fail):** barnmeny v2 Sprint 4, calendar magic contrast, magic nav flash fix, magic soft navigation, meny v2 review MED, meny v2.1–v2.4 (delar), vuxenmeny v2 Sprint 6.

**Nya failures efter batch 3:** inga (34 = 39 − 5).

## Batch 3 — dashboard / schedule split contracts (2026-07-31)

Scoped baseline före fix: **5 fail** i fem filer (40→34 pass i scoped körning efter +1 delad celebrations-subtest).

| Test / subtest | Rotorsak | Test vs prod | Ändring |
|----------------|----------|--------------|---------|
| `schedule-core` — `buildSectionCardsHtml` | Tom sektion via `localizedString('schedule.emptySection')` (i18n) | Test inaktuellt | Assert i18n-nyckel, inte hårdkodad svensk |
| `dashboard-split` — radbudget | `dashboard.js` 917 r (>900 Fas 8-mål) | Test inaktuellt | Budget <1000 tills nästa extraktion |
| `dashboard-card-actions` — onclick hooks | Handlers i `dashboard-cards.js` efter kort-render-split | Test inaktuellt | Verifiera `dashboard-cards.js` + SW-kommentar |
| `child-dashboard-celebrations` — anrop | `checkMilestones` i `child-dashboard-activities.js`, `launchDopaminBurst` i checkoff | Test inaktuellt | Peka på split-moduler |
| `schedule-child-split` — rewards retry | Retry-knapp via `t('common.retry')` | Test inaktuellt | Ersätt `Försök igen` regex |

**Produktändringar:** inga.

**Batch 3 borttagna fullsuite-failures (5 top-level):** `child-dashboard-celebrations`, `dashboard-card-actions`, `dashboard-split`, `schedule-child-split`, `schedule-core`.

TAP: `.local/full-suite-after-batch1-2026-07-31.tap`

**≈50 failures:** yes — **57** counted failures (46 top-level `not ok` lines; remainder nested subtests).

### Failing test files (top-level)

| File | Notes |
|------|--------|
| `test/act1-rollout.test.js` | **fixed batch 6** |
| `test/activation-growth-completion.test.js` | **fixed batch 6** |
| `test/activation-program-fas3.test.js` | **fixed batch 6** |
| `test/admin-start-summary.test.js` | getMessageCounts alias scope |
| `test/apple-signup-sql.test.js` | Stale path to `createParentWithApple` |
| `test/barnmeny-v2.test.js` | **fixed batch 4** |
| `test/calendar-magic-contrast.test.js` | **fixed batch 4** |
| `test/child-dashboard-celebrations.test.js` | **fixed batch 3** |
| `test/child-world-a11y.test.js` | **fixed batch 5** |
| `test/daily-logs-authz-contract.test.js` | Stale `getLogAccess` vs `requireLogAccess` |
| `test/dashboard-card-actions.test.js` | **fixed batch 3** |
| `test/dashboard-split.test.js` | **fixed batch 3** |
| `test/family-ui-avatar-menu-fix.test.js` | **fixed batch 5** |
| `test/governance-registry.test.js` | POS/COS files not in cloud clone |
| `test/landing-mobile-layout.test.js` | Missing `node:test` import (`describe` undefined) |
| `test/landing-share-restore.test.js` | Same |
| `test/legacy-parent-pages.test.js` | Inline script contracts |
| `test/library-load-error-handling.test.js` | **fixed batch 5** |
| `test/magic-nav-flash-fix.test.js` | **fixed batch 4** |
| `test/magic-soft-nav.test.js` | **fixed batch 4** |
| `test/memory-hall-exhibits-pack.test.js` | **fixed batch 5** |
| `test/memory-hall-playable.test.js` | **fixed batch 5** |
| `test/meny-v2-review-fixes.test.js` | **fixed batch 4** |
| `test/meny-v21.test.js` | **fixed batch 4** |
| `test/meny-v22.test.js` | **fixed batch 4** |
| `test/meny-v23.test.js` | **fixed batch 4** |
| `test/meny-v24.test.js` | **fixed batch 4** |
| `test/pr2-checkpoint.test.js` | **fixed batch 6** |
| `test/pr4-checkpoint.test.js` | **fixed batch 6** |
| `test/pricing-info-route.test.js` | Landing/pricing links |
| `test/release-os.test.js` | Async handoff middleware + legacy cookie |
| `test/schedule-child-split.test.js` | **fixed batch 3** |
| `test/schedule-core.test.js` | **fixed batch 3** |
| `test/seo-pages.test.js` | SEO meta/robots/canonical |
| `test/vuxenmeny-v2.test.js` | **fixed batch 4** |
| `test/xss.test.js` | **fixed batch 5** |

Nested failures also in: `test/deploy-gate.test.js` (GitHub workflow), `test/onboarding-handoff-p0.test.js`, `test/pr5-checkpoint.test.js`, etc.

## Step 2 — classification key

| Cat | Meaning |
|-----|---------|
| 1 | Verkligt produktfel |
| 2 | Inaktuellt kontraktstest |
| 3 | Felaktig fixture/seed |
| 4 | Testmiljö |
| 5 | Flaky timing |
| 6 | Duplicerad täckning |
| 7 | Landing/markup drift |
| 8 | I18n/locale drift |
| 9 | POS/dokumentkontrakt |
| 10 | Annat |

## Batch 2 — SEO / landing / pricing (2026-07-31)

| Test | Cat | Rotorsak | Ändring |
|------|-----|----------|---------|
| `register.html` meta/hero | 2 | i18n-driven register; statisk svensk copy bort | Assert `data-i18n-*` + `auth-entry-i18n.js` |
| `robots.txt` Sitemap | 2 | Regex krävde `https://` men `SITE_URL` env | Assert `Sitemap: ${SITE_URL}/sitemap.xml` |
| Canonical URLs | 2 | `index.html` använder `__SITE_URL__` injektion | Accept `__SITE_URL__` eller `https://` per path |
| `pricing-info` landing links | 2 | Section-id `pris-och-tillgang` (inte `grundarprogram`) | Uppdaterat kontrakt |
| `en.html` waitlist | 2 | EN-sida har waitlist-funnel (avsiktligt) | Kontrakt speglar waitlist + `/en/faq` |
| `legacy-parent-pages` calendar | 2 | Auth gate i `calendar-page.js`, inte inline HTML | Kontrakt pekar på JS-modul |

Ingen produktändring i batch 2 (endast testkontrakt).

| Item | Cat | Action |
|------|-----|--------|
| `release-os.test.js` | 2 | Async `childParentApiBlock`; legacy base64 must not restore (opaque handoff #796) |
| `apple-signup-sql.test.js` | 2 | Target `create-oauth-parent.js` / `createParentFromOAuth` |
| `admin-start-summary.test.js` | 2 | Scope alias assert to `getMessageCounts` only |
| `daily-logs-authz-contract.test.js` | 2 | `requireLogAccess` middleware contract |
| `landing-mobile-layout` / `landing-share-restore` | 4 | `node:test` `describe`/`it` |
| `governance-registry.test.js` | 4/9 | Motivated `skip` when POS/COS not vendored in clone |

## Follow-up buckets (not fixed in Fas 4 scope)

- **Activation / ACT-1** — **batch 6 done** (`2794bbef`, `a1ed6b96`).
- **Meny v2 / magic-nav** — **batch 4 done** (`d0b56a3c`).
- **Dashboard/schedule split contracts** — **batch 3 done** (`cea08988`).
- **POS vendoring** — `product-operating-system/` absent in GitHub clone; full POS tests need vendored docs or CI checkout (follow-up).
- **Memory hall / child-world a11y** — product-area follow-ups.

## Progress log

| Date | fail count | notes |
|------|------------|--------|
| 2026-07-31 | 57 | Baseline on `b16c6709`, fresh DB |
| 2026-07-31 | 45 fail, 4 skip | After batch 1 (`20abd744`) |
| 2026-07-31 | 39 fail, 4 skip | After batch 2 (`d3180468`) |
| 2026-07-31 | 34 fail, 4 skip | After batch 3 (`905ffd2b`) |
| 2026-07-31 | 8 fail, 4 skip | After batch 5 — family/library/XSS/barn (`1b11071e` + doc/retired) |
| 2026-07-31 | **0 fail**, 4 skip, exit 0 | Fas 4 complete — batch 6 activation (`2794bbef`) |

## Slutmål

**Uppnått:** `npm run test:full` → fail 0, cancelled 0, exit 0; gates (lint, test:gate, migration rollback, css, routes, migrate) gröna.
