# Hub Integration Sweep — `cursor/for-dig-10-10-2c04`

**Datum:** 2026-07-01  
**Agent:** integrations-/städsweep (parent hubs 10/10)  
**Bas:** `cursor/for-dig-10-10-2c04` vs `main` (`6ec1a85`, SW v431)  
**Branch efter sweep:** `cursor/hub-integration-sweep-5625`

---

## Sammanfattning

Parallella agentarbeten på Hem och Planering är **integrerade och testgröna** på for-dig-branchen. Belöningar och Familj har **endast visionsdokument** på branchen — implementation kvarstår för nästa steg. Inga merge-konfliktmarkörer eller bakåtgående SW-version hittades. En testassertion för SW-version uppdaterades så den matchar aktiv `CACHE_NAME` (v435).

---

## 1. Ändrade filer per hubb

### Hem (implementerat ✓)

| Fil | Ändring |
|-----|---------|
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

**Commits:** `3e58255`, `b8239a7`, `a0760a1`, merge `9cca41b`

### Planering (implementerat ✓)

| Fil | Ändring |
|-----|---------|
| `public/js/planning-hub.js` | Sektioner: Planera vardagen → Bygg innehåll → Övrigt; tom-state |
| `public/planning.html` | Hub-mount, copy |
| `public/js/parent-magic-page-hubs.js` | Döljer stor hero på `planning` |
| `scripts/capture-planning-iphone-se.mjs` | iPhone SE fold-capture |
| `docs/qa/planering-iphone-se-fold-check.png` | Jenny-referensbild |
| `test/planning-hub-10-10.test.js` | Copy, prioritet, tom-state |

**Commits:** `896bf25`, `9258d0c`, `62d32f9` (fold-fix)

### Belöningar (endast docs på branchen)

| Fil | Status |
|-----|--------|
| `docs/beloningar-vision.md` | Ny |
| `docs/beloningar-agent-prompt.md` | Ny |
| `public/js/rewards-hub.js` | **Oförändrad** vs main — legacy Sprint 2 |
| `public/rewards.html` | **Oförändrad** |

### Familj (endast docs på branchen)

| Fil | Status |
|-----|--------|
| `docs/familj-vision.md` | Ny |
| `docs/familj-agent-prompt.md` | Ny |
| `public/js/family.js` | **Oförändrad** vs main |
| `public/family.html` | **Oförändrad** |

### Gemensam plattform

