# Idag 10/10 — Agent-uppdrag (implementation)

**Vision:** [idag-vision.md](idag-vision.md) — **enda sanningskällan för tillstånd.**

> Implementera genom att mappa API-data → exklusivt tillstånd → UI. Duplicera inte logik i pseudokod här.

---

## Scope

**Putsa, bygg inte om.** Befintliga `child-today-focus.js`, `child-today-tasks.js`, `renderActivities()` i `child-dashboard.js`.

---

## Obligatoriskt

1. **`resolveIdagState()`** — exklusiv sanningskälla (`child-today-focus.js`)
2. **Quest-layout i focus mode** — tvinga NU/NÄSTA/SEDAN även vid `day_sections` view_type
3. **Hero = progress + NU**, inte mål/stjärnor (de hör till Skattkammaren)
4. **Max 5 synliga uppdrag** — befintlig cap behålls
5. **`+X ⭐` per rad** — befintlig teaser behålls/förbättras
6. **Dölj ovanför fold:** `weekNavSection`, `progressSection`, `childHeaderRing`, mål-kort i focus bar
7. **Tester:** `test/idag-10-10.test.js`, `test/idag-state.test.js` i `test:gate`
8. **`npm run test:gate` grön**

---

## Filer

| Fil | Roll |
|-----|------|
| `public/js/child-today-focus.js` | `resolveIdagState()`, focus bar |
| `public/js/child-today-tasks.js` | Cap, teasers, Skatt-CTA under fold |
| `public/js/child-dashboard.js` | Quest-layout när `today-focus-mode` |
| `public/css/child-today-focus.css` | Focus styles |
| `docs/idag-vision.md` | Produktkonstitution |

---

## Checklista före PR

1. Ett exklusivt tillstånd? (vision § Tillståndsmaskin)
2. Olle-test manuellt på mobil 390px
3. POS-citat i commit
4. SW bump om JS/CSS ändrats

---

*Senast uppdaterad: 2026-07-01*
