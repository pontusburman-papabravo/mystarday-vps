# Planering 10/10 — Produktvision

**Status:** Godkänd produktkompass (2026-07)  
**Domän:** `planning`  
**Route:** `/planning` (hub) → `/schedule`, `/library`, `/calendar`, m.fl.  
**Relaterat:** [planering-agent-prompt.md](planering-agent-prompt.md) · [parent-hubs-index.md](parent-hubs-index.md) · [vuxenmeny-v2.md](vuxenmeny-v2.md) §4

---

## Kompassen

> **Planering ska få föräldern att känna: "Jag vet var jag går för att fixa schemat — utan att drunkna i val."**

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
📚 Bibliotek          Scheman, aktiviteter och belöningar
📷 Bildarkiv          Egna foton — tandborste, säng, skola

Planera vardagen
📅 Veckoschema        Redigera barnets vecka
🗓️ Kalender           Månad och specialdagar
```

Max två sektioner synliga utan scroll på iPhone SE.

---

## Vad som ska bort

- Tekniska begrepp i hub-text (*overwrite*, *template*, *item*)
- Paketfunktioner som disabled-rader — dölj tills tillgängliga
- Duplicerade ingångar till samma route med olika namn
- Daglig status / "hur går det idag" på Planering (→ Hem)
- Ny bottenflik per paketfeature

---

## Nuläge vs mål

**Redan på plats:** `planning-hub.js`, två sektioner, `PlanningBackNav`, capability-länkar via `nav-config.js`.

**Kvar för 10/10:**

- Konsekvent utfallscopy på alla länkar (inga tekniska underrader)
- Hub-tom-state för ny familj (*Börja i Biblioteket eller För dig*)
- Verifiera max-höjd mobil utan scroll
- Boendeschema synligt men inte dominerande för enkelfamiljer

Se [planering-agent-prompt.md](planering-agent-prompt.md) för agent-uppdrag.
