# Planering 10/10 — Produktvision

**Status:** Godkänd produktkompass (2026-07)  
**Domän:** `planning`  
**Route:** `/planning` (hub) → `/schedule`, `/library`, `/calendar`, m.fl.  
**Relaterat:** [planering-agent-prompt.md](planering-agent-prompt.md) · [parent-hubs-index.md](parent-hubs-index.md) · [vuxenmeny-v2.md](vuxenmeny-v2.md) §4

---

## Kompassen

> **Planering ska få föräldern att känna: "Jag vet var jag går för att fixa schemat — utan att drunkna i val."**

**Metafor (designtest):**

> **Planering ska kännas som en reception med två skyltar — inte ett kontrollrum.**

---

## Varför finns Planering?

När vardagen **inte** fungerar behöver föräldern bygga och justera — schema, aktiviteter, kalender, bibliotek.

Problemet idag: verktygen finns, men de är **utspridda** och heter saker föräldrar inte tänker i (*veckoschema*, *tilldela schema*, *standardbibliotek*).

Planering är **förälderns byggverkstad** — en tydlig ingång till rätt verktyg.

---

## Problemet vi löser

> *"Jag vill ändra kvällsschemat — var börjar jag?"* — Jenny

Föräldern ska inte behöva gissa om det är Bibliotek, Schema eller Kalender.

Det är ett **navigations- och språkproblem** — inte ett funktionsproblem.

---

## Produktprincip

> **Planering = bygg. Hem = kör. För dig = paketera färdigt.**

| Planering är | Planering är inte |
|--------------|-------------------|
| Hub till byggverktyg | Daglig status |
| Tydliga föräldrajobb | Feature-lista per paket |
| Två sektioner max i standardvy | Lång länklista utan gruppering |
| Ingång till bibliotek | Ersättning av `/library` eller `/schedule` |

**POS:** B-08 omvänt — bygg **hör hemma här**, inte på Hem.

---

## Filterregel (vad får finnas)

> **Om en länk inte hjälper föräldern att bygga innehåll eller planera vardagen hör den inte hemma i Planering.**

| Hör hemma | Hör inte hemma |
|-----------|----------------|
| Skapa/redigera aktiviteter, belöningar, schema | Daglig status (*hur går det idag?*) |
| Kalender, specialdagar, tilldelning | Paketdump med disabled rader |
| Bildarkiv, PDF-export | Duplicerade ingångar till samma route |
| Boendeschema (när relevant) | Coach, journey, nästa steg |

**Beslutstest:** Kan föräldern *bygga* eller *planera* något genom att trycka? Annars → flytta till Hem, Familj eller paketdetalj.

---

## Framgångskriterium

> **När en förälder öppnar Planering ska hen inom fem sekunder veta vilken dörr som leder till det hen vill göra.**

---

## Den mentala modellen

```
Jag behöver ändra något i vardagen
        ↓
Jag öppnar Planering
        ↓
Jag ser två tydliga grupper: innehåll vs planera
        ↓
Jag trycker rätt ingång
        ↓
Jag är i rätt verktyg (schema, bibliotek, kalender)
```

---

## Tre frågor — alltid besvarade (standardvy)

| # | Fråga | Rätt | Fel |
|---|--------|------|-----|
| 1 | Vad kan jag göra här? | *Bygga innehåll · Planera vardagen* | 8 likadana rutor utan grupp |
| 2 | Var går jag för schema? | *Veckoschema — Redigera barnets vecka* | *Veckoschema* utan förklaring |
| 3 | Känns det överbefolkat? | Max ~8 ingångar i två sektioner | 15 länkar + paketdump |

**Designregel:** Rubriker ska vara **föräldrajobb**, inte tekniska modulnamn.

---

## Copy-regel (varje länk)

> **Varje länk ska svara på: "Vad händer när jag trycker här?"**

| Länk | Underrad (utfallscopy) |
|------|------------------------|
| **Veckoschema** | Redigera barnets vecka |
| **Bibliotek** | Skapa aktiviteter och belöningar |
| **Kalender** | Se månad och specialdagar |
| **Bildarkiv** | Egna foton — tandborste, säng, skola |
| **Boendeschema** | Växelvis boende mellan hushåll |
| **Tilldela schema** | Kopiera schema till barn |
| **Daglig logg** | Se och justera tidigare dagar |
| **PDF** | Skriv ut schema |

**Designregel:** Titel = *vad* · Underrad = *vad som händer*.

---

## Informationshierarki

```
1. Sida-rubrik        →  Planering
2. Sektion A          →  Bygg innehåll (Bibliotek, Bildarkiv)
3. Sektion B          →  Planera vardagen (Schema, Kalender, Daglig logg, …)
4. Paket-capabilities →  Endast om köpt + synlig (Rapporter, TEACCH, …)
5. Tillbaka-nav       →  Konsekvent från undersidor (planFromPlanning)
```

