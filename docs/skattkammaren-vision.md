# Skattkammaren 10/10 — Produktvision (barn)

**Status:** Godkänd produktkompass (2026-07)  
**Domän:** Barnets belöningsvärld (Min värld)  
**Relaterat:** [skattkammaren-agent-prompt.md](skattkammaren-agent-prompt.md) · [beloningar-vision.md](beloningar-vision.md) (förälder) · [informationsarkitektur-barnapp.md](informationsarkitektur-barnapp.md) · [barnmeny-v2.md](barnmeny-v2.md) §3.4 · [mockups/beloningar.html](mockups/beloningar.html)

> **Detta dokument är teknikagnostiskt.** Implementation, filer och tester finns i [skattkammaren-agent-prompt.md](skattkammaren-agent-prompt.md).

---

## Kompassen

> **Skattkammaren ska få barnet att känna: "Jag ser mina stjärnor — jag vet vad jag sparar till — och jag vet vad jag kan göra härnäst."**

### Filterregel

> **Om en komponent inte hjälper barnet förstå stjärnor, mål eller belöningsläget inom fem sekunder, hör den inte hemma ovanför fold på Skattkammaren.**

Innan något läggs till: *"Hjälper detta barnet att (1) se sina stjärnor, (2) förstå sitt mål eller (3) veta vad hen kan göra här?"* Om svaret är *inget* — flytta under fold eller ta bort.

**Processregel (regression):** Ingen ny komponent får placeras **ovanför hero** utan att motiveras skriftligt mot filterregeln i PR.

### Beslutsregel

> **På Skattkammaren får det aldrig finnas mer än en primär handling synlig åt gången — och möjligheten att lösa in eller välja mål prioriteras alltid före utforskning.**

När tillståndet är *Redeem available* är *Fråga om att lösa in* den enda primära knappen. Schema, inställningar och vuxenfunktioner hör **inte** hemma här (C-01).

---

## Varför finns Skattkammaren?

Stjärnor är bränsle till en meningsfull värld — inte poängjakt (G-01, R-02). Barnet behöver:

1. **Se** hur många stjärnor som finns
2. **Förstå** vad hen sparar till (mål)
3. **Veta** vad nästa steg är — fråga om belöning, välja mål, eller samla mer

Föräldern styr utbud och godkänner i **Belöningar**. Barnet upplever här.

---

## Problemet vi löser

> *"Jag har stjärnor men vad gör jag med dem? Och hur långt är det till filmkvällen?"* — Olle, 7 år

Stjärnor, mål, butik, troféer och universum **blandas** om Skattkammaren inte äger sin domän tydligt. Barnet ska inte behöva jaga svar i tre sektioner.

---

## Produktprincip

> **Skattkammaren = stjärnburken + mål + belöningslista. Universum och troféer = utforskning under fold.**

| Skattkammaren är | Skattkammaren är inte |
|------------------|----------------------|
| Hero: stjärnor + mål tillsammans | Schema / Idag-uppdrag |
| Belöningslista med tydlig progress | Syskonjämförelse |
| En primär handling (lösa in / välj mål) | Vuxen godkännande-UI |
| Status *väntar på svar* (informativ) | Statistikdashboard |
| | Skuld eller skam vid nej |

**POS:** C-01, C-03, G-01, G-04, R-02.

### Copy-regel

| Yta | Beskriver |
|-----|-----------|
| **Skattkammaren / Min värld** | Barnets belöningsvärld — *stjärnor, mål, belöningar* |
| **Idag** | Handling — *vad jag ska göra nu* |
| **Belöningar** (förälder) | Styrning — *godkännande och utbud* |
| **Stjärnburken** | Barnspråk för saldo — inte "ekonomi" eller "poäng" |

---

## Icke-mål

Skattkammaren ska **inte**:

- Ersätta **Idag** · vara **butik** · vara **spelhub**
- Visa **statistik** · **familjejämförelser** · **föräldrainställningar**
- Skapa **skuld** vid nekad belöning
- Visa *köp något annat* som **primär** CTA medan en begäran **väntar**

---

## Framgångskriterium

> **När barnet öppnar Skattkammaren ska hen omedelbart se sina stjärnor och sitt mål — och förstå vad nästa steg är.**

### Exit Rule

Skattkammaren är **färdig** när barnet kan säga:

- Jag vet hur många stjärnor jag har
- Jag vet vad jag sparar till (eller att jag ska välja mål)
- Jag vet om jag kan fråga om en belöning (eller att jag måste samla mer)
- **Jag vet vad nästa steg är**

---

## Informationsarkitektur (domän)

