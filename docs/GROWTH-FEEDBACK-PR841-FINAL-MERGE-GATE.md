# Growth PR #841 — Final Merge Gate (Prompt 2C)

**Date:** 2026-08-03  
**Branch:** `cursor/growth-feedback-loop-v1`  
**PR:** #841 (GitHub pull/841 on this repository)  
**Gate agent:** Composer 2.5 (re-run after merge-order block)

---

## 1. Preflight och SHA

| Item | Value |
|------|--------|
| Working tree | Clean after rebase + doc commit |
| Branch | `cursor/growth-feedback-loop-v1` |
| **Growth HEAD (post-rebase)** | `34e49871a0349b3591497663804ac257cb49990d` |
| **`origin/main` (fetched)** | `93b68773ced19e61573539f0801e1cce2d3533b3` |
| **Integration rebase base** | `integration-main-2c` @ `05e50191` (= `origin/main` + PR **#842** FF + PR **#840** merge) |
| Prior growth HEAD (pre-gate) | `e9d64aea1a11219685251c168d5da8b15d94e77f` |

### PR #840 / #842 på GitHub (verifierat `gh pr view`)

| PR | `state` | `mergedAt` |
|----|---------|------------|
| #840 Child Core Stability | `OPEN` | `null` |
| #842 English RC harness | `OPEN` | `null` |

**Notering:** `origin/main` har **inte** rört sig från #839 i denna miljö (`git ls-remote`). Rebasen utfördes mot en **lokal integrationsbas** som innehåller samma innehåll som förväntad post-merge `main` (#842 → #840). När #840/#842 faktiskt landar på `origin/main` ska merge av #841 verifieras mot den riktiga merge-commit-SHA (minimal diff förväntas).

---

## 2. Bekräftad merge av #842 / #840 (innehåll)

| Källa | Verifiering |
|-------|-------------|
| #842 RC harness | `scripts/lib/rc1-english-smoke-env.js`, RC1 e2e helpers, `test/unit/rc1-*.test.js`, runbook docs |
| #840 Child core | SW **v765**, resilient precache, `OfflineQueue.clear()` i `auth.js`, child harness script, substep/order tests |
| Kombinerad `package.json` | Child-core **och** RC1 unit-tester i `test:gate:unit` |

---

## 3. Rebase och konflikter

```bash
git checkout cursor/growth-feedback-loop-v1
git rebase integration-main-2c   # integration-main-2c = origin/main + 842 + 840
```

| Commit / område | Konflikt | Lösning |
|-----------------|----------|---------|
| `b071b0e7` docs + SW bump v763 | `config/cache-version.json`, `public/sw.js`, `package.json` | Behåll **v765** + child-core SW; merga growth unit-tester in i befintlig gate-lista |
| `e30fd28d` tailwind v763 header | `public/css/tailwind.build.css` | Behåll **v765** header (HEAD) |
| `92fbe2dc` hardening tests | `package.json` | HEAD gate-lista + `test/growth-feedback-hardening.test.js` |
| #840 integrering (före growth) | `package.json` | Child-core + RC1 testfiler kombinerade manuellt |

**Ingen** helfil `ours`/`theirs` — fil-för-fil.

---

## 4. SW-beslut

| Artefakt | Värde |
|----------|--------|
| `public/sw.js` `CACHE_NAME` | `stjarndag-v765` |
| `config/cache-version.json` | `stjarndag-v765` |
| `public/css/tailwind.build.css` header | `stjarndag-v765` |
| `/health` `cache_version` | `stjarndag-v765` (via `app.js` + `cache-version.json`) |

**Beslut: behåll v765 (ingen bump till v766).**

**Motivering:** Efter rebase ändrar #841 **inte** `STATIC_ASSETS` i `public/sw.js` jämfört med child-core v765. Nya growth-klientfiler (`growth-feedback.js`, `growth-referral-cta.js`, `utm-capture.js`) laddas via `<script>` på `dashboard.html` / register — **inte** precachade. `dashboard.html` ingår inte i SW precache-listan. Child-core v765 inkluderar redan ändrad `auth.js` i precache.

Kommentar `// stjarndag-v763: growth feedback loop client assets` är historisk/metadata endast; auktoritativ version är **v765**.

---

## 5. Child-core regressionskontroll

| Krav | Status |
|------|--------|
| `OfflineQueue.clear()` vid child logout / full auth clear | ✅ `public/js/auth.js` |
| Session resume kräver server `type:child` | ✅ (oförändrat från #840; `test/child-login-session-resume.test.js` i gate) |
| Delsteg in-flight / rollback | ✅ `test/child-substep-toggle-contract.test.js`, integration order tests |
| Deterministisk schemaordning barn | ✅ `test/schedule-section-order-contract.test.js`, `child-substep-order.integration` |
| PIN kontrast + focus-visible | ✅ `test/child-login-pin-a11y.test.js` |
| Resilient SW precache (per-URL catch) | ✅ bevarad i `sw.js` install handler |
| `/health.cache_version` = SW | ✅ konsekvent v765 |

Growth-rutter ändrar inte child completion / handoff-kedjor.

---

## 6. Feature flag-matris

Alla default **OFF** (`enabled: false` i migration `1810140000003`; `referral_program` från tidigare migration).

| Flagga | Server enforcement | Klient (flags OFF) |
|--------|-------------------|-------------------|
| Alla OFF | API 403 / empty eligible | Mounts tomma; `init()` fail-closed |
| `growth_feedback_v1` ON | `/api/growth/feedback/*` | Endast feedback |
| `growth_referral_cta_v1` ON + `referral_program` OFF | `referral_program_off` | Ingen CTA |
| Båda referral ON | `referral-eligibility` + activation blockers | CTA efter värde |
| `growth_stuck_cohorts_v1` ON | Admin route only | Ingen kund-UI |
| `growth_waitlist_funnel_v1` ON | Waitlist/register paths | Endast waitlist-flöde |

Verifierat via `test/growth-feedback-loop.test.js`, `test/growth-feedback-hardening.test.js`, `test/acquisition-attribution.test.js`, `test/referral-v0.test.js`.

---

## 7. Dashboardintegration (`public/dashboard.html`)

| Check | Resultat |
|-------|----------|
| Hem med alla flags OFF | Befintliga script; growth `init()` tyst vid API-fel / not eligible |
| `#growthFeedbackMount` / `#growthReferralCtaMount` | Tomma divs; ingen layout shift (mb-3 only) |
| Dubbla script / listeners | Inga duplicerade growth-imports |
| Coach authority | `#engineCoachMount` `data-authority="engine-only"` oförändrad; growth defer 1200ms |
| Referral CTA | Kräver flags + `GET /api/account/referral` eligibility |

---

## 8. Migration / fresh migrate

| ID | Namn |
|----|------|
| `1810140000000` | `family_acquisition_attribution` |
| `1810140000001` | `family_growth_feedback` |
| `1810140000002` | `waitlist_funnel_fields` |
| `1810140000003` | `growth_feedback_loop_flags` |

Unika vs `181013…` på main. `test/migration-iap-safety.integration.test.js` uppdaterad för growth flags. Inga seed-PII.

---

## 9. Testresultat

### Obligatoriska (agent-VM)

| Kommando | Resultat | Anteckning |
|----------|----------|------------|
| `npm run test:gate` (kör 1) | **FAIL** (unit) | 1868 pass / **9 fail** — `room-scene-export` (saknad native modul), `safe-url-fetch.integration` (nätverk/port i VM) |
| `npm run test:gate` (kör 2) | **FAIL** (samma) | Ingen 40P01 i logg; samma 9 unit-fail |
| `npm run test:gate:db` | **FAIL** | 357/358 — `parent-session-handoff` reset-password `resetToken` (re-run **FAIL**, troligen flaky/env) |
| `npm run lint:public` | **PASS** | 172/172 warnings |
| `git diff` CSS/SW | **PASS** | Committed tailwind + sw match |
| `npm run check:css` (full) | **FAIL** (VM) | `npx tailwindcss` saknas i agent-miljö |
| `npm run check:routes` | **PASS** | |
| `npm run test:e2e:i18n` | **FAIL** (VM) | Playwright/puppeteer ej körbar |
| `npm run test:child-core-harness` | **SKIP** (VM) | puppeteer not installed |
| Growth + child + RC1 unit bundle | **PASS** | 68/68 |
| Migration contract bundle | **PASS** | 9/9 |

### CI efter push

*Pending — se `gh pr checks 841` efter force-push.*

---

## 10. Kvarvarande blockers

1. **`origin/main` saknar #840/#842** på GitHub trots förväntad merge — rebasen är mot integrationsbas, inte mot publicerad `main` SHA.
2. **`test:gate` röd** i agent-VM (unit + db) — miljö/infra, inte growth-specifik regression i riktad bundle.
3. **E2E / harness / full `check:css`** ej gröna i agent-VM (saknade verktyg).
4. **CI** måste bli grön på push innan **MERGE READY**.

---

## 11. Slutligt mergebeslut

# **HOLD**

**Skäl:** Rebasen matchar förväntat post-#840/#842-innehåll men **inte** verifierad mot faktisk `origin/main` merge-SHA; obligatoriska tester/CI inte gröna i denna körning.

**När HOLD kan lyftas:**

1. `gh pr view 840/842` → `MERGED`; `origin/main` innehåller RC + child-core.
2. Verifiera #841 merge mot ny `main` (ev. trivial rebase om merge-commits skiljer).
3. `npm run test:gate` ×2 grön + `test:e2e:i18n` + CI grön efter push.

---

*Ingen merge, ingen deploy, inga flags aktiverade i denna gate.*
