# Agent 2 — Parent Hub Finalization

**Kopiera hela filen till en ny Cursor-agent.**  
**Program:** [v1-completion-program.md](../v1-completion-program.md)  
**Våg:** 1 — parallellt med Agent 1  
**Branch-prefix:** `cursor/v1-parent-hubs-` + suffix `-ef46`

---

## Ditt mål

Alla **förälder-hubs 10/10** med dokumenterad QA — **Parent Hubs Complete**.

Detta är till ~70 % **QA och dokumentation**, inte ny arkitektur. Kod och kontraktstester finns redan på `main`.

---

## Nuvarande läge (repo)

| Hub | Kod | Tester | Manuell QA |
|-----|-----|--------|------------|
| Hem | `dashboard-home-hub.js`, priority ladder | `hem-10-vision.test.js` | Saknas screenshot |
| Planering | `planning-hub.js` | `planning-hub-10-10.test.js` | iPhone SE fold finns |
| Belöningar | `rewards-hub.js` | `rewards-hub-10-10.test.js` | Jenny ej verifierad |
| Familj | `family-hub.js`, `family.html` | `family-hub-10-10.test.js` | Jenny ej verifierad |

**OBS:** `docs/qa/hub-integration-sweep.md` är **inaktuell** (skriven före Belöningar/Familj-merge). Uppdatera som första leverans.

---

## Fil-ägarskap

```
public/js/dashboard-home-hub.js
public/js/home-readiness.js
public/js/planning-hub.js
public/js/rewards-hub.js
public/js/family-hub.js
public/js/family.js          (endast copy/a11y — inga strukturella regressioner)
public/family.html, public/planning.html, public/rewards.html
public/css/dashboard-magic.css
docs/qa/hub-integration-sweep.md
docs/qa/*.png                (nya screenshots)
test/hem-10-vision.test.js
test/planning-hub-10-10.test.js
test/rewards-hub-10-10.test.js
test/family-hub-10-10.test.js
```

**SW-bump:** Endast om du ändrar statiska assets; annars låt Agent 1/6 äga bump.

---

## PR-sekvens (2 PR)

### PR 1 — Integration sweep v2 + screenshots

- Uppdatera `docs/qa/hub-integration-sweep.md` mot aktuell `main`
- Jenny-test per hub: dokumentera svar på tre frågor (se `parent-hubs-index.md`)
- Screenshot QA:
  - Hem: `docs/qa/hem-jenny-iphone-se.png` (skapa capture-script om saknas, mönster: `scripts/capture-planning-iphone-se.mjs`)
  - Planering: verifiera befintlig fold-check
  - Belöningar + Familj: nya screenshots
- Idfylla `docs/qa/parent-hub-acceptance-checklist.md` per hub i PR-body

### PR 2 — Polish från sweep

- Endast fixar som **hittades i QA** (a11y, copy, kontrast)
- Inga nya features eller hubb-scope-utvidgning
- Håll filterregel per `*-vision.md`

---

## Jenny-test (per hub, 5 sek utan scroll)

| Hub | Tre frågor |
|-----|------------|
| Hem | Hur går det idag? · Vad ska jag göra nu? · Var hittar jag barnet? |
| Planering | Vad kan jag göra här? · Var går jag för schema? · Var skapar jag aktivitet? |
| Belöningar | Vad väntar på mig? · Var hanterar jag belöningar? · Hur ser barnets stjärnor ut? |
| Familj | Vem ingår? · Hur lägger jag till någon? · Var ser jag ett barns detaljer? |

Detaljer: respektive `docs/*-vision.md`.

---

## Definition of Done

- [ ] `hub-integration-sweep.md` v2 reflekterar `main`
- [ ] Alla fyra hubbar: Jenny-test dokumenterat + screenshot
- [ ] Acceptance checklist ifylld per hub i PR
- [ ] Inga öppna scope-brott (Familj: inga inställningsknappar på barnkort — verifiera `family-hub-10-10.test.js`)
- [ ] Belöningar: länk till `/library#rewards`, inte `/skattkammaren` (redan i test)
- [ ] `npm run test:gate` grön
- [ ] Agent 7 sign-off (`Agent 7: ✓ parent smoke`)

---

## Test

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
# test:gate — full env prefix in root AGENTS.md and .cursor/rules/130-testing.mdc
npm run test:gate
```

---

## Förbjudet

- Ny coach-yta på Hem (PA-01)
- Daglig status i Planering
- Ändra `nav-config.js` (Agent 3)
- Custody-filer (Agent 1)
- Onboarding (Agent 5)

---

## Self-review

```
Self-review: PE ✓ Mobile ✓ CPO ✓ UX ✓ Game ✓ QA ✓ Security ✓ AISA ✓
POS governed by: parent-hubs-index, parent-platform-principles, PA-01, P-04, B-08
```
