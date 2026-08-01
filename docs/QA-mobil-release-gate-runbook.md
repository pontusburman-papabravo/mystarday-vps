# Release Gate — Mobil runbook (1 sida)

**Version:** 1.2 · **Tid:** ~15 min auto + ~15 min manuellt  
**Auto:** `npm run qa:mobile-gate` · **Artefakt:** `artifacts/mobile-full-qa/gate-results.json`

---

## Förberedelse

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
export BASE="https://mystarday.se"   # eller http://127.0.0.1:3000
export SMOKE_PARENT_EMAIL="qa.mobil@test.stjarndag.local"
export SMOKE_PARENT_PASSWORD from secret store
export SMOKE_CHILD_NAME="Astrid"
export SMOKE_CHILD_PIN="4829"
export SMOKE_CHILD2_NAME="Erik"
export SMOKE_CHILD2_PIN="7391"
node scripts/seed-smoke-family.mjs
npm run qa:mobile-gate
```

**Release blocker:** Gate auto fail ELLER manuell `[G]`-rad ❌ utan waiver.

---

## Automatiserat (grönt = script pass)

| ID | Vad scriptet verifierar |
|----|-------------------------|
| A01, A05–A08 | Health + API-login |
| C01–C02, C04, C10 | UI-login, nav, logout → `/login` |
| Z01, Z04–Z06 | NavConfig, dashboard/schema boot |
| D01–D02, D11 | Dashboard + handoff |
| E01–E03 | Planering hub + länkar |
| F01, F04–F08 | Daglig logg load + bock/paus API |
| G01 | Schema load |
| I01, I03 | Belöningar + godkänn (efter Q04) |
| K01–K02 | Familj |
| L01–L02 | Barnprofil öppnas |
| O01, O03, O06 | Barnlogin PIN |
| P01, P03–P04 | Idag + bock UI |
| Q01, Q04 | Min värld + begär belöning |
| R01 | Mina personer |
| T01 | dashboard-stats per barn |
| U01–U02 | H-scroll + JS-crash |

---

## Manuell checklista (mobil 390×844)

Kryssa efter auto-körning:

| ☐ | ID | Steg | Pass om |
|---|-----|------|---------|
| ☐ | **G04** | Schema → välj dag → lägg aktivitet | Sparas; syns i vecka |
| ☐ | **G05** | Schema → redigera tid/namn | Uppdatering syns |
| ☐ | **I04** | Belöningar → neka pending | Status nekad; stjärnor kvar |
| ☐ | **K03** | Familj → klicka barn | `/family/child/<uuid>` |
| ☐ | **L07** | Barnprofil → Setup | PIN + vy-toggle synliga |
| ☐ | **L08** | Barnprofil → Barnvy | Handoff till child-login/barnvy |
| ☐ | **S02** | Barn → Förälder-meny | Parental Gate PIN (om satt) |
| ☐ | **S04** | Barn → Byt barn | PIN Erik; annat barn |
| ☐ | **S05** | Barn → Förälder | Gate eller inställning |
| ☐ | **S07** | Barn → Logga ut | Till child-login |
| ☐ | **T02** | Jämför schema Astrid/Erik | Minst en aktivitet skiljer sig |
| ☐ | **T04** | Byte barn | Astrids data ej synlig som Erik |
| ☐ | **T05** | Erik efter Astrid | Korrekt PIN, korrekt namn |

---

## Sign-off

| | Gate auto | Gate manuell | Signerad |
|--|-----------|--------------|----------|
| QA | ☐ grön | ☐ 13/13 | |
| Teknik | ☐ | ☐ | |

**Evidence vid fail:** `artifacts/mobile-full-qa/failures/<ID>/` (screenshot, URL, console).

---

*Full masterplan: `docs/QA-mobil-fullstandig-protokoll.md` · Review: `docs/QA-mobil-v1.2-review.md`*
