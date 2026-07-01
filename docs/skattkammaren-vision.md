# Skattkammaren 10/10 — Produktvision (barn)

**Status:** Godkänd produktkompass (2026-07)  
**Domän:** `child_rewards` / Min värld  
**Route:** `/child-dashboard#rewards` (idag) · `/child/world` (barnmeny v2) · `/skattkammaren?demo=1` (publik demo)  
**Relaterat:** [skattkammaren-agent-prompt.md](skattkammaren-agent-prompt.md) · [beloningar-vision.md](beloningar-vision.md) (förälder) · [informationsarkitektur-barnapp.md](informationsarkitektur-barnapp.md) · [barnmeny-v2.md](barnmeny-v2.md) §3.4 · [mockups/beloningar.html](mockups/beloningar.html)

---

## Kompassen

> **Skattkammaren ska få barnet att känna: "Jag ser mina stjärnor — jag vet vad jag sparar till — och jag vet om jag kan fråga om en belöning."**

### Filterregel

> **Om en komponent inte hjälper barnet förstå stjärnor, mål eller belöningsläget inom fem sekunder, hör den inte hemma ovanför fold på Skattkammaren.**

Innan något läggs till: *"Hjälper detta barnet att (1) se sina stjärnor, (2) förstå sitt mål eller (3) veta vad hen kan göra här?"* Om svaret är *inget* — flytta under fold eller ta bort.

### Beslutsregel

> **På Skattkammaren får det aldrig finnas mer än en primär handling synlig åt gången — och lösa in / välja mål dominerar alltid utforskning.**

När barnet har råd med sitt mål är *Fråga om att lösa in* den enda primära knappen. Schema, inställningar och vuxenfunktioner hör **inte** hemma här (C-01).

---

## Varför finns Skattkammaren?

Stjärnor är bränsle till en meningsfull värld — inte poängjakt (G-01, R-02). Barnet behöver:

1. **Se** hur många stjärnor som finns
2. **Förstå** vad hen sparar till (mål)
3. **Veta** om hen kan fråga om en belöning nu

Föräldern styr utbud och godkänner i **Belöningar** (`/rewards`). Barnet upplever här.

---

## Problemet vi löser

> *"Jag har stjärnor men vad gör jag med dem? Och hur långt är det till filmkvällen?"* — Olle, 7 år

Stjärnor, mål, butik, troféer och universum **blandas** om Skattkammaren inte äger sin domän tydligt. Barnet ska inte behöva jaga svar i tre sektioner.

---

## Produktprincip

> **Skattkammaren = stjärnburken + mål + belöningslista. Universum och troféer = utforskning under fold.**

| Skattkammaren är | Skattkammaren är inte |
|------------------|----------------------|
| Stjärnsaldo i hero | Schema / Idag-uppdrag |
| Progress mot mål | Syskonjämförelse |
| Belöningslista med tydlig progress | Vuxen godkännande-UI |
| En primär handling (lösa in / välj mål) | Statistikdashboard |
| Status *väntar på svar* (informativ) | Skuld eller skam vid nej |

**POS:** C-01 (inga barnformulär), C-03 (en primär handling), G-01 (verklighet före firande), G-04 (firande ≤2s), R-02 (stjärnor ej köpbara).

### Copy-regel

| Yta | Beskriver |
|-----|-----------|
| **Skattkammaren / Min värld** | Barnets belöningsvärld — *stjärnor, mål, belöningar* |
| **Idag** | Handling — *vad jag ska göra nu* |
| **Belöningar** (förälder) | Styrning — *godkännande och utbud* |
| **Stjärnburken** | Barnspråk för saldo — inte "ekonomi" eller "poäng" |

Barnet ser *Stjärnburken* och *Belöningar* — inte föräldertext som *Hantera belöningar*.

---

## Framgångskriterium

> **När barnet öppnar Skattkammaren ska hen omedelbart se sina stjärnor — och förstå hur nära målet är.**

| Fråga | Om nej → bygg inte |
|--------|---------------------|
| Hjälper det här Olle förstå stjärnor eller mål? | |
| Flyttar vi schema eller checklist-hit? | |
| Bryter det mot beslutsregeln (flera primära knappar)? | |

### Exit Rule

Skattkammaren är **färdig** när barnet kan säga:

- Jag vet hur många stjärnor jag har
- Jag vet vad jag sparar till (eller att jag ska välja mål)
- Jag vet om jag kan fråga om en belöning (eller att jag måste samla mer)

---

## Den mentala modellen

```
Jag öppnar Skattkammaren
        ↓
Jag ser mina stjärnor (hero)
        ↓
Jag ser hur nära mitt mål jag är
        ↓
Finns en tydlig handling? → en knapp (lösa in eller välj mål)
        ↓
Jag scrollar → fler belöningar, troféer, världen
```

**Idag = handling. Skattkammaren = mening.** De får inte konkurrera som "hem" (se informationsarkitektur §8).