```
Barnappen → Min värld → Skattkammaren
                              │
                    Hero (stjärnor + mål)
                              │
                    Primär handling (om tillåten)
                              │
                         Belöningar
                              │
                    Status · Utforskning
```

**Idag = handling. Skattkammaren = mening.**

---

## Den mentala modellen

Samma ordning som Olle-testet och visuell prioritering:

```
Jag öppnar Skattkammaren
        ↓
Hero — stjärnor + mål (en nivå)
        ↓
Primär handling? (max en knapp)
        ↓
Belöningslista
        ↓
Status · troféer · världen
```

Olle-testet motsvarar:

1. Hur många stjärnor? → **hero**
2. Vad sparar jag till? → **hero** (samma nivå)
3. Kan jag göra något här? → **primär handling**
4. Vad är nästa steg? → **tillståndsmaskin**

---

## Visuell prioritering

När komponenter konkurrerar om uppmärksamhet — **en ordning, ingen motsägelse** mot mental modellen:

```
1. Hero              →  Stjärnburken + mål (stjärnor och progress tillsammans)
        ↓
2. Primär handling   →  Fråga om att lösa in ELLER Välj mål (max 1 knapp)
        ↓
3. Belöningar        →  Sorterad lista med progress + "Klar!" när råd
        ↓
4. Status            →  Väntar på svar / Inte den här gången
        ↓
5. Utforskning       →  Troféer, bonus-stjärnor, historik, universum
```

**Exempel:** Troféhylla får aldrig ligga ovanför hero. Status får aldrig se ut som primär CTA.

### Gräns mot Idag (låst)

Ingen checklist, ingen NU/NÄSTA-coach i Skattkammaren.

---

## Tre frågor — alltid besvarade (standardvy)

| # | Fråga | Var i UI | Fel |
|---|--------|----------|-----|
| 1 | Hur många stjärnor har jag? | Hero | Gömt i sidhuvud |
| 2 | Vad sparar jag till? | Hero (samma block) | Separat sektion utan koppling |
| 3 | Kan jag göra något här? | Primär handling | Flera likadana knappar |

---

## Primär handling, sekundär och status

| Typ | Vad det är | Visuellt | Exempel |
|-----|------------|----------|---------|
| **Primär** | Det enda barnet ska göra **nu** | Stor, fylld knapp | *Fråga om att lösa in* · *Välj mitt mål* |
| **Sekundär** | Valfritt | Textlänk · rad i lista | *Byt mål* · tryck på belöningsrad med *Klar!* |
| **Status** | Information · inget beslut nu | Diskret · ingen knappform | *Väntar på svar* |

**Regel:** Status ska **aldrig** presenteras som en primär uppmaning.

**Regel vid pending:** Andra belöningar med *Klar!* i listan är **sekundära** — ingen extra primär *Fråga om annat*.

---

## Tillståndsmaskin (exklusiv)

Skärmen har **exakt ett aktivt tillstånd** åt gången. Inga överlappande flaggor i UI-logiken.

| Tillstånd | När | Hero | Primär knapp | Status |
|-----------|-----|------|--------------|--------|
| **No goal** | Inget mål valt | Stjärnor + *Välj vad du sparar till* | *Välj mitt mål* | — |
| **Collecting** | Mål finns, inte råd, inget pending | Stjärnor + progress mot mål | Ingen | — |
| **Redeem available** | Mål finns, råd, inget pending | Stjärnor + progress mot mål | *Fråga om att lösa in* | — |
| **Awaiting decision** | Minst en pending begäran | Stjärnor + progress mot mål | **Ingen** | *Väntar på svar* |
| **Denied** | Senaste svaret nej (visas kort) | Stjärnor + progress | Ingen | *Inte den här gången* |
| **Completed** | Belöning just godkänd (övergång) | Uppdaterat saldo | Ingen | Kort firande ≤2s |

### Prioritet när flera villkor är sanna

Välj **ett** tillstånd — högst vinner:

```
Awaiting decision   (pending finns)
        ↓
Completed           (godkänd just nu — kortlivat)
        ↓
Denied              (nekad nyligen — status, inte ny primär)
        ↓
Redeem available    (råd med mål, inget pending)
        ↓
Collecting          (mål finns, inte råd)
        ↓
No goal
```

**Exempel — överskott av stjärnor + pending:**

> 40 ⭐ · Filmkväll (mål) kostar 20 · begäran pending

| | |
|--|--|
| **Tillstånd** | *Awaiting decision* (pending vinner över redeem available) |
| **Hero** | 40 stjärnor + progress mot Filmkväll |
| **Primär** | Ingen — barnet ska inte skicka fler begäranden nu |
| **Status** | *Väntar på svar* för Filmkväll |
| **Lista** | Andra belöningar med *Klar!* får synas — **sekundärt** (tryck på rad), aldrig som andra primärknapp |

