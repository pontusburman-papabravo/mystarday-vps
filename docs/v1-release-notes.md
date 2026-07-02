# v1 Release Notes

**Release:** v1 Completion Program  
**Datum:** 2026-07-02  
**Bas-commit:** efter merge av PR #497–#502

---

## För användare (föräldrar & barn)

### Boendeschema (FEAT-1 v1 + post-v1)
- Veckoschema kan kopplas till **aktivt hem** vid delad vårdnad (`alternate_weeks`, `alternate_weekends`, `custom`)
- **Undantag** (lov, resor) utan att ändra grundschema (FEAT-1C)
- **4-veckors förhandsvisning** på `/family#boendeschema` (v2.1)
- Dashboard och schema visar **hemnamn** istället för abstrakt Vecka A/B där det är relevant
- Familjer **utan** boendeschema påverkas inte

### Föräldrahubbar
- Hem, Planering, Belöningar och Familj-hubbar är integrerade med kontraktstester och Jenny-QA-dokumentation
- En primär handling per hub enligt 10/10-konstitutionen

### Barnvärldar
- **Idag:** fokusbar med illustrationer för tom dag och firande (≤2 s, hoppa över)
- **Skattkammaren:** shipped (oförändrat läge)
- **Mina personer:** V0 familjehall via Mer → Familj
- **Trädgården:** kanoniska bilder under `/images/child/world/garden/`

### Aktivering (ACT-1 v1)
- Onboarding-handoff till barnkod och First Star-guide (bakom feature flags, default **OFF**)
- Se `docs/act-1-rollout-runbook.md` för säker rollout

---

## Tekniskt

| Spår | PR | SW |
|------|-----|-----|
| Program + agent-promptar | #497 | — |
| FEAT-1 Phase 5 | #498 | v466 |
| Parent Hubs QA | #499 | — |
| ACT-1 v1 | #500 | v466 |
| Child assets | #501 | v467 |
| Child worlds wiring | #502 | v468 |

**Tester:** `npm run test:gate` — 93/93 grön på release candidate.

**Medvetet utanför v1 (nu levererat post-v1):** FEAT-1B (`custom`) ✅, FEAT-1C (overrides) ✅, v2.1 4-veckors förhandsvisning ✅. Kvar: För dig Sprint 4 nav-flytt (defer ADR), AI starter plan, print/PDF custody.

---

## Kända begränsningar

- Hem-hub: coach/handoff kan ligga under fold på små skärmar när barnrad + vecka fyller (icke-blockerande)
- ACT-1: alla `activation_*` flaggor OFF tills manuell rollout
- För dig Sprint 3–5: **v1 Complete** (Sprint 4 nav defer till v1.1, se `docs/decisions/for-dig-sprint4-defer.md`)

---

## Self-review (release)

```
POS governed by: Constitution 1–5, P-04, C-01, PA-01, G-04
QA: test:gate green · hub sweep v2 · child-art-assets 7/7
```
