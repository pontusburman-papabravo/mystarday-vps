# Hem 10/10 — Produktvision

**Status:** Godkänd produktkompass (2026-07)  
**Feature slug:** `parent_home_magic` (presentation) · domän `home`  
**Route:** `/dashboard`  
**Relaterat:** [hem-agent-prompt.md](hem-agent-prompt.md) · [parent-hubs-index.md](parent-hubs-index.md) · [vuxenmeny-v2.md](vuxenmeny-v2.md) §2

---

## Kompassen

> **Hem ska få föräldern att känna: "Jag ser läget — och vet exakt vad jag gör härnäst."**

---

## Varför finns Hem?

Morgonen är stressig. Föräldern öppnar appen och behöver **inte** ett kontrolltorn, inte ett schemaverktyg och inte en katalog.

Hem svarar på tre saker på en gång:

1. **Hur går det idag?** (per barn, utan jämförelse)
2. **Vad behöver min uppmärksamhet?** (undantag — godkännanden, inbjudningar)
3. **Vad är nästa steg?** (ett — inte tre coacher)

**Schemat driver vardagen. Hem visar läget.**

---

## Problemet vi löser

Föräldrar öppnar Hem och ser **för mycket som konkurrerar**:

- Readiness-kort (*Kräver åtgärd*)
- Magic hub med veckodiagram och uppmuntran
- Aktiveringsbanner (7 dagar)
- Medförälder-CTA
- Flera "nästa steg" utan tydlig prioritet

> *"Jag vet inte vad jag ska titta på först."* — Jenny, morgon 07:15

Det är inte ett data-problem. Det är ett **beslutsproblem**.

---

## Produktprincip

> **Hem = kör läget. Planering = bygg. För dig = rekommendera.**

| Hem är | Hem är inte |
|--------|-------------|
| Daglig överblick | Schemaeditor |
| Ett nästa steg (coach) | Tips-katalog |
| Undantags-UI (godkännanden) | Analytics-dashboard |
| Handoff till barnet | Familjeinställningar |

**POS:** PA-01 (en coach), PA-02 (Journey authority), P-04 (inget parent dashboard anti-pattern), B-08 (inget bygg på Hem).

---

## Framgångskriterium

> **När en förälder lämnar Hem ska hen veta om dagen fungerar — och ha gjort det enda som behövdes.**

| Fråga | Om nej → bygg inte |
|--------|---------------------|
| Hjälper det här en stressad morgon? | |
| Flyttar vi byggjobb till Hem? | |
| Finns det mer än ett "nästa steg"? | |

---

## Den mentala modellen

```
Jag öppnar appen
        ↓
Jag ser hur det går idag (per barn)
        ↓
Om något kräver mig → tydligt undantagskort
        ↓
Annars → ett rekommenderat nästa steg
        ↓
Jag kan lämna över till barnet
```

---

## Tre frågor — alltid besvarade (standardvy)

| # | Fråga | Rätt | Fel |
|---|--------|------|-----|
| 1 | Hur går det idag? | *Astrid: Tandborsta kvar · 3/7 klara* | Stjärndiagram · DAU-metrics |
| 2 | Vad ska jag göra nu? | *Godkänn Olles belöning* eller *Inget just nu* | Tre parallella coacher |
| 3 | Var hittar jag barnet? | *Barnet loggar in →* | Gömd handoff |

**Designregel:** Beslut ska kunna fattas **utan att scrolla förbi veckodiagram eller uppmuntran**.

---

## Prioritetsordning (låst)

Allt på Hem följer denna ordning. Inget får bryta den:

```
1. Idag per barn   →  Statusrad (hur går det just nu)
        ↓
2. Undantag        →  Kräver åtgärd (om några)
        ↓
3. Nästa steg      →  Ett coach-kort
        ↓
4. Handoff         →  Barnet loggar in
        ↓
5. Utveckling      →  Veckans berättelse, detaljlänkar
```

Lägg aldrig veckodiagram, tips eller rekommendationer ovanför undantag eller handoff.

---

## Vad räknas som Undantag?

**Undantag** = allt på Hem som kräver förälderns uppmärksamhet **innan** vardagen kan rulla vidare som vanligt.

Hem äger begreppet **undantag** — inte *pending*. Pending är Belöningars domän (se [beloningar-vision.md](beloningar-vision.md)).

```
Undantag =
✓ väntande belöningsgodkännande (exempel — ett av flera)
✓ väntande medförälder-inbjudan
✓ ofullständiga tidigare dagar (retroaktiv logg)
✓ annat vuxenbeslut som kräver handling idag

Inte undantag:
✗ daglig status per barn ("hur går det idag")
✗ coach / nästa steg
✗ veckoberättelse
✗ tips, motivation eller rekommendationer
```

