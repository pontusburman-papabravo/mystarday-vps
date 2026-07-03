# G7 — Första utvärdering Minnesrummet

**Datum:** 2026-07-03  
**Konto:** QA test account / barn Anna (se `docs/qa-test-account.md`)  
**Gate:** G7 efter G4 merge, G5 deploy, G6 `memory_hall_playable` allowlist

---

## Förutsättningar

- [ ] IRC-014 mergad till `main`
- [ ] Prod deploy klar (`GET /health` OK)
- [ ] Migration `1809530000000_memory_hall_allowlist_qa` körd på prod
- [ ] Barn Anna inloggad via `/child-login`

---

## Utvärderingsmatris (POS 04, 06, 00A)

| # | Kriterium | Pass? | Anteckning |
|---|-----------|-------|------------|
| 1 | Trädgård → Minnesrum-portal synlig (gated) | | |
| 2 | `enterMemoryHall` transition ≤2s, skippbar | | |
| 3 | Varm gradient-fallback utan WebP (Art HRC) | | |
| 4 | Stolt-ögonblick/exhibits renderas (tomt = OK) | | |
| 5 | `exitMemoryHall` tillbaka till trädgård | | |
| 6 | Bildfel → exit till trädgård (bindAssetWatch) | | |
| 7 | Reduced motion respekteras | | |
| 8 | Ingen shop/stats/leaderboard-ton | | |
| 9 | Svensk copy känns varm, inte belöningsgrind | | |
| 10 | 44pt touch, portrait thumb OK | | |

---

## Kända begränsningar (acceptabla för G7)

- Scen-WebP saknas (HRC-ART-041) — gradient-fallback förväntat
- `warm_echo` parent frames ej aktivt (HRC-PARENT-042)
- Endast QA-familj allowlistad

---

## Resultat

**Status:** _pending evaluation_  
**Sammanfattning:** _fylls i efter browser-pass_

---

## Relaterat

- `docs/decisions/adr-memory-hall-bl012.md`
- `docs/reports/roadmap-minnesrummet-2026-07-03.md`
