# Mina personer 10/10 — Produktvision (barn)

**Status:** Produktkompass (utkast 2026-07) — **vision först, ingen implementation**  
**Domän:** Barnets relationsyta (`family` i kod · **Mina personer** i UI)  
**Relaterat:** [mina-personer-agent-prompt.md](mina-personer-agent-prompt.md) · [idag-vision.md](idag-vision.md) · [skattkammaren-vision.md](skattkammaren-vision.md) · [informationsarkitektur-barnapp.md](informationsarkitektur-barnapp.md) §6 · [barnmeny-v2.md](barnmeny-v2.md) §3.5

> **Teknikagnostiskt.** Implementation får **inte** påbörjas förrän denna vision är godkänd och agent-uppdrag finns.

---

## Kompassen

> **Mina personer ska få barnet att känna: "Jag är inte ensam — jag vet vem som hjälper mig — och jag känner igen dem."**

### Filterregel

> **Om en komponent inte hjälper barnet känna trygghet kring *vem som finns* inom fem sekunder, hör den inte hemma ovanför fold på Mina personer.**

Frågor innan ny UI ovanför fold:

1. *Vem finns här för mig?*
2. *Känner jag igen personen?*
3. *Känner jag mig ensam?* (svaret ska vara nej)
4. *Vad gör vi tillsammans?* (varm rad — inte statistik)

Om svaret är *inget* → flytta under fold eller ta bort.

### Beslutsregel

> **På Mina personer finns ingen checklista och ingen primär uppmaning som konkurrerar med Idag.**

Relation är **trygghet**, inte nästa uppgift. Max **en** mjuk sekundär handling (t.ex. *Säg hej* / *Visa något jag gjort*) — aldrig schema, aldrig belöningsloop.

---

## Varför finns Mina personer?

Barnet behöver **relation**, inte funktion (POS: handling → mening → relation).

| Mina personer är | Mina personer är inte |
|------------------|----------------------|
| Personkort — ansikte, namn, roll | Socialt nätverk |
| Värme: *"De som hjälper mig"* | Family-graph / org-chart |
| Lugn *Vi tillsammans*-känsla | Statistikdashboard |
| Pedagog som **person** bland personer | Pedagog som egen app/flik |
| Berättelse (*vi klarade kvällen*) | Poäng, jämförelse, skuld |

**POS:** C-01, P-02, C-05 (inga syskonjämförelser), P-04 (ingen parent dashboard på barnhem).

### Copy-regel

| Yta | Språk |
|-----|--------|
| **Barnetikett** | *Mina personer* (❤️) — aldrig "Familj" som rubrik |
| **Underrubrik** | *De som hjälper mig* |
| **Undvik i barn-UI** | Familjeskista, familjeprojekt, event-feed, KPI |

---

## Icke-mål

Mina personer ska **inte**:

- Ersätta **Idag** (handling) eller **Skattkammaren** (mening)
- Visa **syskonleaderboard** eller jämförelse mellan barn
- Vara **ekonomi** — familjestjärnor som separat valuta synlig för barnet
- Kräva att barnet **förstår en graf** för att känna trygghet
- Dölja relationen **bakom Mer** som fjärde klass nav (v2: primärvärld)
- Visa **vuxeninställningar**, rapporter eller konfiguration utan Parental Gate

---

## Problemet vi löser

> *"Vem hjälper mig egentligen? Är det bara jag?"* — barn med NPF, delad vårdnad, eller pedagog i skolan

Idag och Skattkammaren driver **jag**. Mina personer ska svara på **vi** — utan att bli ännu en prestationsyta.

---

## Produktprincip

> **Mina personer = personer först. Gemensamt mål och berättelse = tyst bakgrund.**

```
situation     →  Idag        (vad gör jag?)
mening        →  Min värld   (varför?)
trygghet      →  Mina personer (vem finns?)
```

---

## Olle-test (Definition of Done)

Inom **5 sekunder**, **utan scroll**:

| # | Fråga | Var i UI |
|---|--------|----------|
| 1 | Vem finns här för mig? | Personkort ovanför fold |
| 2 | Känner jag igen dem? | Ansikte / emoji / namn |
| 3 | Känner jag mig ensam? | Flera igenkännbara personer — tomhet ska kännas okej, inte övergiven |
| 4 | Vad gör vi tillsammans? | En varm rad — *Vi tillsammans* / senaste gemensamma stund |

### Exit Rule

Barnet kan säga:

- Jag vet vem som hjälper mig
- Jag känner igen dem
- Jag är inte ensam här
- Jag förstår att vi hör ihop (utan siffror)

---

## Tillståndsmaskin (exklusiv)

Skärmen har **exakt ett aktivt tillstånd** åt gången.

| Tillstånd | När | Hero | Primär handling | Status |
|-----------|-----|------|-----------------|--------|
| **Growing circle** | Få eller inga personer kopplade än | Vänlig välkomst | Ingen | *Fler kan läggas till* |
| **Together** | Minst en igenkännbar person | Personkort | Ingen (ev. mjuk sekundär) | — |
| **Warm moment** | Nyligen gemensam händelse (kort) | Person + varm rad | Ingen | Firande ≤2s (G-04) |
| **Away** | Känd person temporärt otillgänglig (t.ex. annan förälder vecka B) | Person kvar, lugn status | Ingen | *Hos mamma/pappa den här veckan* — aldrig skuld |