**Teknisk källa:** `GET /api/family/readiness` (`home-readiness.js`).  
**Presentation:** Om inget är undantag → sektionen **dold**. Ingen tom "Kräver åtgärd"-ruta.

---

## Hem vs Belöningar (låst)

| | Hem | Belöningar |
|--|-----|------------|
| **Begrepp** | **Undantag** | **Pending** |
| **Scope** | Alla vuxenbeslut som kräver uppmärksamhet idag | Endast belöningsdomänen |
| **Exempel** | *Godkänn Olles belöning* (länk → `/rewards`) | Inline godkännande av inlösen/målbyte |
| **Data** | `readiness` type `pending_approval` | `pending-requests` — **samma underliggande rader** |

**Regel:** Dubbel logik är förbjuden. Hem **visar** undantaget och länkar dit beslutet tas; Belöningar **äger** godkännande-UI.

---

## Filterregel

Om en komponent inte hjälper föräldern att:

- **förstå läget idag** (per barn),
- **se om något kräver åtgärd** (undantag), eller
- **veta nästa steg / lämna över till barnet**,

…hör den **inte** hemma på Hem.

Flytta till rätt hub: Planering (bygg), Belöningar (belöningar), Familj (medlemmar), För dig (rekommendation), Inställningar (konto).

---

## Copy-regel

Hem beskriver:

- **läget idag**
- **om något kräver dig**
- **vad som är nästa steg**

Hem beskriver **inte**:

- hur duktigt barnet varit över tid
- belöningsutbud eller stjärnhantering (→ Belöningar)
- vem som ingår i familjen (→ Familj)

Det håller isär Hem, Belöningar och Familj.

---

## Informationshierarki

```
1. Idag per barn     →  Redo för nästa aktivitet (horisontell rad)
2. Kräver åtgärd     →  Endast undantag (godkännande, inbjudan, PIN)
3. Ett nästa steg    →  Coach / Journey (ett kort)
4. Handoff           →  Barnet loggar in
5. Veckans berättelse →  Kort veckobild (inte stjärnchart)
6. Detaljer          →  Schema, daglig logg (länkar — inte inline-bygg)
```

---

## Hem vs För dig (låst)

| | Hem | För dig |
|--|-----|---------|
| Ton | *Här är läget* | *Här är vad jag rekommenderar* |
| Tid | Idag, nu | Vecka 2+, utveckling |
| Exempel | Astrid har 2 steg kvar idag | Testa kvällsrutin för Astrid |
| Data | Samma intelligenslager | Samma lager, coachande presentation |

För dig **äger** problem → rutin. Hem **äger** status → handling idag.

---

## Jenny-test (Definition of Done)

En förälder som aldrig sett Hem ska inom **5 sekunder**, **utan scroll**, kunna svara:

1. **Hur går det idag?** (minst ett barn)
2. **Behöver jag göra något nu?** (ja/nej tydligt)
3. **Hur lämnar jag över till barnet?**

### Jenny-test godkänt (målbild)

```
God morgon!

Redo för nästa aktivitet
🌟 Astrid    Tandborsta kvar     3/7
👶 Olle      Allt klart!         5/5

⚠️ Godkänn Olles belöning "Extra sagostund"

[Barnet loggar in]
```

Ingen veckodiagram ovanför handoff. Ingen "Kräver åtgärd" om listan är tom.

---

## Vad som ska bort

- Flera parallella coach-mounts (`readiness` + `activation` + `encouragementCopy` som policy)
- Stjärndiagram på Hem (veckoberättelse OK — inte jämförande leaderboard)
- Bygg-CTA på Hem (schema, bibliotek → Planering)
- Enterprise-metrics (DAU, funnel, conversion)
- Jämförelse mellan syskon på stjärnor
- Tom Hem efter registrering (Constitution: no empty home)

---

## Nuläge vs mål

**Redan på plats:** `dashboard-home-hub.js`, `home-readiness.js`, `dashboard-child-handoff.js`, barnrader "Redo för nästa aktivitet", magic shell.

**Kvar för 10/10:**

- En beslutskälla för "nästa steg" (Journey / First Success — se [first-success/DECISION-BOUNDARIES.md](first-success/DECISION-BOUNDARIES.md))
- Readiness = endast undantag (`priority <= 1`), inte coach
- Tydlig tom-state när inget kräver åtgärd
- Veckosektion under handoff, inte ovanför
- Belöningsundantag synkat med Belöningar (`readiness` ↔ `pending-requests`)

Se [hem-agent-prompt.md](hem-agent-prompt.md) för agent-uppdrag.
