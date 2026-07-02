# Hub Integration Sweep v2 — `main`

**Datum:** 2026-07-02  
**Agent:** Agent 2 — Parent Hub Finalization (v1-programmet)  
**Bas:** `main` @ `e4726d4` (SW `stjarndag-v465`)  
**Branch:** `cursor/v1-parent-hubs-qa-ef46`  
**Föregångare:** [hub-integration-sweep v1](hub-integration-sweep.md) (2026-07-01, `cursor/for-dig-10-10-2c04`)

---

## Sammanfattning

Alla **fyra förälder-hubbar** är implementerade och integrerade på `main`. Kontraktstester (`hem-10-vision`, `planning-hub-10-10`, `rewards-hub-10-10`, `family-hub-10-10`, `parent-hubs-platform-qa`) passerar. Plattforms-QA (`scripts/platform-qa-parent-hubs.mjs`) rapporterar **allPass: true** med navigation + iPhone SE fold.

**Verdict: Parent Hubs Complete** — med en **icke-blockerande notering** på Hem: coach/handoff-kort ligger under fold när barnrad + vecka fyller skärmen (Jenny-fråga 2 delvis besvarad via barnrad-status).

Inga merge-konfliktmarkörer. SW synkad (`v465`). v1-konflikter C5/C6 från v1-sweep är **lösta**.

---

## 1. Implementationsstatus per hubb

### Hem ✓

| Fil | Roll |
|-----|------|
| `public/js/dashboard-home-hub.js` | Priority ladder: undantag → status → coach → handoff → vecka |
| `public/js/home-readiness.js` | `isExceptionItem`, magic-filter, "Kräver åtgärd" |
| `public/js/dashboard.js` | Hub render/restore på view toggle |
| `public/js/engine-coach.js` | `shouldDeferToExceptions` |
| `public/js/engine-client.js` | `isReadinessBlockingCoach` |
| `public/js/journey-coach.js` | Defer till undantag på magic Hem |
| `public/js/activation-program-banner.js` | Suppressed på magic Hem |
| `public/js/dashboard-cta.js` | Medförälder-CTA suppressed på magic Hem |
| `public/js/dashboard-daily-summary.js` | Mount i `parentHubDailySummaryMount` |
| `public/css/dashboard-magic.css` | Readiness slot, hub layout |
| `test/hem-10-vision.test.js` | Kontraktstester för ladder |

### Planering ✓

| Fil | Roll |
|-----|------|
| `public/js/planning-hub.js` | Sektioner: Planera vardagen → Bygg innehåll → Övrigt; tom-state; boendeschema vid aktiv custody |
| `public/planning.html` | Hub-mount |
| `public/js/parent-magic-page-hubs.js` | Döljer stor hero på `planning` |
| `scripts/capture-planning-iphone-se.mjs` | iPhone SE fold-capture |
| `docs/qa/planering-iphone-se-fold-check.png` | Jenny-referensbild |
| `test/planning-hub-10-10.test.js` | Copy, prioritet, tom-state, custody-gate |

### Belöningar ✓ (v1: endast docs)

| Fil | Roll |
|-----|------|
| `public/js/rewards-hub.js` | Priority ladder: pending → hantera → stjärnöversikt → övrigt |
| `public/rewards.html` | `rewardsPendingMount` före `rewardsHubMount` |
| `public/js/pending-approvals.js` | Hub-läge: döljer tom pending |
| `scripts/capture-rewards-iphone-se.mjs` | iPhone SE fold-capture |
| `docs/qa/beloningar-jenny-iphone-se.png` | Jenny-screenshot |
| `test/rewards-hub-10-10.test.js` | Länkar, pending, inga skattkammaren-CTA |

### Familj ✓ (v1: legacy)

| Fil | Roll |
|-----|------|
| `public/js/family.js` | Barnkort → barnprofil; `openChildDrawer` redirect; hub-sammanfattning |
| `public/js/family-hub.js` | Pedagog-sektion via capabilities; magic chrome |
| `public/family.html` | Ladder: Barn → Vuxna → Pedagoger → secondary |
| `scripts/capture-family-iphone-se.mjs` | iPhone SE fold-capture |
| `docs/qa/familj-jenny-iphone-se.png` | Jenny-screenshot |
| `test/family-hub-10-10.test.js` | Ladder, inga settings på kort, barnprofil canonical |

