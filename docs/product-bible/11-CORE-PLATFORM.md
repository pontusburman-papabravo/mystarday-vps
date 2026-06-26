# 11 — Core Platform

**Product Bible — Kapitel 11**  
**Version:** 1.0  
**Status:** Normerande


---

## 11.1 Syfte

Detta kapitel är **produktperspektivet** på Core Platform. Teknisk arkitektur, engines och API-mappning finns i [`architecture-platform.md`](../architecture-platform.md).

## 11.2 En rad som styr allt

> **Samma motor, olika upplevelser.**

Beslutsgate för varje produktändring:

> *Kan samma motor presenteras för en 24-åring med ADHD utan arkitekturomskrivning?*

| Svar | Betydelse |
|------|-----------|
| Ja | Plattform — bygg vidare |
| Nej | Barnapp-skuld — ompröva |

## 11.3 Två lager

```text
┌─────────────────────────────────────────┐
│           CORE PLATFORM (Layer 1)        │
│  Identity · Tasks · Goals · Rewards      │
│  Progress · Habits · Relationships       │
│  Timeline · Coach · Notifications        │
│  Analytics · Permissions                 │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│        PRESENTATION LAYER (Layer 2)      │
│  Navigation · språk · färger · animation │
│  CHILD · TEEN · YOUNG_ADULT · ADULT     │
└─────────────────────────────────────────┘
```

**Regel:** Presentation får aldrig äga affärslogik.

## 11.4 Engines (översikt)

| Engine | Produktansvar |
|--------|---------------|
| **Task** | Planera, schemalägga, slutföra uppgifter |
| **Goal** | Riktning över dagar och veckor |
| **Reward** | Poäng, inlösen, unlocks |
| **Progress** | Streaks, historik, synlig rörelse |
| **Habit** | Återkommande mönster |
| **Relationship** | Familj, roller, inbjudan, stödpersoner |
| **Timeline** | NU / NÄSTA / SEN |
| **Coach** | Nästa steg, omplanering, lugn återstart |
| **Notification** | Push, påminnelser |
| **Permission** | Roller, integritet, parental gate |
| **Identity** | Person, konto, session |

## 11.5 Kärnloopen

```text
Planera → Starta → Genomföra → Bekräfta → Feedback → Reflektera → Förbättra → Upprepa
```

Varje engine ska kunna kopplas till minst ett steg i loopen.

## 11.6 Generationer

| Generation | Målgrupp | Status |
|------------|----------|--------|
| Gen 1 | Barn 4–12 + föräldrar + pedagoger | Live |
| Gen 2 | Ungdomar 13–17 | Horisont |
| Gen 3 | Unga vuxna 18–30 | Horisont |
| Gen 4 | Vuxna | Horisont |

App v2 = **Platform v1** — navigation och IA-refaktor, samma backend.

**Full spec:** [`architecture-platform.md`](../architecture-platform.md) · leverans: [`APP-V2-KRAVSPEC.md`](../APP-V2-KRAVSPEC.md)
