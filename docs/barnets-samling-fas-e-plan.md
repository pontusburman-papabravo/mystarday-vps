# Fas E — Årsbok + visuell polish (plan)

**Status:** Klar (merged #634)  
**Epic:** GitHub **#587**  
**Spec:** [barnets-samling-vision.md](barnets-samling-vision.md) § Årsboken · Skattkammaren estetik  
**Förutsättning:** Fas A–D klar

---

## Produktmål

Samlingen och Skattkammaren känns **färdiga** — vackra hyllor, kistor, årsbok att bläddra i.

### In scope (smal v1)

| Ticket | Scope |
|--------|--------|
| **E1** | Denna plan |
| **E2** | Årsbok i Min samling — månadsuppslag från `universe.year_story.months` |
| **E3** | Skattkammaren visuell polish — hylla + kista (presentation, samma data/flöden) |
| **E4** | Min samling estetisk polish (årsbok + befintliga sektioner) |
| **E5** | NPF-copy + tomstatus |
| **E6** | Regression/gate-test |

### Out of scope

- Full foto-/uploadmotor
- Ny valuta, shop, loot
- `ChildCollections` i gated Min samling
- Redeem/API-ändringar
- Persistent Godkänd ≠ Genomförd (#631)
- Stor DB-migration (endast utökad read-query i befintlig `getYearStory`)

### Princip

**Befintligt före nytt.** Årsbok bygger på `year_story` i `ChildUniverse` (redan i API). Månadsdata = aggregering av `daily_log` + `manual_star_grant` — ingen ny tabell.

---

## Data

| Fält | Källa |
|------|--------|
| `year_story.months[]` | `getYearStory` — `month`, `stars`, `active_days` |
| Belöningar/historik | Oförändrat Skattkammaren Fas C |

---

## Definition of Done

- [x] Gate ON: Min samling visar årsbok med bläddring (snap-scroll)
- [x] Gate ON: Skattkammaren har hylla/kista-estetik, samma redeem
- [x] Gate OFF legacy oförändrat
- [x] `npm run test:gate` grön
- [x] SW bump v547