### Gemensam plattform

| Fil | Status |
|-----|--------|
| `public/sw.js` + `config/cache-version.json` | `stjarndag-v465`, synkade |
| `public/js/nav-config.js` | Oförändrad i denna sweep — inga path-konflikter |
| `public/js/parent-magic-page-hubs.js` | Heroes dolda på planning, rewards, family |
| `public/js/parent-magic-router.js` | Soft-nav laddar hub-scripts |
| `test/parent-hubs-platform-qa.test.js` | Statiska gräns-tester |
| `scripts/platform-qa-parent-hubs.mjs` | E2E navigation + fold JSON |

---

## 2. v1-konflikter — status

| # | v1-beskrivning | v2-status |
|---|----------------|-----------|
| C1 | SW divergens main vs for-dig | **Löst** — main har v465 |
| C2 | SW-testassertion | **Löst** — tester matchar `cache-version.json` |
| C3 | `nav-config.js` overlap | **Ingen konflikt** |
| C4 | Readiness vs pending separation | **Korrekt** — undantag på Hem, pending på Belöningar |
| C5 | Belöningar länkade `/skattkammaren` | **Löst** — `library#rewards` + inline stjärnöversikt |
| C6 | Familj legacy settings/schema på kort | **Löst** — barnkort → `/family/child/:id`, inga settings-CTA |
| C7 | Tailwind header vs SW | Kosmetisk — ej blockerande |

Inga `<<<<<<<` i `public/js/`.

---

## 3. Testresultat

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false env -u RESEND_API_KEY npm run test:gate
# 91/91 pass (2026-07-02)
```

Hub-specifika kontrakt (direkt):

```bash
node --test test/hem-10-vision.test.js \
  test/planning-hub-10-10.test.js \
  test/rewards-hub-10-10.test.js \
  test/family-hub-10-10.test.js \
  test/parent-hubs-platform-qa.test.js
# 43/43 pass
```

| Suite | Antal |
|-------|-------|
| `hem-10-vision` | 10 |
| `planning-hub-10-10` | 7 |
| `rewards-hub-10-10` | 8 |
| `family-hub-10-10` | 10 |
| `parent-hubs-platform-qa` | 8 |

---

## 4. Plattforms-QA (E2E)

Körd: `NODE_ENV=development RATE_LIMIT_ENABLED=false node scripts/platform-qa-parent-hubs.mjs`  
Rapport: `/opt/cursor/artifacts/screenshots/parent-hubs-platform-qa.json`

| Flöde | Resultat |
|-------|----------|
| Hem → barnrad → barnprofil/daglig logg | **PASS** |
| Planering → bibliotek/schema/kalender → tillbaka | **PASS** (bibliotek back-knapp verifierad) |
| Belöningar → hantera/stjärnor → barnprofil `?tab=rewards` | **PASS** |
| Familj → barnkort → barnprofil → tillbaka | **PASS** |

---

## 5. Jenny-test (5 sek, iPhone SE 375×667, utan scroll)

Screenshots i `docs/qa/`:

| Hub | Bild | Tre frågor — svar |
|-----|------|-------------------|
| **Hem** | [hem-jenny-iphone-se.png](hem-jenny-iphone-se.png) | **Hur går det idag?** ✓ Barnrad med status/progress synlig above fold. **Vad ska jag göra nu?** ⚠️ Coach/handoff under fold (top ~990px); barnrad visar nästa aktivitet i statusraden → *delvis* inom 5 sek. **Var hittar jag barnet?** ✓ Barnrad + handoff-knapp finns (handoff kräver kort scroll). |
| **Planering** | [planering-iphone-se-fold-check.png](planering-iphone-se-fold-check.png) | **Vad kan jag göra här?** ✓ Sektioner Planera vardagen / Bygg innehåll. **Var går jag för schema?** ✓ Veckoschema + Kalender above fold. **Var skapar jag aktivitet?** ✓ Bibliotek under Bygg innehåll. |
| **Belöningar** | [beloningar-jenny-iphone-se.png](beloningar-jenny-iphone-se.png) | **Vad väntar på mig?** ✓ Pending dold när tom (korrekt); synlig när data finns. **Var hanterar jag belöningar?** ✓ Hantera belöningar → `/library#rewards`. **Hur ser barnets stjärnor ut?** ✓ Stjärnrad per barn above fold. |
| **Familj** | [familj-jenny-iphone-se.png](familj-jenny-iphone-se.png) | **Vem ingår?** ✓ Sammanfattning + barnkort. **Hur lägger jag till någon?** ✓ + Bjud in förälder above fold. **Var ser jag ett barns detaljer?** ✓ Barnkort → barnprofil. |