---

## Tre frågor — alltid besvarade (standardvy)

| # | Fråga | Rätt | Fel |
|---|--------|------|-----|
| 1 | Hur många stjärnor har jag? | *Stor siffra i hero — "12 stjärnor"* | Gömt i sidhuvud eller liten etikett |
| 2 | Vad sparar jag till? | *Progress: "12 av 30 till Filmkväll"* | Separat sektion längre ner utan koppling |
| 3 | Kan jag göra något här? | *En knapp: Fråga om att lösa in* eller *Välj mål* | Tre likadana knappar · ingen väg framåt |

**Designregel:** Hero + primär handling **ovanför** belöningslistan — samma hierarki som [mockups/beloningar.html](mockups/beloningar.html).

---

## Vad är status — inte handling?

**Status** på Skattkammaren = information som inte kräver barnets beslut **nu**.

| Är status | Är inte status |
|-----------|----------------|
| ✓ *Väntar på svar* efter begäran | ✗ Ny belöningsreklam |
| ✓ *Inte den här gången* (vänligt, utan skuld) | ✗ Veckosammanfattning |
| ✓ Tom troféhylla **dold** | ✗ "Inga troféer ännu" som tar hero-plats |

Pending synkas med förälderns **Belöningar** — samma `reward_redemption` data, inte dubbel logik.

---

## Priority Ladder

```
1. Primär handling   →  Fråga om att lösa in ELLER Välj mål (max 1 knapp)
        ↓
2. Stjärnburken      →  Hero: saldo + progress mot mål
        ↓
3. Belöningar        →  Lista med progress + "Klar!" när råd
        ↓
4. Status            →  Väntar på svar / Inte den här gången (om relevant)
        ↓
5. Utforskning       →  Troféer, bonus-stjärnor, historik, universum
```

**Exempel:** Troféhylla får aldrig ligga ovanför en tydlig *Fråga om att lösa in*-knapp.

### Gräns mot Idag (låst)

Skattkammaren har **ingen** *"vad ska jag göra nu"* — det äger **Idag**. Ingen checklist, ingen NU/NÄSTA-coach här.

---

## Informationshierarki

Priority Ladder i implementation — se ovan. Mockup: hero mörk gradient → vit lista med progress bars.

---

## Olle-test (Definition of Done)

Ett barn (eller vuxen som testar barnvy) som öppnar Skattkammaren ska inom **5 sekunder**, **utan scroll**, kunna svara:

1. **Hur många stjärnor har jag?**
2. **Vad sparar jag till?**
3. **Kan jag göra något här?**

### Olle-test godkänt (målbild)

```
Lova · Stjärnburken

        12
   stjärnor samlade
[████████░░░░] 12 av 30 till Filmkväll

[ 📨 Fråga om att lösa in ]        ← endast om råd; annars dold

● Belöningar
🍿 Filmkväll        [Klar!]  12/15 ⭐
📖 Ny bok                    12/30 ⭐
```

Om inget mål: hero visar *Välj vad du sparar till* + primär *Välj mitt mål*. Tom troféhylla: **dold**.

---

## Success Metrics (PR-granskning)

| Mål | Mått |
|-----|------|
| Olle ser stjärnor | < 5 sek |
| Olle ser mål/progress | < 5 sek |
| Ingen scroll för primär förståelse | Ja |
| Antal primära handlingar synliga | ≤ 1 |
| Tom-state utan brus | Ja (dölj tom troféhylla) |
| Filterregeln | Varje komponent = stjärnor, mål eller handling |
| Syskonjämförelse | Nej (C-05) |
| Firande på inlösen | ≤ 2s, skippbart (G-04) |

---

## Vad som ska bort

- Flera primära knappar samtidigt (*Fråga* på mål + *Du har råd nu!*-remsa)
- Tom troféhylla som tar plats
- 3-kolumns grid utan progress (ersätts av lista med bars)
- Schema/checklist-element i Skattkammaren
- Syskonleaderboard · stjärn-IAP (R-02)
- Skuldbeläggande copy vid nekad belöning

---

## Nuläge vs mål

**Redan på plats:** `child-dashboard-rewards.js`, mål (`/api/me/goal`), inlösen, troféer, pending/denied-vänlig copy, universum via `child-skatt-house.js`, offline-cache.

**Implementerat (10/10 v1):**

- Hero enligt mockup (Stjärnburken + progress mot mål)
- Belöningslista med progress bars och *Klar!*
- En primär handling (beslutsregel)
- Tom troféhylla dold
- Konstitution: denna fil + agent-prompt

**Kvar (ev. senare):**

- Olle-test med riktiga barn (5-sekundersregeln)
- Barnmeny v2 `/child/world` route-migrering

Se [skattkammaren-agent-prompt.md](skattkammaren-agent-prompt.md) för agent-uppdrag.
