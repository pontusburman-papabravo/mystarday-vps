================================================================================
SKATTKAMMAREN 10/10 — KOMPLETT TEXT (kopiera allt nedan)
Branch: cursor/skattkammaren-barn-10-10-87ba
PR: #470
================================================================================

################################################################################
# DEL 1: VISION (produkt)
################################################################################

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

### Beslutsregel

> **På Skattkammaren får det aldrig finnas mer än en primär handling synlig åt gången — och möjligheten att lösa in eller välja mål prioriteras alltid före utforskning.**

När barnet har råd med sitt mål är *Fråga om att lösa in* den enda primära knappen. Schema, inställningar och vuxenfunktioner hör **inte** hemma här (C-01).

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

## Icke-mål

Skattkammaren ska **inte**:

- Ersätta **Idag** (rutin och uppdrag)
- Vara en **butik** med köpflöde eller kassa
- Vara en **spelhub** med minispel eller dagliga utmaningar
- Visa **statistik** (veckodiagram, jämförelser, analytics)
- Visa **familjejämförelser** eller syskonranking
- Visa **föräldrainställningar** eller konfiguration
- Skapa **skuld** vid nekad belöning

Om en idé passar här — den hör sannolikt hemma i Idag, Familj eller förälderns Belöningar.

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
- **Jag vet vad nästa steg är**

---

## Informationsarkitektur

```
Barnappen
    │
    ▼
 Min värld
    │
    ▼
Skattkammaren
    │
 ┌──┴──┐
 │     │
Stjärnor  Belöningar
 │     │
 └──┬──┘
    ▼
 Mitt mål
    ▼
Fråga om belöning
```

**Idag = handling. Skattkammaren = mening.** De får inte konkurrera som "hem" (se informationsarkitektur-barnapp §8).

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

---

## Tre frågor — alltid besvarade (standardvy)

| # | Fråga | Rätt | Fel |
|---|--------|------|-----|
| 1 | Hur många stjärnor har jag? | *Stor siffra i hero — "12 stjärnor"* | Gömt i sidhuvud eller liten etikett |
| 2 | Vad sparar jag till? | *Progress: "12 av 30 till Filmkväll"* | Separat sektion längre ner utan koppling |
| 3 | Kan jag göra något här? | *En knapp: Fråga om att lösa in* eller *Välj mål* | Tre likadana knappar · ingen väg framåt |

**Designregel:** Hero + primär handling **ovanför** belöningslistan — samma hierarki som [mockups/beloningar.html](mockups/beloningar.html).

---

## Primär handling, sekundär och status

| Typ | Vad det är | Visuellt | Exempel |
|-----|------------|----------|---------|
| **Primär** | Det enda barnet ska göra **nu** | Stor, fylld knapp · tydlig CTA | *Fråga om att lösa in* · *Välj mitt mål* |
| **Sekundär** | Valfritt · stödjer förståelse | Textlänk · mindre knapp · rad i lista | *Byt mål* · tryck på belöningsrad |
| **Status** | Information · inget beslut krävs | Diskret banderoll · ingen knappform | *Väntar på svar* · *Inte den här gången* |

**Regel:** Status ska **aldrig** presenteras som en primär uppmaning. Ingen lila/orange banderoll som ser ut som en CTA.

---

## Tillståndsmaskin

All UI ska följa denna tabell — ingen speciallogik per skärm utan tydligt tillstånd.

| Tillstånd | Hero | Primär knapp | Status |
|-----------|------|--------------|--------|
| **Inget mål** | Stjärnor + *Välj vad du sparar till* | *Välj mitt mål* | — |
| **Sparar** | Stjärnor + progress mot mål | Ingen | — |
| **Har råd** | Stjärnor + progress mot mål | *Fråga om att lösa in* | — |
| **Pending** | Stjärnor + progress | Ingen | *Väntar på svar* |
| **Nekad** | Stjärnor + progress | Ingen | *Inte den här gången* (vänligt) |
| **Godkänd** | Stjärnor (uppdaterat saldo) | Ingen | Kort firande (≤2s) |

Vid **0 stjärnor + inget mål** gäller samma som *Inget mål* — hero visar 0, primär är fortfarande *Välj mitt mål*.

### Första gången (onboarding)

```
Barnet öppnar Skattkammaren första gången
        ↓
0 stjärnor
        ↓
Inget mål valt
        ↓
Primär knapp: Välj mitt mål
        ↓
Belöningslista (vad som finns att spara till)
        ↓
Klart — barnet förstår att stjärnor + mål hör ihop
```

Ingen tom trofésektion. Ingen statistik. Ingen checklista.

---

## Vad är status — inte handling?

**Status** = information som inte kräver barnets beslut **nu**.

| Är status | Är inte status |
|-----------|----------------|
| ✓ *Väntar på svar* efter begäran | ✗ Ny belöningsreklam |
| ✓ *Inte den här gången* (vänligt, utan skuld) | ✗ Veckosammanfattning |
| ✓ Tom trofésektion **visas inte** | ✗ "Inga troféer ännu" som tar plats |