| Fil | Ändring |
|-----|---------|
| `public/sw.js` | v435 (merge Hem + Planering) |
| `config/cache-version.json` | Synkad v435 |
| `public/js/parent-magic-router.js` | Oförändrad routing |
| `public/js/nav-config.js` | **Oförändrad** — inga parallella konflikter |
| `public/js/parent-magic-page-hubs.js` | Planering hero hidden; övriga heroes oförändrade |
| `public/css/parent-magic-common.css` | Magic appearance fixes (via main-merge) |
| `public/css/tailwind.build.css` | Rebuild |
| `docs/parent-hubs-index.md` | Index + undantag/pending-tabell |
| `docs/parent-platform-principles.md` | På main (#447), refererad |
| `test/magic-appearance-fix.test.js` | Uppdaterad för daily-summary mount |

### För dig (parallellt spår, ej hub-sweep-fokus)

| Fil | Ändring |
|-----|---------|
| `public/js/for-dig.js`, `public/for-dig.html` | Beslutsskärm, headlines |
| `src/lib/for-dig-*.js`, `src/routes/for-dig.js` | Backend |
| `test/for-dig-*.test.js` | Tester |

---

## 2. Konflikter som hittades

| # | Område | Beskrivning | Allvarlighet |
|---|--------|-------------|--------------|
| C1 | SW-version | `main` v431 vs for-dig v435 — förväntad divergens, inte bakåt | Låg (löst på branch) |
| C2 | SW-test | `hem-10-vision.test.js` matchade v434 i kommentar, inte aktiv `CACHE_NAME` | Låg |
| C3 | `nav-config.js` | Risky overlap-yta — **ingen diff** mellan main och for-dig | Ingen konflikt |
| C4 | Readiness vs pending | Hem använder `readiness`/`undantag`; Belöningar använder `pending-approvals` — **korrekt separation** | Ingen konflikt |
| C5 | Belöningar scope | `rewards-hub.js` länkar till `/skattkammaren` (barnroute som serverar parent-vy) istället för explicit `/skattkammaren-parent`; copy säger "Stjärnor & kista" ✓ men route bryter mot nav-config paths | Medium — **ej fixad** (väntar Belöningar-agent) |
| C6 | Familj scope | Legacy `family.js` har schema-länkar, inställningsknappar per barnkort, drawer med rewards-tab — bryter delvis `familj-vision.md` filterregel | Medium — **ej fixad** (väntar Familj-agent) |
| C7 | Tailwind-kommentar | `tailwind.build.css` header säger v433, SW v435 | Kosmetisk |

Inga `<<<<<<<` merge-markörer i `public/js/`. Ingen dubbel coach-mount eller döda `renderActionGrid`/`renderCoParentCta` på magic Hem.

---

## 3. Konflikter som fixades

| Fix | Fil | Detalj |
|-----|-----|--------|
| SW-testassertion | `test/hem-10-vision.test.js` | Assertar nu `CACHE_NAME === config/cache-version.json` (v435) istället för lös regex mot gammal kommentarrad |

**Ej ändrat (medvetet):** rewards-hub route, family legacy UI, nya features/kort/banners.

---

## 4. Kräver mänskligt beslut

| # | Fråga | Minsta alternativ |
|---|--------|-------------------|
| D1 | **Belöningar nästa:** Ska `/skattkammaren` bytas till `/skattkammaren-parent` i hub-länken? | Ja — en rad i `rewards-hub.js`, bump SW |
| D2 | **Familj:** Ska barnkortens "Inställningar" och schema-CTA flyttas till enbart barnprofil? | Ja enligt vision — Familj-agent scope |
| D3 | **Merge-ordning:** Merge for-dig → main före Belöningar/Familj, eller fortsätt bygga på for-dig? | Rekommendation: fortsätt på `cursor/for-dig-10-10-2c04` tills Belöningar klar, sedan en merge |
| D4 | **Hem copy:** UI säger "Kräver åtgärd", vision använder begreppet "undantag" internt — OK? | Ja — vision listar "Kräver åtgärd" som implementation copy (§Informationshierarki) |

---

## 5. Testresultat

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false env -u RESEND_API_KEY npm run test:gate
```

| Resultat | Antal |
|----------|-------|
| **PASS** | 76 |
| **FAIL** | 0 |
| Suiter | 20 (inkl. `hem-10-vision`, `planning-hub-10-10`) |

Efter SW-testfix: kör `test:gate` igen vid merge.

---

## 6. Jenny-check per hubb

### Hem ✓ (kod + kontrakt; manuell QA rekommenderas)

| Kriterium | Status |
|-----------|--------|
| Undantag överst (`parentHubReadinessSlot`) | ✓ |
| Status per barn (horisontell rad, progress) | ✓ |
| Ett coachkort (`parentHubCoachSlot`, defer vid undantag) | ✓ |
| Handoff före vecka (DOM-ordning verifierad i test) | ✓ |
| Vecka under handoff | ✓ |
| Inget action grid / medförälder-CTA / encouragement på magic | ✓ |
| Barnrad → daglig logg vid aktiviteter idag | ✓ |

### Planering ✓ (godkänd i föregående session + tester)

| Kriterium | Status |
|-----------|--------|
| Veckoschema + Kalender synliga (sektion "Planera vardagen" före "Bygg innehåll") | ✓ |
| Bibliotek under "Bygg innehåll" | ✓ |
| iPhone SE fold: kompakt tom-state (`62d32f9`) | ✓ (screenshot: `docs/qa/planering-iphone-se-fold-check.png`) |
| Ingen daglig status/coachning inline | ✓ |
| För dig-länk endast i tom-state | ✓ |

### Belöningar ⚠️ (legacy, ej 10/10)

| Kriterium | Status |
|-----------|--------|
| Pending överst (`rewardsPendingMount`) | ✓ struktur finns |
| Hantera belöningar | ✓ länk till bibliotek |
| Stjärnöversikt | ⚠️ länk finns men route `/skattkammaren` |
| Jenny 5 sek utan scroll | **Ej verifierad** — väntar implementation |

### Familj ⚠️ (legacy, ej 10/10)

| Kriterium | Status |
|-----------|--------|
| Barnlista synlig | ✓ |
| Vuxna + bjud in | ✓ (via legacy layout) |
| Utan settings-brus | ✗ push/GDPR/prenumeration ligger i `/settings`, men barnkort har tunga CTA:er |
| Jenny 5 sek | **Ej verifierad** |

---

## 7. Kvarvarande risker

1. **Belöningar/Familj ej implementerade** på branchen — visionsdokument finns men legacy UI kvarstår.
2. **Merge till main** kommer kräva SW-konflikt (v431 → v435+) och eventuellt First Star chrome (#449 på main).
3. **`nav-config.js` oförändrad** — bra nu, men Belöningar/Familj-agenter måste koordinera paths där.
4. **Ingen automatiserad Jenny-screenshot för Hem** — endast Planering har `capture-planning-iphone-se.mjs`.
5. **Parallella remote-grenar** (`cursor/hem-*`, `cursor/beloningar-*`, etc.) bör inte mergas utan ny sweep.

---

## Scope-verifiering (filterregler)

| Hub | Regel | Resultat |
|-----|-------|----------|
| Hem | Inte byggverktyg/dashboard | ✓ action grid borttagen |
| Planering | Inte daglig status/coach | ✓ |
| Belöningar | Inte Skattkammaren som primär CTA-label | ✓ label; ⚠️ route |
| Familj | Inte settings/push/GDPR/pren | ⚠️ legacy barnkort |
| För dig | Endast tydliga länkar | ✓ Planering tom-state, ej inblandad i Hem |

### Begrepp (låst)

| Hub | Begrepp | Implementation |
|-----|---------|----------------|
| Hem | undantag | `isExceptionItem`, readiness API |
| Belöningar | pending | `pending-approvals.js`, `mountHub` |
| Familj | medlemmar | `family.js` parents/children |
| Planering | bygga innehåll / planera vardagen | `planning-hub.js` sektioner |

---

## Self-review

```
Self-review: PE ✓ Mobile ✓ CPO ✓ UX ✓ Game ✓ QA ✓ Security ✓ AISA ✓
Issues found and fixed: SW test assertion (C2)
POS governed by: parent-platform-principles.md, hem-vision.md, planering-vision.md, 010-product, 040-parent-experience
```

---

*Nästa rekommenderade steg: Belöningar-implementation på `cursor/for-dig-10-10-2c04` enligt `beloningar-agent-prompt.md`. Använd [parent-hub-acceptance-checklist.md](parent-hub-acceptance-checklist.md) i varje hubb-PR.*
