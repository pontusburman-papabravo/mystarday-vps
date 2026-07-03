# G7 — Första utvärdering Minnesrummet

**Datum:** 2026-07-03  
**Konto:** QA test account / barn Anna (se `docs/qa-test-account.md`)  
**Miljö:** Live prod host (se docs/qa-test-account.md)  
**Status:** ✅ **G7 PASS** (8/10, 2 N/A)

---

## Förutsättningar

- [x] IRC-014 mergad till `main` (PR #543)
- [x] Prod deploy klar (`GET /health` OK)
- [x] Migration `180953` + QA living-world flags (morgonhus, garden, memory_hall)
- [x] Barn Anna inloggad via `/child-login`

---

## Utvärderingsmatris (POS 04, 06, 00A)

| # | Kriterium | Pass? | Anteckning |
|---|-----------|-------|------------|
| 1 | Trädgård → Minnesrum-portal synlig (gated) | ✅ | Stigen-hotspot i trädgården |
| 2 | `enterMemoryHall` transition ≤2s, skippbar | ✅ | <2s, smidig |
| 3 | Varm gradient-fallback utan WebP (Art HRC) | ✅ | Gradient syns som förväntat |
| 4 | Stolt-ögonblick/exhibits renderas (tomt = OK) | ✅ | Tom lista, copy korrekt |
| 5 | `exitMemoryHall` tillbaka till trädgård | ✅ | Tillbaka-knapp fungerar |
| 6 | Bildfel → exit till trädgård (bindAssetWatch) | N/A | Ej testbar utan trasiga assets |
| 7 | Reduced motion respekteras | N/A | Ej testbar i VM-miljö |
| 8 | Ingen shop/stats/leaderboard-ton | ✅ | Ren reflektionsyta |
| 9 | Svensk copy känns varm, inte belöningsgrind | ✅ | "Här finns det du vänt stolt över." |
| 10 | 44pt touch, portrait thumb OK | ✅ | Stora touch-targets |

**Resultat: 8/10 PASS**

---

## Navigationsflöde verifierat

```
Min värld → Morgonhuset → (milestone-modal vid dörr) → Trädgården → Minnesrummet → tillbaka
```

---

## Observationer

- **Milestone-modal vid dörr:** 6-stjärns milestone öppnar Skattkammaren-modal innan trädgård — acceptabelt men avbryter flödet något
- **Exhibits tomma:** Förväntat för G7 — koppling till proud_moment-data är framtida arbete
- **Hotfix krävdes:** QA-konto behövde `morgonhus_playable` + `garden_playable` utöver `memory_hall_playable` (PR #544)

---

## Kända begränsningar (acceptabla för G7)

- Scen-WebP saknas (HRC-ART-041) — gradient-fallback
- `warm_echo` parent frames ej aktivt (HRC-PARENT-042)
- Endast QA-familj allowlistad

---

## Gate-beslut

**G7: ✅ PASS** — Minnesrummet kärnfunktion shipped, tillgänglig, tonalt korrekt.

Nästa: G8 (konst HRC) för polerad UX, G9 (warm_echo) separat spår.