Pending ska synkas med förälderns **Belöningar** — samma data, inte dubbel logik.

---

## Priority Ladder

Visuell prioritet när komponenter konkurrerar om uppmärksamhet:

```
1. Stjärnburken      →  Hero: saldo + progress mot mål
        ↓
2. Primär handling   →  Fråga om att lösa in ELLER Välj mål (max 1 knapp)
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

## Animationer och firande (G-04)

Animationer ska:

- **Förstärka** framgång — inte ersätta den
- **Aldrig fördröja** nästa handling (rutin, byte av flik)
- **Kunna hoppas över** (`prefers-reduced-motion`)
- **Inte upprepas** varje gång barnet öppnar vyn

Firande vid godkänd belöning: **≤2 sekunder**, skippbart, blockerar inte Idag.

---

## Olle-test (Definition of Done)

Ett barn (eller vuxen som testar barnvy) som öppnar Skattkammaren ska inom **5 sekunder**, **utan scroll**, kunna svara:

1. **Hur många stjärnor har jag?**
2. **Vad sparar jag till?**
3. **Kan jag göra något här?**
4. **Vad är nästa steg?**

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

Om inget mål: hero visar *Välj vad du sparar till* + primär *Välj mitt mål*. Visa **inte** trofésektionen när den är tom.

---

## Success Metrics (PR-granskning)

| Mål | Mått |
|-----|------|
| Olle ser stjärnor | < 5 sek |
| Olle ser mål/progress | < 5 sek |
| Olle vet nästa steg | < 5 sek |
| Ingen scroll för primär förståelse | Ja |
| Antal primära handlingar synliga | ≤ 1 |
| Tom-state utan brus | Ja (ingen tom trofésektion) |
| Filterregeln | Varje komponent = stjärnor, mål eller handling |
| Syskonjämförelse | Nej (C-05) |
| Firande på inlösen | ≤ 2s, skippbart (G-04) |

---

## Vanliga felidéer (varför inte?)

| Felidé | Varför inte? |
|--------|--------------|
| ❌ Visa veckostatistik | Svarar inte på någon av de tre frågorna — statistik hör till förälder/rapporter |
| ❌ Visa dagens uppgifter | Hör hemma i **Idag** — bryter domängräns |
| ❌ Visa troféer överst | Bryter **Priority Ladder** — utforskning under handling |
| ❌ Flera *Fråga*-knappar | Bryter **beslutsregeln** — max en primär |
| ❌ *Du har råd nu!*-remsa med egna knappar | Samma som ovan — sekundärt via lista räcker |
| ❌ Tom troféhylla med placeholder | Brus — visa inte sektionen när tom |
| ❌ Syskonleaderboard | C-05 — barn ska inte jämföras |
| ❌ Köp stjärnor | R-02 — stjärnor tjänas i verkligheten |

---

## Vad som ska bort

- Flera primära knappar samtidigt
- Tom trofésektion som tar plats
- Grid utan progress som primärvy
- Schema/checklist-element i Skattkammaren
- Syskonleaderboard · stjärn-IAP (R-02)
- Skuldbeläggande copy vid nekad belöning
- Status som ser ut som primär CTA

---

Implementation, filer, tester och nuläge → [skattkammaren-agent-prompt.md](skattkammaren-agent-prompt.md).

################################################################################
# DEL 2: AGENT-PROMPT (implementation)
################################################################################

# Agent-uppdrag: Bygg Skattkammaren (barn) till 10/10 (GO)

**Kopiera hela filen till en ny agent** — eller peka agenten hit: `docs/skattkammaren-agent-prompt.md`  
**Produktvision (teknikagnostisk):** [skattkammaren-vision.md](skattkammaren-vision.md)  
**Mockup:** [mockups/beloningar.html](mockups/beloningar.html)  
**Förälder (parallell):** [beloningar-vision.md](beloningar-vision.md)

---

# Definition of Done

## Olle-test

Ett barn (eller testare i barnvy) som öppnar Skattkammaren ska inom **5 sekunder**, **utan scroll**, svara:

1. **Hur många stjärnor har jag?**
2. **Vad sparar jag till?**
3. **Kan jag göra något här?**
4. **Vad är nästa steg?**

## Filterregel + beslutsregel

- **Filterregeln:** Varje komponent ovanför fold måste hjälpa förstå stjärnor, mål eller belöningsläget inom 5 sek
- **Beslutsregeln:** Högst en primär handling synlig — möjligheten att lösa in eller välja mål prioriteras före utforskning

## Exit Rule

Barnet ska kunna lämna Skattkammaren och säga: *jag vet hur många stjärnor jag har · jag vet vad jag sparar till · jag vet om jag kan fråga om en belöning · jag vet vad nästa steg är*.

## Success Metrics (PR)

| Mål | Mått |
|-----|------|
| Olle ser stjärnor | < 5 sek |
| Olle ser mål | < 5 sek |
| Olle vet nästa steg | < 5 sek |
| Primära handlingar synliga | ≤ 1 |
| Tom-state utan brus | Ja (ingen tom trofésektion) |
| Pending synkad med förälder | Samma `reward_redemption` |
| Tillståndsmaskin följd | Tabell i vision § Tillståndsmaskin |

## Tekniskt minimum

- `npm run test:gate` grön
- Mobil först (portrait, 44pt barnmål)
- POS: C-01, C-03, G-01, G-04, R-02
- Commit + PR med Olle-test-resultat + screenshots

---

# Ditt mandat

Bygg **barnets Skattkammaren** till 10/10 enligt [skattkammaren-vision.md](skattkammaren-vision.md).

**Vision > kod.** Ta bort dubblerad UI (grid + *Du har råd nu!*-remsa, tom trofésektion).

Du ska kunna säga:

> *"Det här uppfyller inte filterregeln — det hjälper inte barnet med stjärnor, mål eller handling."*

---

# Scope

**Endast** barnets belöningsvy (se nyckelfiler nedan).

Ändra inte förälder `/rewards`, bibliotek eller Idag-fliken annat än delad pending-data.

**Routes idag:** `/child-dashboard#rewards` · framtida `/child/world` (barnmeny v2) · demo `/skattkammaren?demo=1`

