# 12 — Product Behavior Specification

**Product Bible — Kapitel 12**  
**Version:** 1.0  
**Status:** Normerande


---

## 12.1 Vad PBS är

Product Behavior Specification beskriver **hur produkten ska bete sig** — inte hur koden är implementerad.

Vid konflikt om beteende, ton, ansvar eller känsla **vinner PBS** över kravspec och teknisk arkitektur.

## 12.2 Struktur

| Del | Plats |
|-----|-------|
| Vision, filosofi, konstitution | Kapitel 01–03 i detta bibliotek |
| Domän & roller | Kapitel 04–05 |
| Upplevelse & design | Kapitel 06–08 |
| Motivation & coach | Kapitel 09–10 |
| Plattform | Kapitel 11 |
| **Use cases (hjärtat)** | [`use-cases/`](../use-cases/) |
| Failure design | §12.4 nedan |
| Analytics & a11y | Kapitel 13–14 |

## 12.3 Use cases

**Mål:** 100–120 use cases à 3–8 sidor (≈400–600 sidor totalt).

| Status | Omfattning |
|--------|------------|
| **v1.0** | 8 fulla UC + katalog UC001–UC060 |
| **v1.1** | UC009–UC030 fulla |
| **v1.2** | UC031–UC060 fulla |
| **v2.0** | UC061–UC120 + coach copy library + QA checklist |

- **Mall:** [`use-cases/UC-TEMPLATE.md`](../use-cases/UC-TEMPLATE.md)
- **Katalog:** [`use-cases/UC-CATALOG.md`](../use-cases/UC-CATALOG.md)
- **Arkiv (monolit):** [`pbs/VOL-03-USE-CASES.md`](../pbs/VOL-03-USE-CASES.md)

### Fulla use cases (v1.0)

| ID | Fil |
|----|-----|
| UC001 | [`UC001-skapa-konto.md`](../use-cases/UC001-skapa-konto.md) |
| UC003 | [`UC003-skapa-forsta-barnet.md`](../use-cases/UC003-skapa-forsta-barnet.md) |
| UC004 | [`UC004-bygga-schema-planera-dag.md`](../use-cases/UC004-bygga-schema-planera-dag.md) |
| UC007 | [`UC007-starta-aktivitet.md`](../use-cases/UC007-starta-aktivitet.md) |
| UC008 | [`UC008-slutfora-aktivitet.md`](../use-cases/UC008-slutfora-aktivitet.md) |
| UC009 | [`UC009-hoppa-over-aktivitet.md`](../use-cases/UC009-hoppa-over-aktivitet.md) |
| UC014 | [`UC014-coach-interagerar.md`](../use-cases/UC014-coach-interagerar.md) |
| UC030 | [`UC030-aterstart-efter-misslyckande.md`](../use-cases/UC030-aterstart-efter-misslyckande.md) |

## 12.4 Failure design (sammanfattning)

Failure är inte identitet. Produkten skiljer:

| Typ | Produktens svar |
|-----|-----------------|
| Skip | Legitim väg — ingen skuld |
| Glömt | Mjuk återstart, ett steg |
| Tappad motivation | Coachen tyst eller lugn — aldrig skam |
| Vecka/månad borta | Låg tröskel tillbaka — ingen "nystart från noll" emotionellt |
| Bruten streak | Historik sanningsenlig — streak är verktyg, inte identitet |

**Full spec:** [`pbs/VOL-05`](../pbs/VOL-05-MOTIVATION-EMOTION-KONSTITUTION.md) Del 8.

## 12.5 Regel för nya use cases

1. Lägg till rad i UC-katalogen
2. Skriv UC i **full mall** (3–8 sidor)
3. Testa mot [03 — Constitution](./03-PRODUCT-CONSTITUTION.md)
4. Testa beslutsgate: *Kan samma motor presenteras för ungdom/vuxen utan omskrivning?*

## 12.6 Den gyllene regeln

> Produkten får aldrig få användaren att känna sig misslyckad som människa. Den ska alltid hjälpa till nästa lilla steg.
