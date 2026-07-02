# Mina personer 10/10 — Agent-uppdrag (implementation)

**Vision:** [mina-personer-vision.md](mina-personer-vision.md) — **enda sanningskälla.**

---

## Status: GO

Produkt godkänd (2026-07). Idag + Skattkammaren shipped. Implementera enligt vision med minimal diff.

---

## Uppdrag

1. **`resolveFamilyState()`** — exklusiv sanningskälla (`child-family-state.js`)
2. Personkort först — `child-family-hall.js` putsas, inte ombyggs
3. Hero/status/personkort från state — ingen checklista, ingen primär CTA mot Idag
4. Projekt/kista/berättelse under fold (`<details>`)
5. Olle-test (4 frågor) på mobil utan scroll
6. `npm run test:gate` + konstitutionstester

**Filer:**

| Fil | Roll |
|-----|------|
| `public/js/child-family-state.js` | `resolveFamilyState()`, `FAMILY_STATES` |
| `public/js/child-family-hall.js` | Render från state |
| `public/js/child-family-client.js` | API (oförändrad) |
| `public/css/child-family-hall.css` | Personkort, hero, below-fold |

**Route:** `/child/family` · `#family` · `familyView`

---

## Förbjudet

- Checklista eller primär CTA som konkurrerar med Idag
- Syskonleaderboard · familjeskista som hero-KPI
- Familjehallen / Familj som rubrik i barn-UI
- Ny familje-ekonomi synlig ovanför fold

---

## Tester

| Fil | Syfte |
|-----|--------|
| `test/mina-personer-state.test.js` | Tillståndsmaskin |
| `test/mina-personer-10-10.test.js` | Konstitutionsgate |
| `test/mina-personer-vision.test.js` | Vision produkt-only |

**Branch:** `cursor/mina-personer-10-10-87ba`

---

*Senast uppdaterad: 2026-07-01 — GO*
