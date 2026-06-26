# Use Cases — Product Bible volym 2

**Mål:** 100–120 use cases à **3–8 sidor** vardera  
**Status:** v1.0 — 8 fulla + katalog UC001–UC060  
**Mall:** [UC-TEMPLATE.md](./UC-TEMPLATE.md)  
**Katalog:** [UC-CATALOG.md](./UC-CATALOG.md)

> Varje use case beskriver **beteende** — syfte, aktörer, flöden, affärsregler, UX, coach, belöningar, edge cases och mätetal. Inte implementation.

---

## Fulla use cases (v1.0)

| ID | Namn | Fil |
|----|------|-----|
| UC001 | Skapa konto | [UC001-skapa-konto.md](./UC001-skapa-konto.md) |
| UC003 | Skapa första barnet | [UC003-skapa-forsta-barnet.md](./UC003-skapa-forsta-barnet.md) |
| UC004 | Bygga schema / planera dag | [UC004-bygga-schema-planera-dag.md](./UC004-bygga-schema-planera-dag.md) |
| UC007 | Starta aktivitet | [UC007-starta-aktivitet.md](./UC007-starta-aktivitet.md) |
| UC008 | Slutföra aktivitet | [UC008-slutfora-aktivitet.md](./UC008-slutfora-aktivitet.md) |
| UC009 | Hoppa över aktivitet | [UC009-hoppa-over-aktivitet.md](./UC009-hoppa-over-aktivitet.md) |
| UC014 | Coach interagerar | [UC014-coach-interagerar.md](./UC014-coach-interagerar.md) |
| UC030 | Återstart efter misslyckande | [UC030-aterstart-efter-misslyckande.md](./UC030-aterstart-efter-misslyckande.md) |

---

## Tematiska grupper (katalog)

| Grupp | UC-ID | Antal |
|-------|-------|-------|
| Identitet & konto | UC001–UC005 | 5 |
| Onboarding | UC006–UC010 | 5 |
| Planering | UC011–UC018 | 8 |
| Execution | UC019–UC028 | 10 |
| Motivation | UC029–UC035 | 7 |
| Coach & AI | UC036–UC042 | 7 |
| Relationer | UC043–UC048 | 6 |
| Delning & export | UC049–UC052 | 4 |
| System | UC053–UC060 | 8 |
| Horisont (PBS 2.0) | UC061–UC120 | 60 stub |

Se [UC-CATALOG.md](./UC-CATALOG.md) för full lista med Gen1-status.

---

## Skriva nytt use case

1. Reservera ID i [UC-CATALOG.md](./UC-CATALOG.md)
2. Kopiera [UC-TEMPLATE.md](./UC-TEMPLATE.md) → `UCnnn-kort-namn.md`
3. Fyll **alla** mallfält (syfte, coach, KPI, acceptance criteria, future profiles)
4. Testa mot [03 — Constitution](../product-bible/03-PRODUCT-CONSTITUTION.md)
5. Testa beslutsgate: *Kan samma motor presenteras för ungdom/vuxen?*

---

## Roadmap

| Batch | UC | Mål |
|-------|-----|-----|
| **1.0** ✅ | 001, 003–004, 007–009, 014, 030 | 8 fulla |
| **1.1** | 009–020 | +12 fulla |
| **1.2** | 021–060 | Katalog komplett skriven |
| **2.0** | 061–120 | Horisont + livscykel |

**Monolit-arkiv:** [`../pbs/VOL-03-USE-CASES.md`](../pbs/VOL-03-USE-CASES.md)

---

## Relaterat

- [Product Bible](../product-bible/README.md)
- [12 — Product Behavior Spec](../product-bible/12-PRODUCT-BEHAVIOR-SPEC.md)
- [APP-V2-KRAVSPEC](../APP-V2-KRAVSPEC.md)