Efter godkännande: tillstånd → *Completed* (kort) → sedan *Collecting* eller *Redeem available* beroende på nytt saldo och mål.

### Första gången (onboarding)

Eget tillfälle av *No goal* — samma maskin, inga undantag:

```
Öppnar Skattkammaren första gången
        ↓
0 stjärnor · inget mål  →  tillstånd: No goal
        ↓
Hero + primär: Välj mitt mål
        ↓
Belöningslista (vad som finns att spara till)
        ↓
Klart
```

---

## Belöningslistan — sortering

Alla implementationer ska sortera likadant:

```
1. Aktivt mål (om satt)
        ↓
2. Belöningar barnet snart har råd med (högst progress, ej pending)
        ↓
3. Övriga (lägre progress · redan inlösta · pending på annan rad)
```

*Klar!*-tag när `saldo ≥ kostnad` och inte redan pending/inlöst. Pending-rad markerad med ⏳ i listan — inte dubblerad som primär CTA.

---

## Tomma lägen

| Läge | Vad visas | Vad visas inte |
|------|-----------|----------------|
| **Inget mål** | Hero + *Välj mitt mål* | Tom trofésektion |
| **Inga belöningar** | Vänlig text: *Be din förälder lägga till* | Tom grid/lista med brus |
| **Inga troféer** | Inget — sektionen döljs | Placeholder *"Inga troféer ännu"* |
| **Laddar** | Skeleton eller enkel laddning | Tom vit yta |
| **Offline** | Sparad data + tydlig offline-etikett | Fel som ser ut som barnets fel |
| **Fel** | *Försök igen* — en knapp | Teknisk felkod |

---

## Vad är status — inte handling?

| Är status | Är inte status |
|-----------|----------------|
| ✓ *Väntar på svar* | ✗ Ny belöningsreklam |
| ✓ *Inte den här gången* | ✗ Veckosammanfattning |
| ✓ Dold tom trofé | ✗ Placeholder som tar plats |

Pending synkas med förälderns **Belöningar** — samma data, inte dubbel logik.

---

## Animationer och firande (G-04)

- Förstärka framgång · aldrig fördröja handling
- Skippbart (`prefers-reduced-motion`) · inte upprepas varje öppning
- *Completed*: ≤2 sekunder, blockerar inte Idag

---

## Olle-test (Definition of Done)

Inom **5 sekunder**, **utan scroll**:

1. **Hur många stjärnor har jag?**
2. **Vad sparar jag till?**
3. **Kan jag göra något här?**
4. **Vad är nästa steg?**

### Målbild

```
Lova · Stjärnburken

        12
   stjärnor samlade
[████████░░░░] 12 av 30 till Filmkväll

[ 📨 Fråga om att lösa in ]     ← endast tillstånd: Redeem available

● Belöningar
🎯 Filmkväll (mål)   [Klar!]  12/15 ⭐
📖 Ny bok                   12/30 ⭐
```

---

## Success Metrics (PR-granskning)

| Mål | Mått |
|-----|------|
| Olle ser stjärnor + mål i hero | < 5 sek |
| Olle vet nästa steg | < 5 sek |
| Ett exklusivt tillstånd | Ja |
| Primära handlingar synliga | ≤ 1 |
| Inget ovanför hero utan filtermotivering | Ja |
| Tomma lägen enligt tabell | Ja |
| Syskonjämförelse | Nej (C-05) |

---

## Vanliga felidéer (varför inte?)

| Felidé | Varför inte? |
|--------|--------------|
| ❌ Veckostatistik | Svarar inte på Olle-testet |
| ❌ Dagens uppgifter | Hör hemma i Idag |
| ❌ Troféer överst | Bryter visuell prioritering |
| ❌ Flera primära *Fråga*-knappar | Bryter beslutsregeln |
| ❌ Primär CTA för annan belöning under pending | Pending vinner — lista räcker |
| ❌ Tom troféhylla | Brus |
| ❌ Syskonleaderboard / köp stjärnor | C-05 / R-02 |

---

## Vad som ska bort

- Flera primära knappar · tom trofésektion · grid utan progress
- Schema i Skattkammaren · skuldbeläggande copy · status som CTA
- Dubblerad tillståndslogik utanför maskinen

---

**Enda sanningskälla för tillstånd:** § Tillståndsmaskin ovan.  
Implementation → [skattkammaren-agent-prompt.md](skattkammaren-agent-prompt.md).
