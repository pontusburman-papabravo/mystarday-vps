# Product Bible

## Produktplattformen — beteendespecifikation

**Typ:** Intern produktbibel / Product Behavior Specification  
**Målstorlek (komplett):** ≈400–600 sidor (15 kapitel + 100–120 use cases)  
**Version:** 1.0 grund  
**Status:** Normerande — vid konflikt om beteende **vinner detta bibliotek** över kravspec och kod

> Det här är inte ett ChatGPT-svar. Det är den centrala referensen för hur produkten ska **bete sig** under 5–10 år.

---

## Struktur

| # | Kapitel | Innehåll | v1.0 |
|---|---------|----------|------|
| 01 | [Product Vision](./01-PRODUCT-VISION.md) | Vision, mission, 2035, kärnloop, plattform | ✅ |
| 02 | [Product Philosophy](./02-PRODUCT-PHILOSOPHY.md) | Varför, principer, design/coach/motivation, framgång | ✅ |
| 03 | [Product Constitution](./03-PRODUCT-CONSTITUTION.md) | 30 icke-förhandlingsbara regler | ✅ |
| 04 | [Domain Model](./04-DOMAIN-MODEL.md) | Person, aktivitet, dag, progress, mappning DB | ✅ |
| 05 | [User Roles](./05-USER-ROLES.md) | Barn, förälder, ungdom, vuxen, pedagog, terapeut | ✅ |
| 06 | [Experience Principles](./06-EXPERIENCE-PRINCIPLES.md) | Produkt-, coach- och motivationsprinciper i mötet | ✅ |
| 07 | [Navigation](./07-NAVIGATION.md) | Intent före feature, barn/förälder IA | ✅ |
| 08 | [Design Language](./08-DESIGN-LANGUAGE.md) | Visuellt språk, animation, emotion design | ✅ |
| 09 | [Motivation Engine](./09-MOTIVATION-ENGINE.md) | Stjärnor, streaks, belöningar, risker | ✅ |
| 10 | [Coach Bible](./10-COACH-BIBLE.md) | AI-coachens tänkande, språk, tystnad | ✅ |
| 11 | [Core Platform](./11-CORE-PLATFORM.md) | Engines, två lager, generationer | ✅ |
| 12 | [Product Behavior Spec](./12-PRODUCT-BEHAVIOR-SPEC.md) | PBS-index, failure design, UC-koppling | ✅ |
| 13 | [Analytics](./13-ANALYTICS.md) | Mätprinciper, KPI per UC | 🔄 Grund |
| 14 | [Accessibility](./14-ACCESSIBILITY.md) | Tillgänglighet som kognitiv belastning | 🔄 Grund |
| 15 | [Future Products](./15-FUTURE-PRODUCTS.md) | Livscykel barn → ungdom → vuxen | ✅ |

**Use cases (volym 2 i serien):** [`../use-cases/`](../use-cases/) — mål 100–120 st à 3–8 sidor.

---

## Vem läser vad?

| Roll | Börja här |
|------|-----------|
| Ny medarbetare | 01 → 03 → 12 → relevant UC |
| Produkt / UX | 01–08, 12, use-cases |
| Utvecklare | 04, 11, 12, [`architecture-platform.md`](../architecture-platform.md) |
| AI / Coach | 10, 06, use-cases (Coach-fält) |
| QA | 03, 12, UC acceptance criteria |
| Pedagog / terapeut | 05, 04, delade UC |
| Investerare (utdrag) | 01, 03, 15 |

---

## Dokumenthierarki

```text
Product Bible + use-cases (beteende)
  > architecture-platform.md (motorer)
    > APP-V2-KRAVSPEC.md (Platform v1 leverans)
      > barnmeny-v2 / vuxenmeny-v2 (Gen 1 UI)
```

---

## Roadmap

| Version | Leverans |
|---------|----------|
| **Bible 1.0** (nu) | 15 kapitel grund · 8 fulla UC · katalog UC001–UC060 |
| Bible 1.1 | UC009–UC030 fulla (3–8 sidor vardera) |
| Bible 1.2 | UC031–UC060 fulla |
| Bible 2.0 | UC061–UC120 · coach copy library · QA behavior checklist |
| Bible 3.0 | Ungdom/vuxen i varje UC och kapitel |

---

## Arkiv

Äldre femvolymsserie i [`../pbs/`](../pbs/) — innehåll migrerat till detta bibliotek; `pbs/` behålls som referens tills full migrering är verifierad.

- [`../PRODUCT_BEHAVIOR_SPEC.md`](../PRODUCT_BEHAVIOR_SPEC.md) — toppindex
- [`../APP-V2-KRAVSPEC.md`](../APP-V2-KRAVSPEC.md) — leveranskrav Platform v1
- [`../VISION-2030.md`](../VISION-2030.md) — executive summary

---

*Senast uppdaterad: 2026-06-26 · Product Bible 1.0*