---

## Anti-patterns

Se vision § *Vanliga felidéer* och § *Vad som ska bort*. Implementation:

- Flera *Fråga*-knappar synliga samtidigt
- Tom trofésektion med placeholder-text
- Schema eller checklist i Skattkammaren
- Syskonjämförelse · stjärn-IAP
- Skuldbeläggande vid nekad belöning
- Status som ser ut som primär CTA
- Firande som blockerar >2s (G-04)

## Självgranskning innan du är klar

1. *"Hjälper detta med stjärnor, mål eller handling?"* (filterregeln)
2. *"Är detta den enda primära knappen just nu?"* (beslutsregeln)
3. *"Matchar detta tillståndsmaskinen?"* (vision § Tillståndsmaskin)

---

# Tillståndsmaskin → kod

Implementera enligt visionens tabell. Pseudologik:

```
if (!goal)           → primary = "Välj mitt mål"
else if (canAfford && !pending) → primary = "Fråga om att lösa in"
else if (pending)    → status only, primary = none
else if (denied)     → status only, primary = none
else                 → collect hint, primary = none
```

Hero uppdateras alltid med `starBalance` + progress mot mål. Trofésektion: `if (trophies.length === 0) render nothing`.

---

# Produktvision (sammanfattning)

| Regel | En mening |
|-------|-----------|
| **Filterregel** | Stjärnor, mål eller belöningsläge |
| **Beslutsregel** | Max en primär handling |
| **Primär / sekundär / status** | Se vision § Primär handling |
| **Priority Ladder** | `Stjärnburken → Primär → Belöningar → Status → Utforskning` |

---

# Teknisk vägledning

**Nyckelfiler:**

| Fil | Roll |
|-----|------|
| `public/js/child-dashboard-rewards.js` | `renderSkattkammaren`, inlösen, mål |
| `public/js/child-rewards-engine.js` | Goal progress, pending banner |
| `public/child-dashboard.html` | Skatt-CSS |
| `docs/mockups/beloningar.html` | Visuell målbild |
| `test/skattkammaren-10-10.test.js` | Konstitutions- och regressionsgate |

**API:** `/api/me/rewards`, `/api/me/goal`, `POST /api/me/rewards/:id/redeem`

**Branch:** `cursor/skattkammaren-barn-10-10-87ba`

**Test:**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false env -u RESEND_API_KEY npm run test:gate
```

---

# Nuläge vs mål (implementation)

**På plats:**

- `child-dashboard-rewards.js`, mål, inlösen, troféer, pending/denied-vänlig copy
- Universum via `child-skatt-house.js`, offline-cache
- Hero Stjärnburken + belöningslista med progress
- En primär CTA, tom trofésektion dold

**Kvar:**

- Verifiera tillståndsmaskin för alla edge cases (0 stjärnor, byter mål pending)
- Olle-test med riktiga barn (5-sekundersregeln)
- Barnmeny v2 `/child/world` route-migrering

---

# Arbetsflöde

1. Läs [skattkammaren-vision.md](skattkammaren-vision.md) (produkt) + mockup
2. Läs `child-dashboard-rewards.js` (implementation)
3. Olle-test: inget mål · sparar · har råd · pending · nekad · första gången
4. Verifiera tillståndsmaskin + priority ladder
5. Implementera — ta bort lika mycket som du lägger till
6. `npm run test:gate`
7. PR med screenshots (iPhone portrait)

---

# Sista instruktionen

Skattkammaren ska kännas som **stjärnburken + drömmen** — först hur många stjärnor, sedan hur nära målet, sedan en tydlig väg att fråga.

================================================================================
SLUT
================================================================================
