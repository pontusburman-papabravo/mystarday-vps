# Produktspecifikation: NPF-arkitektur och kognitivt stöd v1

**Version:** v1.0  
**Status:** Produktkompass (utkast för teamreview)  
**Datum:** 2026-07  

**Relaterat:** [barnets-samling-vision.md](barnets-samling-vision.md) · [skattkammaren-vision.md](skattkammaren-vision.md) · [barnmeny-v2.md](barnmeny-v2.md)

> Den här specen säger **vad** designers och utvecklare ska göra annorlunda — inte **hur** (API-flaggor, tabeller, filnamn hör hemma i tech-spec).

---

## 1. Övergripande designfilosofi

Appen är inte en prestationsmaskin, spelhub eller digitalt casino.

Den är en trygg struktur som minskar kognitiv belastning, stödjer exekutiv funktion och firar ansträngning framför perfektion. Den byggs särskilt för barn med ADHD, autism och andra NPF-profiler.

Det som är nödvändigt för vissa barn är bra för nästan alla barn. Därför ska appen vara **NPF-by-default** — inte ha NPF som ett separat specialläge.

Varje vy och funktion ska hjälpa barnet med fyra saker:

1. Komma igång
2. Förstå vad som händer
3. Känna kontroll
4. Vilja fortsätta även efter en svår dag

### Ledstjärnor

**Dopamin utan stress**

Barnet ska få snabb feedback när något blir klart, men feedbacken ska vara lugn, varm och sensoriskt trygg.

**Tydlighet utan hårdhet**

Barnet ska alltid förstå vad som händer, vad nästa steg är och vilken status något har.

Tydlighet får inte bli kall, dömande eller rigid. Systemet ska vara förutsägbart men mänskligt.

**Framsteg utan skam**

Appen ska fira försök, återkomst och uthållighet.

Inga missade uppgifter ska leda till skam, minuspoäng, röda varningar eller känslan av att allt är förstört.

### Befintligt före nytt

Där funktion redan finns i koden ska v1 i första hand **förbättra känsla, språk, placering och tydlighet** i befintliga byggblock.

Vi ska inte bygga parallella system om det redan finns en fungerande grund.

| Befintligt | Återanvänds för |
|------------|-----------------|
| Aktivitetstimer / timglas | Tidslängd per aktivitet (förälder satt) |
| Belöningslogik | Skattkammaren (mål, inlösning, status) |
| Stjärnsaldon och historik | Saldo + livstidsstjärnor |
| Samlings- / achievement-byggblock | Min samling (vägg, hylla, minneskort) |

*Tech-spec avgör exakta moduler — den här listan är produktintent, inte filkarta.*

---

## 2. Vy-för-vy-specifikation

### ☀️ Idag

Sidan Idag ska minimera startmotstånd och ta bort kognitivt brus.

För många barn med ADHD, autism eller annan NPF kan en hel lista med uppgifter kännas som ett stort berg. Därför ska Idag kunna visas i ett **fokusläge** där endast nästa aktuella uppgift syns i stort format.

Standardvyn kan fortfarande visa dagens schema, men fokusläget ska vara en förstklassig del av produkten och enkelt att aktivera.

#### Fokusläge / Tunnelvy

I fokusläge visas:

- aktuell uppgift
- enkel bekräftelseknapp
- eventuell aktivitetstimer
- tydlig belöning när uppgiften är klar
- nästa steg först efter att barnet är färdigt

Syftet är att minska kognitivt brus och göra starten lättare.

#### Direkt feedback

När en uppgift bockas av ska barnet få direkt feedback.

**Feedbacken ska innehålla:**

- stjärna/stjärnor som tjänas
- mjuk animation, högst två sekunder
- tydlig ökning av stjärnsaldo
- valfritt varmt ljud

**Feedbacken ska inte innehålla:**

- blinkande ljus
- höga ljud
- konfettiexplosioner
- slumpmoment
- casinoeffekter
- utdragen animation som blockerar nästa steg

#### Aktivitetstimer / Timglaset

Appen har redan stöd för aktivitetstimer med timglas. Detta ska vara den **primära timermetaforen** för aktiviteter där föräldern har satt en tidslängd.

Timglaset ska:

- vara valfritt per aktivitet
- styras av föräldern
- visas endast när aktiviteten har en satt tidslängd
- startas aktivt av barnet
- visas i NU-kortet
- ha sand/timglas som primär indikator
- kunna startas om
- fungera utan ljud
- avslutas med mjuk, valfri feedback

