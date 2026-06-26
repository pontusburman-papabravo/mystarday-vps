# Product Behavior Specification (PBS)

## Produktplattformen — Version 1.0

**Status:** Primär produktspec — **volymserie** i [`pbs/`](./pbs/)  
**Mål (komplett):** ≈300–400 sidor  
**Ägare:** Produkt

> Det här är **indexet**. Den fullständiga beteendebibeln ligger i **`docs/pbs/`** — fem versionerade volymer som skrivs ut kapitel för kapitel, inte ett enda dokument som ska färdigställas på en gång.

---

## Snabbstart

| Jag är… | Börja här |
|---------|-----------|
| Ny på teamet | [pbs/README.md](./pbs/README.md) → [Vol 1 Vision](./pbs/VOL-01-VISION.md) |
| UX-designer | [Vol 2 Roller](./pbs/VOL-02-ROLLER-DOMAN.md) + [Vol 3 UC](./pbs/VOL-03-USE-CASES.md) |
| Utvecklare | [Vol 3 UC](./pbs/VOL-03-USE-CASES.md) + [architecture-platform.md](./architecture-platform.md) |
| QA / test | [Vol 3 UC-mall](./pbs/VOL-03-USE-CASES.md) + [Vol 5 Konstitution](./pbs/VOL-05-MOTIVATION-EMOTION-KONSTITUTION.md) |
| AI / Coach-team | [Vol 4 Coach Bible](./pbs/VOL-04-COACH-BIBLE.md) |
| Produktägare / investerare (utdrag) | [Vol 1](./pbs/VOL-01-VISION.md) + [Vol 5 konstitution](./pbs/VOL-05-MOTIVATION-EMOTION-KONSTITUTION.md) |

---

## Volymserie

| # | Dokument | Innehåll |
|---|----------|----------|
| — | [**pbs/README.md**](./pbs/README.md) | Master-index, läsarguide, roadmap |
| 1 | [VOL-01-VISION.md](./pbs/VOL-01-VISION.md) | Vision, filosofi, principer |
| 2 | [VOL-02-ROLLER-DOMAN.md](./pbs/VOL-02-ROLLER-DOMAN.md) | Domänmodell + alla roller |
| 3 | [VOL-03-USE-CASES.md](./pbs/VOL-03-USE-CASES.md) | 80–120 UC (mål); 8 fulla i v1.0 |
| 4 | [VOL-04-COACH-BIBLE.md](./pbs/VOL-04-COACH-BIBLE.md) | AI-coachens beteende |
| 5 | [VOL-05-MOTIVATION-EMOTION-KONSTITUTION.md](./pbs/VOL-05-MOTIVATION-EMOTION-KONSTITUTION.md) | Motivation, emotion, failure, livsresa, regler |

---

## Hierarki

```text
PBS (beteende)  >  architecture-platform  >  APP-V2-KRAVSPEC (leverans)
```

**Vid konflikt vinner PBS** om beteende, tonalitet, ansvar eller känsla.

---

## Den gyllene regeln

> **Produkten får aldrig få användaren att känna sig misslyckad som människa.** Den ska alltid hjälpa användaren att lyckas med nästa lilla steg.

Fullständig konstitution (30 regler): [Vol 5, Del 10](./pbs/VOL-05-MOTIVATION-EMOTION-KONSTITUTION.md).

---

## Roadmap

| PBS-version | Leverans |
|-------------|----------|
| **1.0** (nu) | Vol 1–5 grund · UC001–UC008 fulla · katalog UC001–UC060 |
| 1.1 | UC009–UC030 fulla |
| 1.2 | UC031–UC060 fulla |
| 2.0 | UC061–UC120 · coach copy library · QA checklist |
| 3.0 | Barn / ungdom / vuxen i varje UC |

---

## Monolit (arkiv)

Den tidigare enfiliga PBS (~3400 rader) ersattes av volymserien. Git-historik: `7641946` och tidigare.

---

*Senast uppdaterad: 2026-06-26 · PBS 1.0 volymserie*
