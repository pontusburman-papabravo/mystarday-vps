# Hem 10/10 — Produktvision

**Status:** Godkänd produktkompass (2026-07)  
**Feature slug:** `parent_home_magic` (presentation) · domän `home`  
**Route:** `/dashboard`  
**Relaterat:** [hem-agent-prompt.md](hem-agent-prompt.md) · [parent-hubs-index.md](parent-hubs-index.md) · [vuxenmeny-v2.md](vuxenmeny-v2.md) §2

---

## Kompassen

> **Hem ska få föräldern att känna: "Jag ser läget — och vet exakt vad jag gör härnäst."**

### Filterregel

> **Om en komponent inte hjälper användaren att besvara någon av de tre frågorna inom fem sekunder, hör den inte hemma på Hem.**

Innan något läggs till: *"Vilken av de tre frågorna hjälper detta användaren att besvara?"* Om svaret är *ingen* — flytta eller ta bort.

### Beslutsregel

> **På Hem får det aldrig finnas mer än en komponent som föreslår nästa handling.**

Allt som rör "nästa steg" — coach, Journey, First Success, aktiveringsbanner — ska gå genom denna regel. Undantag (godkännanden, inbjudningar) är **inte** nästa steg; de är blockerare som kräver vuxenbeslut.

---

## Varför finns Hem?

Morgonen är stressig. Föräldern öppnar appen och behöver **inte** ett kontrolltorn, inte ett schemaverktyg och inte en katalog.

Hem svarar på tre saker på en gång:

1. **Hur går det idag?** (per barn, utan jämförelse)
2. **Vad behöver min uppmärksamhet?** (undantag — se definition nedan)
3. **Vad är nästa steg?** (ett — se beslutsregeln)

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

### Copy-regel

| Yta | Beskriver |
|-----|-----------|
| **Hem** | Läget — *hur det går idag* |
| **För dig** | Rekommenderad förändring — *vad som kan bli bättre* |
| **Planering** | Handlingar — *vad som ska byggas eller ändras* |

Coachande språk (*"Testa …"*, *"Du borde …"*) hör hemma i För dig, inte på Hem.

---

## Framgångskriterium

> **När en förälder lämnar Hem ska hen veta om dagen fungerar — och ha gjort det enda som behövdes.**

| Fråga | Om nej → bygg inte |
|--------|---------------------|
| Hjälper det här en stressad morgon? | |
| Flyttar vi byggjobb till Hem? | |
| Bryter det mot beslutsregeln? | |

### Exit Rule

Hem är **färdigt** när föräldern kan säga:

- Jag vet hur dagen ser ut (per barn)
- Jag har gjort det enda vuxenbeslutet som krävdes (eller vet att inget krävs)
- Barnet kan ta över (handoff är tydlig)

---

## Den mentala modellen

```
Jag öppnar appen
        ↓
Jag ser hur det går idag (per barn)
        ↓
Om något kräver mig → tydligt undantagskort
        ↓
Annars → ett rekommenderat nästa steg (beslutsregeln)
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

## Vad är ett undantag?

**Undantag** = något som kräver vuxenbeslut **nu** och inte kan vänta.

| Är undantag | Är inte undantag |
|-------------|------------------|
| ✓ Kräver ett vuxenbeslut | ✗ Tips eller rekommendation |
| ✓ Blockerar barnets fortsättning | ✗ Statistik eller uppmuntran |
| ✓ Kan inte vänta till senare | ✗ Veckobild eller utvecklingsmål |

**Exempel på undantag:** godkännande av belöning, väntande inbjudan, PIN-varning.

**Exempel som inte är undantag:** aktiveringsförslag, kvällsrutin-rekommendation, veckosammanfattning.

`/readiness` visar **endast** undantag. Coach och Journey följer **beslutsregeln** — aldrig parallellt i samma vy.

---

## Priority Ladder

Inget på Hem får bryta ordningen. Högre steg dominerar alltid lägre.

```
1. Safety        →  Godkännanden, blockerare (undantag)
        ↓
2. Status        →  Idag per barn
        ↓
3. Coach         →  Ett nästa steg (beslutsregeln)
        ↓
4. Handoff       →  Barnet loggar in
        ↓
5. Vecka         →  Kort veckobild (under handoff)
```

**Exempel:** Veckodiagram får aldrig ligga ovanför ett blockerande godkännande. Coach får aldrig konkurrera med undantag.

---

## Informationshierarki

Priority Ladder i implementation:

```
1. Kräver åtgärd     →  Endast undantag (godkännande, inbjudan, PIN)
2. Idag per barn     →  Redo för nästa aktivitet (horisontell rad)
3. Ett nästa steg    →  Coach / Journey (ett kort — beslutsregeln)
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

## Success Metrics (PR-granskning)

Produktmått — inte analytics. Varje PR mot Hem ska kunna besvara:

| Mål | Mått |
|-----|------|
| Jenny hittar nästa steg | < 5 sek |
| Ingen scroll krävs för beslut | Ja |
| Antal coacher som föreslår handling | 1 |
| Antal synliga blockerande beslut | ≤ 1 åt gången |
| Tom-state när inget kräver åtgärd | Alltid definierad |
| Filterregeln | Varje ny komponent mappar till en av tre frågor |

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
- Readiness = endast undantag (se definition ovan), inte coach
- Tydlig tom-state när inget kräver åtgärd
- Veckosektion under handoff, inte ovanför (priority ladder)

Se [hem-agent-prompt.md](hem-agent-prompt.md) för agent-uppdrag.