### Sektioner (låst)

| Sektion | Ingångar (basic) | Föräldratext |
|---------|------------------|--------------|
| **Bygg innehåll** | Bibliotek, Bildarkiv | *Scheman, aktiviteter och belöningar* |
| **Planera vardagen** | Boendeschema, Veckoschema, Daglig logg, PDF, Kalender, Tilldela schema | Konkret underrad per länk |

---

## Ovanför folden (iPhone SE)

> **Allt som krävs för Jenny-testet ska synas utan scroll på iPhone SE (375×667).**

### Vad som alltid ska synas ovanför folden

1. Sidrubrik *Planering*
2. Båda sektionsrubrikerna (*Bygg innehåll* · *Planera vardagen*)
3. **Veckoschema** (med utfallscopy)
4. **Bibliotek** (med utfallscopy)
5. **Kalender** (med utfallscopy)

### Prioriteringsregel (när allt inte får plats)

När utrymmet är begränsat — behåll synlighet i denna ordning:

1. **Veckoschema**
2. **Bibliotek**
3. **Kalender**
4. **Bildarkiv**
5. **Övrigt** (Boendeschema, Daglig logg, PDF, Tilldela schema, paketfeatures)

Lägre prioritet får scrollas under folden eller grupperas i *Övrigt* — aldrig högre prioritet än Veckoschema.

**PR-granskning:** Screenshot iPhone SE portrait ska visa minst punkterna 1–5 ovanför folden.

---

## Boendeschema-regel

> **Boendeschema visas som sekundär länk om familjen inte har växelvis boende eller flera hushåll.**

| Familjesituation | Placering |
|------------------|-----------|
| Enkelfamilj, ett hushåll | Dölj eller visa under *Övrigt* — aldrig ovanför Veckoschema |
| Växelvis boende / flera hushåll aktiverat | Synlig i *Planera vardagen*, med underrad *Växelvis boende mellan hushåll* |

Boendeschema ska **aldrig dominera** hubben för majoriteten (enkelfamiljer).

---

## Tom-state — ny familj

När familjen saknar schema eller aktiviteter ska hubben visa en kort vägledning — inte tom yta.

**Exempel:**

> **Kom igång**
>
> Börja i Biblioteket om du vill skapa aktiviteter.
>
> Gå till För dig om du vill få en färdig rekommendation.

**Regler:**

- Max två rader vägledning + två tydliga länkar
- Ingen skuld eller tom dashboard-känsla
- Länka till `/library` och `/for-dig` — inte tekniska onboarding-steg

---

## Språk — utfallscopy

| Internt / tekniskt | Förälder ser |
|--------------------|--------------|
| `weekly_schedule` | Veckoschema |
| `assign-schedule` | Tilldela schema |
| `default_activity_template` | *(dold)* |
| `standardbibliotek` | Bibliotek |
| `schedule_date_exclusion` | *(dold i hub — finns i schema)* |

---

## Jenny-test (Definition of Done)

En förälder som aldrig sett Planering ska inom **5 sekunder**, **utan scroll**, kunna svara:

1. **Vad kan jag göra här?** (två grupper räcker)
2. **Var går jag för att ändra barnets vecka?**
3. **Var skapar jag en ny aktivitet?** (→ Bibliotek)

### Jenny-test godkänt (målbild)

```
Planering

Bygg innehåll
📚 Bibliotek          Skapa aktiviteter och belöningar
📷 Bildarkiv          Egna foton — tandborste, säng, skola

Planera vardagen
📅 Veckoschema        Redigera barnets vecka
🗓️ Kalender           Se månad och specialdagar
```

Max två sektioner synliga utan scroll på iPhone SE. Veckoschema, Bibliotek och Kalender ovanför folden.

---

## Vad som ska bort

- Tekniska begrepp i hub-text (*overwrite*, *template*, *item*)
- Paketfunktioner som disabled-rader — dölj tills tillgängliga
- Duplicerade ingångar till samma route med olika namn
- Daglig status / "hur går det idag" på Planering (→ Hem)
- Ny bottenflik per paketfeature
- Länkar som inte klarar filterregeln

---

## Nuläge vs mål

**Redan på plats:** `planning-hub.js`, två sektioner, `PlanningBackNav`, capability-länkar via `nav-config.js`.

**Kvar för 10/10:**

- Konsekvent utfallscopy på alla länkar (copy-regeln)
- Hub-tom-state för ny familj (se exempel ovan)
- Verifiera ovanför-folden på iPhone SE (prioriteringsregeln)
- Boendeschema sekundärt för enkelfamiljer

Se [planering-agent-prompt.md](planering-agent-prompt.md) för agent-uppdrag.