Syftet är inte att pressa barnet, utan att göra tidsåtgång begriplig.

**Undvik:**

- "tiden går ut"
- "skynda"
- "du hann inte"
- röd stressfärg som primär signal
- skarpa larmljud

**Använd hellre:**

- "Starta timglas"
- "Timglaset är igång"
- "Färdig"
- "Starta igen"

Den befintliga visualTimer-cirkeln kan finnas kvar för fasta tidsblock med specifika start- och sluttider. Den ska inte ersätta timglaset som huvudlösning för föräldersatta aktivitetstider.

#### Neutral hantering av avvikelser

Uppgifter som missas, skjuts upp eller där timglaset rinner ut utan att barnet klickar på Klart ska hanteras neutralt.

**Förbjudet i barnvyn:**

- röd varningsfärg
- ledsna symboler
- minuspoäng
- "misslyckades"
- "du hann inte"
- "du bröt"
- annan text som skuldbelägger barnet

Appen ska hellre signalera: *nästa steg · vi fortsätter · provar igen · ny chans*

---

### 💎 Skattkammaren / Belöningar

Skattkammaren är platsen där barnet **sparar och löser in** stjärnor mot föräldergodkända belöningar.

Stjärnor får vara en **användbar resurs** här. Det är kärnan i produkten.

Men Skattkammaren ska inte kännas som en shop, ett casino eller en spelbutik. Den ska kännas som en varm och tydlig plats där barnet ser vad det sparar till.

#### Aktivt mål

Barnet ska kunna ha ett aktivt mål (biokväll, glass, lekpark, extra saga …).

Skattkammaren ska tydligt visa:

- vilket mål barnet sparar till
- hur många stjärnor barnet har **att använda**
- hur många stjärnor målet kräver
- hur många stjärnor som är kvar
- vad nästa steg är

Exempel:

> Du sparar till Biokväll.  
> Du har 38 av 50 stjärnor.  
> Bara 12 kvar.

#### Visuell progress

Sparandet ska inte bara vara en siffra. Progress ska visas fysiskt, linjärt och förutsägbart:

- en stjärnburk som fylls
- tomma stjärnsiluetter som tänds en efter en
- ett pussel som byggs
- en mjuk progressväg

För barn som behöver extra förutsägbarhet är **fasta platser** bra: tomma stjärnplatser som fylls gör det tydligt exakt hur mycket som är kvar.

#### Minska impulsivitet

**Föräldern ska kunna välja i inställningar** hur många belöningar barnet ser samtidigt.

Möjliga lägen:

- Visa alla belöningar
- Tona ner belöningar som inte är aktiva
- Visa bara aktivt mål
- Dölj belöningar barnet inte har råd med ännu

Syftet är att minska impulsivitet, tjat och stress när barnet försöker spara till något större.

*Tech-spec avgör om det blir profilinställning, familjeinställning eller feature flag.*

#### Fem belöningsstatusar

Varje belöning ska alltid ha en tydlig status. Inga otydliga mellanlägen.

| # | Status | Betydelse |
|---|--------|-----------|
| 1 | **Sparar** | Barnet arbetar mot belöningen. Progress visas tydligt. |
| 2 | **Kan lösas in** | Tillräckligt med stjärnor. Barnet kan skicka förfrågan till vuxen. |
| 3 | **Väntar på vuxen** | Förfrågan skickad. Visas lugnt — barnet ska förstå att den inte försvunnit. |
| 4 | **Godkänd** | Vuxen har sagt ja. Belöningen är okej — men **ännu inte markerad som genomförd**. |
| 5 | **Genomförd** | Belöningen är utförd/använd. Arkiveras som **minneskort** i Min samling. |

**Viktigt:** *Godkänd* ≠ *Genomförd*. Det är avgörande för historik och minneskort.

---

### 🏆 Min samling

Min samling är inte en shop, inte en spelhub och inte en plats för inlösen.

Min samling är platsen där barnet ser allt det har klarat — historik, stolthet och framsteg över tid.

**Min samling får inte innehålla:**

- användbar valuta
- köpknappar
- inlösen

**Min samling får visa:**

- historiska stjärnor
- **totalt intjänade stjärnor** som stolthet (stjärnglaset, medaljer)
- minneskort från genomförda belöningar
- diplom, streak, hylla

#### Två stjärnsaldon

Appen ska skilja strikt på två typer av stjärnor:

| Saldo | Var | Beteende |
|-------|-----|----------|
| **Stjärnor att använda** | Skattkammaren | Aktuellt saldo. Minskar vid inlösning. |
| **Totalt intjänade stjärnor** | Min samling | Alla stjärnor någonsin. Minskar **aldrig**. |

Syftet: barnet ska inte känna att framsteg försvinner när stjärnor löses in.

Exempel:

> Du har 38 stjärnor att använda. *(Skattkammaren)*  
> Totalt har du tjänat 426 stjärnor. *(Min samling)*

#### Robusta streaks

Streaks ska vara motiverande men inte sköra.

För ett barn med NPF kan en bruten streak skapa känslan av att allt är förstört. Därför ska streak-systemet stödja återkomst och flexibilitet.

**Föräldern ska kunna välja i inställningar** (när det behövs):

- pausdag
- sjukdag
- hjältestjärna
- manuell räddning av streak bakåt i tiden

Används när barnet har kämpat, även om dagen inte blev perfekt. Fokus på uthållighet, inte perfektion.

#### Minneskort

En **genomförd** belöning ska inte bara försvinna.

Den blir ett minneskort i Min samling:

> **Biokväll**  
> Du sparade ihop 50 stjärnor själv.  
> Godkänd av pappa.  
> Juli 2026.

I v2 kan föräldern lägga till foto eller kort hälsning. Minneskort gör belöningar till minnen, inte bara transaktioner.

#### Lugn sortering

Samlingen kan stödja enkel sortering (datum, typ, färg). Sortering ska kännas som ordning och trygghet — inte administration.

---

## 3. Sensoriska och språkliga riktlinjer

### Sensorisk design

Appen ska vara lugnt även när något roligt händer.

| Regel | |
|-------|---|
| Inga blinkande effekter | |
| Inga visuella explosioner | |
| Inga skarpa eller plötsliga ljud | |
| Inga långa belöningssekvenser | |
| Inga slumpbaserade belöningsanimationer | |
| Inga lootboxar, jackpottar, spins eller claim-mekanik | |
| Varm och harmonisk färgpalett | |

**Ljud av:** Det ska finnas stöd för att stänga av ljud. Appen ska fungera fullt ut utan ljud.

**Lugnt läge (inte samma sak som mute):**

| | Mute | Lugnt läge |
|---|------|------------|
| Ljud | Av | Mindre / mildare |
| Rörelse | — | Reducerad |
| Effekter | — | Färre, lägre intensitet |
| Feedback | — | Mildare |

På sikt bör barnprofilen kunna ha ett **lugnt läge** med reducerad rörelse, mildare animationer och lägre sensorisk intensitet — oberoende av om ljud är på eller av.

`prefers-reduced-motion` ska alltid respekteras.

### Språkbruk

Språket ska vara varmt, konkret och odömande.

**Undvik:** misslyckades · du hann inte · förlorade · bröt streaken · fel · minus · bara · tiden går ut · skynda · köp · shop · butik · loot · claim

**Använd:** nästa steg · vi fortsätter · provar igen · sparar · önskar · löser in · väntar på vuxen · godkänd · genomförd · kämpat · klart · timglaset är igång · färdig

Appen ska aldrig skambelägga barnet.

---

## 4. Prioritering för v1

V1 ska fokusera på kärnan som ger omedelbart NPF-värde — inte på många samlarobjekt.

| Prio | Vad |
|------|-----|
| 1 | Fokusläge i Idag: en uppgift i taget |
| 2 | Timglaset: lugnare UI, odömande logik, rätt micro-copy (befintlig timer) |
| 3 | Tydligt aktivt mål i Skattkammaren: "Du sparar till X" |
| 4 | Fysisk progress: stjärnburk, tända stjärnsiluetter eller liknande |
| 5 | Två saldon: stjärnor att använda + totalt intjänade |
| 6 | Fem belöningsstatusar — särskilt "Väntar på vuxen" och skillnad Godkänd/Genomförd |
| 7 | Neutral hantering av missade uppgifter och timglas som rinner ut |
| 8 | Genomförda belöningar som minneskort i Min samling |

### Produktregel

> När vi är osäkra ska vi välja den lösning som gör barnet **lugnare**, inte mer uppvarvat.

Appen ska göra nästa steg lättare.

---

## POS-koppling

| Regel | Hur |
|-------|-----|
| C-03 | En primär handling på Idag |
| C-04 | Firande ≤2 s |
| G-01 | Verklighet före firande |
| G-04 | Firandebudget |
| R-02 | Stjärnor inte köpbara |
| R-06 | Livstidsstjärnor monotona (minskar aldrig) |
