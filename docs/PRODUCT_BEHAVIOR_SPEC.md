# Product Behavior Specification (PBS)

## Produktplattformen — Version 1.0

**Status:** Primär produktspec  
**Kanoniskt bibliotek:** [`product-bible/`](./product-bible/) + [`use-cases/`](./use-cases/)  
**Mål (komplett):** ≈400–600 sidor (15 kapitel + 100–120 use cases)  
**Ägare:** Produkt

> PBS beskriver **hur produkten ska bete sig** — inte hur koden är implementerad.  
> Vid konflikt om beteende, ton, ansvar eller känsla **vinner PBS** över kravspec och teknisk arkitektur.

---

## Snabbstart

| Jag är… | Börja här |
|---------|-----------|
| Ny på teamet | [product-bible/README.md](./product-bible/README.md) → [01 Vision](./product-bible/01-PRODUCT-VISION.md) |
| UX-designer | Kap. 06–08 + [use-cases/](./use-cases/) |
| Utvecklare | Kap. 04, 11 + [architecture-platform.md](./architecture-platform.md) |
| QA / test | Kap. 03, 12 + UC acceptance criteria |
| AI / Coach-team | [10 Coach Bible](./product-bible/10-COACH-BIBLE.md) |
| Produktägare / investerare | 01, 03, 15 |

---

## Product Bible — 15 kapitel

| # | Dokument |
|---|----------|
| — | [**product-bible/README.md**](./product-bible/README.md) |
| 01 | [Product Vision](./product-bible/01-PRODUCT-VISION.md) |
| 02 | [Product Philosophy](./product-bible/02-PRODUCT-PHILOSOPHY.md) |
| 03 | [Product Constitution](./product-bible/03-PRODUCT-CONSTITUTION.md) |
| 04 | [Domain Model](./product-bible/04-DOMAIN-MODEL.md) |
| 05 | [User Roles](./product-bible/05-USER-ROLES.md) |
| 06 | [Experience Principles](./product-bible/06-EXPERIENCE-PRINCIPLES.md) |
| 07 | [Navigation](./product-bible/07-NAVIGATION.md) |
| 08 | [Design Language](./product-bible/08-DESIGN-LANGUAGE.md) |
| 09 | [Motivation Engine](./product-bible/09-MOTIVATION-ENGINE.md) |
| 10 | [Coach Bible](./product-bible/10-COACH-BIBLE.md) |
| 11 | [Core Platform](./product-bible/11-CORE-PLATFORM.md) |
| 12 | [Product Behavior Spec](./product-bible/12-PRODUCT-BEHAVIOR-SPEC.md) |
| 13 | [Analytics](./product-bible/13-ANALYTICS.md) |
| 14 | [Accessibility](./product-bible/14-ACCESSIBILITY.md) |
| 15 | [Future Products](./product-bible/15-FUTURE-PRODUCTS.md) |

**Use cases:** [use-cases/README.md](./use-cases/README.md) — 8 fulla i v1.0, mål 100–120.

---

## Hierarki

```text
Product Bible + use-cases (beteende)
  > architecture-platform.md (motorer)
    > APP-V2-KRAVSPEC.md (Platform v1 leverans)
```

---

## Den gyllene regeln

> **Produkten får aldrig få användaren att känna sig misslyckad som människa.** Den ska alltid hjälpa användaren att lyckas med nästa lilla steg.

Fullständig konstitution (30 regler): [03 — Product Constitution](./product-bible/03-PRODUCT-CONSTITUTION.md).

---

## Roadmap

| Version | Leverans |
|---------|----------|
| **1.0** (nu) | 15 kapitel grund · 8 fulla UC · katalog UC001–UC060 |
| 1.1 | UC009–UC030 fulla |
| 1.2 | UC031–UC060 fulla |
| 2.0 | UC061–UC120 · coach copy library · QA checklist |
| 3.0 | Barn / ungdom / vuxen i varje UC |

---

## Arkiv

- [`pbs/`](./pbs/) — tidigare femvolymsserie (innehåll migrerat till `product-bible/`)
- Git-historik monolit: commit `7641946` och tidigare

---

*Senast uppdaterad: 2026-06-26 · PBS 1.0 Product Bible*