### Prioritet

```
Warm moment     (kortlivat, ≤2s)
        ↓
Away            (status om relevant — inte skuld)
        ↓
Together
        ↓
Growing circle
```

**Regel:** Inga tillstånd får visa checklista, stjärnjakt eller jämförelse.

---

## Visuell prioritering

```
1. Personkort          →  Mamma, Pappa, pedagog … (igenkännbara)
        ↓
2. Varm gemensam rad   →  "Vi tillsammans" / en berättelserad
        ↓
3. Sekundärt           →  gemensamt mål (tonat), tidigare stunder under fold
```

**Inte ovanför fold:** familjeskista-siffror, projektprogress som KPI, event-feed som logg, syskonranking.

---

## Personkort — vad ett kort ska innehålla

| Element | Prioritet | Exempel |
|---------|-----------|---------|
| Ansikte / emoji / foto | Primär | 👩 |
| Namn barnet använder | Primär | Mamma |
| Roll (om behövs) | Sekundär | *Hjälper mig hemma* |
| Varm rad | Sekundär | *Vi läste saga igår* |
| Siffror / stjärnor / jämförelse | **Aldrig** på kortet | — |

### Sortering

```
1. Primär vårdnadshavare / mest kontakt (om data finns)
        ↓
2. Övriga föräldrar / delad vårdnad
        ↓
3. Syskon (utan jämförelse)
        ↓
4. Pedagog / trygg vuxen (som person — inte "system")
```

---

## Gränser mot Idag och Skattkammaren (låst)

| Fråga | Idag | Skattkammaren | Mina personer |
|--------|------|---------------|---------------|
| Vad gör jag nu? | Ja | Nej | Nej |
| Varför / stjärnor? | Nej | Ja | Nej |
| Vem hjälper mig? | Nej | Nej | Ja |
| Checklista | Ja | Nej | **Nej** |
| Primär CTA | Bocka av | Lösa in / välj mål | **Ingen** |

**Familj = berättelse, inte ekonomi.** Gemensamma stjärnor eller projekt får finnas **under fold** som lugn bakgrund — barnet ska inte behöva dem för trygghet.

---

## Tomma lägen

| Läge | Visas | Visas inte |
|------|-------|------------|
| **Growing circle** | *Här visas de som hjälper dig* + vänlig väntan | Tom vit yta |
| **En person** | Ett kort + *Du har någon här* | "Lägg till fler" som press |
| **Offline** | Sparade personer + etikett | Fel som barnets ansvar |
| **Laddar** | Skeleton personkort | Spinner utan kontext |
| **Fel** | *Försök igen* | Teknisk kod |

---

## Vanliga felidéer (varför inte?)

| Felidé | Varför inte? |
|--------|--------------|
| ❌ Familjeskista som hero | Ekonomi — inte trygghet |
| ❌ Syskonjämförelse | C-05, bryter "inte ensam" |
| ❌ Checklista i Mina personer | Idag äger handling |
| ❌ Pedagog som egen flik | Person bland personer |
| ❌ Mer-meny som gömmer relation | v2: primärvärld |
| ❌ Statistik / museum framträdande | Bakåtblick för vuxen — inte barnets fråga |
| ❌ Chatt / DM mellan barn | C-01, scope explosion |
| ❌ Primär "Gör något för familjen" | Konkurrerar med Idag |

---

## Vad som ska bort (från nuvarande V0-tänk)

- **Familjehallen** som mekanik först — personer ska leda
- **Event-feed** som huvudinnehåll — byt till en varm rad
- **Projektprogress** ovanför fold
- **"Familj"** som rubrik i barn-UI

*Befintlig kod (`child-family-hall.js`) är utgångspunkt — inte målbild.*

---

## Success Metrics (när implementation sker)

| Mål | Mått |
|-----|------|
| Olle ser igenkännbara personer | < 5 sek |
| Olle känner sig inte ensam | Kvalitativt / test med barn |
| Inget ovanför fold utan filtermotivering | Ja |
| Primära uppmaningar | 0 (max 1 mjuk sekundär) |
| Syskonjämförelse | Nej |
| POS C-01, C-05, P-02 | Ja |

---

## Öppna frågor (kräver produktbeslut före implementation)

1. **Delad vårdnad** — hur visas *Away* utan att skapa skuld hos barnet?
2. **Pedagog** — samma personkort som förälder, eller diskret badge?
3. **Syskon** — visas alltid, eller endast om aktiverat av förälder?
4. **Gemensamt mål** — under fold från dag ett, eller senare fas?
5. **Foto vs emoji** — fallback-kedja (samma princip som barnprofil)?

*Ingen implementation ska gissa svar — ADR eller uppdatering av denna vision.*

---

**Enda sanningskälla för tillstånd:** § Tillståndsmaskin ovan.  
Implementation (när godkänd) → [mina-personer-agent-prompt.md](mina-personer-agent-prompt.md).

*Senast uppdaterad: 2026-07-01*