**Jenny-sammanfattning:** 3/4 hubbar **PASS** utan scroll. Hem **PASS med notering** — överväg kompaktare vecka/handoff i PR 2 endast om produkt vill strikt 5-sek coach synlighet.

---

## 6. Scope-verifiering (filterregler)

| Hub | Regel | Resultat |
|-----|-------|----------|
| Hem | Inte byggverktyg/dashboard | ✓ |
| Planering | Inte daglig status/coach | ✓ |
| Belöningar | Inte Skattkammaren som primär CTA | ✓ |
| Familj | Inte settings/push/GDPR/pren | ✓ |
| För dig | Endast tydliga länkar (planering tom-state) | ✓ |

### Begrepp (låst)

| Hub | Begrepp | Implementation |
|-----|---------|----------------|
| Hem | undantag | `isExceptionItem`, readiness API |
| Belöningar | pending | `pending-approvals.js`, `mountHub` |
| Familj | medlemmar | `family.js` parents/children |
| Planering | bygga innehåll / planera vardagen | `planning-hub.js` sektioner |

---

## 7. Kvarvarande risker (ej-blockerande)

1. **Hem coach under fold** — priority ladder följer vision; veckodiagram + barnrad kan trycka handoff nedåt på iPhone SE.
2. **Legacy drawer-HTML i `family.js`** — `openChildDrawer` redirectar till barnprofil; DOM kan städas senare.
3. **Custody-länk i Planering** — `CUSTODY_LINK` visas vid aktiv custody (Agent 1 scope); hub-QA verifierar gate, inte custody-UI.
4. **Rate limit vid QA** — headless capture kräver `RATE_LIMIT_ENABLED=false` eller färdigt QA-konto; dokumenterat i capture-scripts.

---

## 8. PR 2 — polish-kandidater (endast om sweep-fynd)

| # | Hub | Fynd | Förslag | Prioritet |
|---|-----|------|---------|-----------|
| P1 | Hem | Coach/handoff under fold | Kompaktare vecka eller handoff före vecka på små skärmar | Låg — barnrad-status täcker delvis |
| — | Övrigt | Inga a11y/copy-blockers hittade | Ingen kod i PR 2 om ej ny QA | — |

---

## Self-review

```
Self-review: PE ✓ Mobile ✓ CPO ✓ UX ✓ Game ✓ QA ✓ Security ✓ AISA ✓
Issues found and fixed: hub-integration-sweep v2 + Jenny screenshots (ingen kod)
POS governed by: hem/planering/beloningar/familj-vision.md, parent-hubs-index.md, 010-product, 040-parent-experience
```

---

## Återkörning

```bash
# Kontrakt
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false env -u RESEND_API_KEY npm run test:gate

# Screenshots (dev server + RATE_LIMIT_ENABLED=false)
NODE_ENV=development REQUIRE_EMAIL_VERIFICATION=false EMAIL_ENABLED=false RATE_LIMIT_ENABLED=false npm run dev
NODE_ENV=development node scripts/capture-planning-iphone-se.mjs
NODE_ENV=development node scripts/capture-rewards-iphone-se.mjs
NODE_ENV=development node scripts/capture-family-iphone-se.mjs
NODE_ENV=development node scripts/platform-qa-parent-hubs.mjs
```

---

*Nästa: PR 2 endast om polish P1 godkänns. Annars: Parent Hubs Complete → Agent 7 release gate.*
