# Product Behavior Specification (PBS)

**Skapad:** 2026-06-26  
**Version:** 0.1 (utkast — volym 1)  
**Status:** **Primär produktspec** — viktigare än kravspec och funktionslistor  
**Ägare:** Produkt

> Det här är inte en use case-lista. Det beskriver **hur produkten ska bete sig i varje situation** — vem som ansvarar, vad som sägs, vad som aldrig får hända, och hur upplevelsen skiljer sig mellan målgrupper.

**Relaterat:** [`architecture-platform.md`](./architecture-platform.md) · [`VISION-2030.md`](./VISION-2030.md) · [`APP-V2-KRAVSPEC.md`](./APP-V2-KRAVSPEC.md) (leverans, inte beteende)

---

## 0. Dokumenthierarki

```
Product Behavior Specification (PBS)     ← detta dokument — HUR produkten beter sig
        ↓
architecture-platform.md                 ← VAD motorerna är
        ↓
APP-V2-KRAVSPEC.md                       ← NÄR vi levererar Platform v1
        ↓
barnmeny-v2 / vuxenmeny-v2               ← VAR i UI (Generation 1)
```

| Fråga | Dokument |
|-------|----------|
| Hur ska coachen reagera när barn missar en dag? | **PBS** |
| Vilka engines delar data? | architecture-platform |
| Ska vi bygga planeringshub i sprint 2? | APP-V2-KRAVSPEC |
| Vilken flik visar Idag? | barnmeny-v2 |

**Målstorlek:** Volym 1 (detta utkast) täcker kärnbeteenden. Full PBS kan växa till **150–250 sidor** när varje situation, AI-ton och edge case är utskriven.

---

## 1. Så läser och skriver du PBS

### 1.1 Varje PBS-sektion innehåller

| Del | Innehåll |
|-----|----------|
| **Syfte** | Varför beteendet finns — människans behov |
| **Målgrupper** | Primär + sekundär |
| **Ansvar** | Vem gör vad (inte samma som "vem ser skärmen") |
| **Förutsättningar** | Vad som måste vara sant |
| **Normalflöde** | Hur det ska kännas steg för steg |
| **Alternativ** | Rimliga avvikelser |
| **Regler** | Hårda produktregler |
| **Förväntat resultat** | Hur användaren ska uppleva framgång |
| **KPI** | Hur vi mäter att beteendet fungerar |
| **Beteende per målgrupp** | Barn · Ungdom · Vuxen (samma motor) |
| **Gen 1-status** | Live / delvis / ej byggt |

### 1.2 Beteendeindex (volym 1)

| ID | Beteende | Kärna |
|----|----------|-------|
| **PBS01** | Planera dagen | Förutsägbarhet |
| **PBS02** | Genomföra aktivitet | Handling |
| **PBS03** | Motivation | Varför fortsätta |
| **PBS04** | Coach | Stöd utan styrning |
| **PBS05** | Misslyckanden | Återstart utan skam |
| PBS06 | Komma igång | Trygghet första minuten |
| PBS07 | Reflektion | Lära utan bedömning |
| PBS08 | Relationer | Stödnätverk |
| PBS09 | Delning | Samtycke och gränser |
| PBS10 | Självständighet | Mindre hjälp över tid |
| PBS11 | Livsövergångar | Växa med användaren |
| PBS12 | Anpassningsprofil | Guidad / Stöttad / Självständig |

PBS06–PBS12: se [bilaga A](#bilaga-a--pbs06pbs12-utkast). Utbyggs i volym 2.

---

# PBS01 — Planera dagen

## Syfte

Användaren ska alltid veta vad som ska göras härnäst, känna att dagen är **möjlig att genomföra**, och få stöd **utan att känna sig styrd**.

---

## Målgrupper

**Primär:** Barn · Ungdom · Ung vuxen · Vuxen  

**Sekundär:** Förälder · Pedagog · Partner · Coach · Terapeut

---

## Ansvar

### Barn

- Ansvarar **inte** för planeringen.
- Barnets uppgift är att **genomföra** aktiviteter.

### Förälder (Gen 1)

Ansvarar för:

- skapa rutiner
- lägga aktiviteter
- prioritera
- ändra schema
- belöningar

### Ungdom

- Ansvarar **tillsammans med** coachen.
- Systemet **föreslår**.
- Ungdomen **bestämmer**.

### Vuxen

- Ansvarar **själv**.
- AI **hjälper** — bestämmer inte.

---

## Förutsättningar

Det finns:

- konto
- minst en rutin
- minst en aktivitet
- aktiv dag (datum med plan)

---

## Normalflöde

```
Förälder öppnar appen
        ↓
Skapar morgonrutin
        ↓
Lägger till aktiviteter
        ↓
Väljer ordning
        ↓
Sparar
        ↓
Barnet får nytt schema
        ↓
Coach presenterar första steget
```

**Barnets upplevelse:** Öppnar Idag → ser **ett** tydligt NU — inte "schemat".

---

## Alternativ

| Situation | Beteende |
|-----------|----------|
| Barnet vaknar sent | AI föreslår **kortversion** av rutinen — inte skuldkänsla |
| Förälder ändrar aktivitet | Barnets vy uppdateras **direkt** (eller vid nästa refresh) |
| Aktivitet flyttas | **Historik sparas** — inget raderas i det förflutna |
| Tom dag | Coach erbjuder "kopiera igår" eller ett förslag — inte tom canvas |

---

## Regler

**Aktivitet måste ha:**

- namn
- ikon
- ordning

**Aktivitet kan ha:**

- tid
- bild
- ljud
- instruktion
- uppskattad tid

**Produktregler:**

- Planering ska inte kräva expertkunskap om veckoschema-editor (Gen 1).
- Max **5 synliga** uppgifter i Execution (barn) — resten finns men är inte NU.
- Barn ska **aldrig** behöva öppna "Schema" för att förstå dagen.

---

## Förväntat resultat

Barnet öppnar appen och vet direkt:

> **"Vad gör jag nu?"**

Ungdom/vuxen:

> **"Det här hinner jag."**

---

## KPI

| Mätetal | Riktning |
|---------|----------|
| Tid till första synliga aktivitet (barn) | ↓ |
| Antal genomförda aktiviteter / dag | ↑ |
| Avklarad morgon (sektion FM klar) | ↑ |
| Minskade påminnelser från förälder (kvalitativ) | ↑ |

---

## Beteende per målgrupp

| | **Barn** | **Ungdom** | **Vuxen** |
|--|----------|------------|-----------|
| **Planerar** | Förälder | Tillsammans med coach | Själv + AI |
| **Ser plan** | Idag (NU/NÄSTA) | Idag / tidslinje | Prioriterad lista |
| **Coach** | "Nu är det dags för …" | "Vad vill du hinna idag?" | "Du har tre viktiga uppgifter. Vilken börjar du med?" |
| **Belöning i PBS01** | **Ingen** — belöning kommer först vid genomförande (PBS02) | — | — |

---

## Gen 1-status

| Del | Status |
|-----|--------|
| Förälder planerar schema | ✅ Live |
| Barn ser Idag | ✅ Live |
| Kortversion vid sen start | ❌ Ej byggt |
| AI-förslag vid planering | ⚠️ För dig (förälder, separat) |

**Engines:** Task, Timeline, Coach

---

# PBS02 — Genomföra aktivitet

## Syfte

Hjälpa användaren att **komma igång** — inte bara hålla reda på aktiviteter.

Det här är **hjärtat** i produkten.

---

## Målgrupper

**Primär:** Den som utför (member)  

**Sekundär:** Stödperson som kan bocka av åt (förälder i Gen 1)

---

## Ansvar

| Roll | Ansvar |
|------|--------|
| **Executor** | Starta, utföra, bekräfta |
| **Stödperson** | Får bocka av åt — ska inte ta över utan anledning |
| **System** | Visa rätt steg, spara historik, aldrig stressa |

---

## Förutsättningar

- Uppgift finns i dagens logg
- Användaren har åtkomst till Execution (Idag)

---

## Normalflöde — Start

Coach säger (eller visar implicit):

> **Nu börjar vi.**

| Målgrupp | Exempel på NU-kort |
|----------|-------------------|
| **Barn** | `🥣 Frukost` |
| **Ungdom** | `📚 Plugga matte` |
| **Vuxen** | `📧 Skicka fakturan` |

---

## Under aktivitet

Systemet **ska** visa (när det finns):

- instruktion
- bild
- timer
- checklista (delsteg)
- hjälp

Coach **får** säga:

> "Bra."

Coach **får aldrig** säga:

> "Skynda dig."

---

## När aktivitet slutförs

```
Spelar lämplig animation (profilberoende)
        ↓
Sparar historik (oföränderlig logg)
        ↓
Uppdaterar progress
        ↓
Ger belöning (PBS03)
        ↓
Öppnar nästa steg (coach → NÄSTA blir NU)
```

---

## Belöning vid slutförande

| Målgrupp | Feedback |
|----------|----------|
| **Barn** | `⭐ +1` · animation · ljud · konfetti (**lagom**) |
| **Ungdom** | `+25 XP` · progressbar · ev. achievement |
| **Vuxen** | `+1 steg mot veckomålet` · **ingen konfetti** |

---

## Alternativ

| Situation | Beteende |
|-----------|----------|
| Delsteg | Bocka delsteg först → sedan huvudaktivitet |
| Paus | Tillåtet — ingen negativ copy |
| Hoppa över | Tillåtet enligt regler — loggas, inte raderas |
| Flytta | Till annan tid/dag — historik kvar |
| Offline | Kö → synka vid uppkoppling |
| Förälder bockar åt barn | Samma motor — attribution sparas |

---

## Regler (affärsregler)

- Aktivitet kan: **pausas · hoppas över · flyttas**
- **Historik får aldrig raderas** (GDPR-radering är separat användarval)
- Bekräftelse ska leda till **nästa steg** — inte till meny eller Skattkammaren som primär CTA
- Max 5 synliga uppgifter i Execution (barn NPF)

---

## Förväntat resultat

Användaren känner:

> **"Jag gjorde det. Jag vet vad som kommer nu."**

---

## KPI

| Mätetal | Riktning |
|---------|----------|
| Starttid (öppna app → påbörjad aktivitet) | ↓ |
| Genomförandetid | Baseline + outlier-analys |
| Avbrott (paus utan complete) | Kvalitativ |
| Missade aktiviteter | ↓ (utan att jaga DAU) |

---

## Gen 1-status

| Del | Status |
|-----|--------|
| Complete + stjärna | ✅ Live |
| Delsteg | ✅ Live |
| Coach "nästa steg" | ⚠️ v2 coach-loop |
| Profilberoende animation | ⚠️ Delvis (`dopamin_animation`) |

**Engines:** Execution (Task)

---

# PBS03 — Motivation

## Syfte

Det här handlar **inte** om belöningar som feature.

Det handlar om:

> **"Varför ska jag fortsätta?"**

---

## Målgrupper

**Primär:** Executor  

**Sekundär:** Stödperson som sätter belöningar (Gen 1 förälder)

---

## Beteende per målgrupp

### Barn

```
Motivation → Stjärnor → Skattkammaren / Min värld → Belöning
```

**Exempel:**

```
Borsta tänder → +2 ⭐ → 30 ⭐ totalt → Glass
```

**Förväntan:** Barnet ska **vilja** göra nästa aktivitet — inte bara slutföra denna.

**Ton:** Lekfull, tydlig, inte överväldigande.

---

### Ungdom

```
Motivation → XP → Level → Achievements → Personliga mål
```

**Belöning:**

- längre streak
- ny badge
- bättre statistik

**Förväntan:** Ungdomen ska känna **"Jag utvecklas."**

**Ton:** Modern, inte barnslig.

---

### Vuxen

```
Motivation → Vanor → Statistik → Reflektion → Livsmål
```

**Belöning är inte spel.**

Belöningen är:

- kontroll
- balans
- mindre stress

**Förväntan:** Användaren känner att rutinen **betalar sig** i vardagen.

---

## Regler

- **Samma Reward Engine** — olika presentation
- Progress-yta (Min värld / Mål) får **inte** vara startdestination efter login
- Överbelöning från stödperson: mjuk varning möjlig — inte hårt block
- Gamification-nivå styrs av `PresentationProfile` (PBS12) — inte enbart ålder

---

## Förväntat resultat

| Målgrupp | Känsla |
|----------|--------|
| Barn | "Det var värt det — vad tjänar jag in härnäst?" |
| Ungdom | "Jag ser att jag blir bättre." |
| Vuxen | "Jag har kontroll över min vardag." |

---

## KPI

| Mätetal | Riktning |
|---------|----------|
| Completion → Progress-besök (samma session) | Kvalitativ balans |
| Reward redemption (barn) | ↑ |
| Streak length (teen/adult) | ↑ utan skam vid break |
| Retention efter första meningsfulla belöning | ↑ |

---

## Gen 1-status

| Del | Status |
|-----|--------|
| Stjärnor + inlösen | ✅ Live |
| Min värld / Skattkammaren | ✅ Live |
| XP / achievements | ❌ Gen 2 |
| Vuxen vanevy | ❌ Gen 3+ |

**Engines:** Reward, Progress

---

# PBS04 — Coach

## Syfte

Hjälpa användaren **vidare** — **inte styra**.

Det här är nästan en **egen produkt** inuti plattformen.

---

## Målgrupper

**Primär:** Den som behöver stöd (varierar per PBS12-profil)  

**Sekundär:** — (coach = system/AI)

---

## Beteende per målgrupp

### Barn

Coach **ska:**

- uppmuntra
- förklara
- visa nästa steg

Coach **får aldrig:**

- skuldbelägga
- stressa
- öppna meny istället för nästa aktivitet

**Exempel:**

> "Kanon!" → kort animation → "Nästa: frukost"

---

### Ungdom

Coach **ska:**

- hjälpa prioritera
- bryta ned uppgifter
- minska prokrastinering

**Exempel:**

> "Du verkar fastna innan plugget. Ska vi testa en kortare start?"

---

### Vuxen

Coach **ska:**

- analysera mönster (med samtycke)
- upptäcka återkommande problem
- föreslå förbättringar

**Exempel:**

> "Du verkar fungera bättre när dagens viktigaste uppgift görs före kl. 10."

---

### Förälder (Gen 1 — separat yta)

För dig = coach för **vårdnadshavare** (problemorienterade paket). **Levererat** — underhåll, inte Platform v1-bygge.

---

## Normalflöde

```
Trigger (post-activity · planering · mönster · bakslag)
        ↓
Kort meddelande (1–3 meningar)
        ↓
En primär CTA ("Nästa steg" / "Prova kortversion")
        ↓
Användaren accepterar eller dismissar
        ↓
Vid dismiss: ingen upprepning samma dag (samma trigger)
```

---

## Regler

- Coach leder alltid till **Execution** eller **Planering** — aldrig till funktionsmeny
- AI otillgänglig → statiska templates — inte tom UI
- Ton styrs av `PresentationProfile` + målgrupp
- Barn-coach: **kort**, valfritt att expandera, `aria-live` för tillgänglighet

---

## KPI

| Mätetal | Riktning |
|---------|----------|
| Coach CTA → handling (complete / plan change) | ↑ |
| Dismiss rate (per trigger-typ) | Balanserad |
| Negativ feedback / support om "stressig coach" | ↓ |

---

## Gen 1-status

| Del | Status |
|-----|--------|
| För dig (förälder) | ✅ Levererat |
| Barn coach-loop | ⚠️ v2 |
| Mönsteranalys (vuxen) | ❌ Framtid |

**Engines:** Coach (AI)

---

# PBS05 — Misslyckanden

## Syfte

När rutinen brister ska produkten hjälpa användaren **återuppta** — utan skam, bestraffning eller känsla av att ha "förlorat".

**Den här PBS:en är nästan viktigare än belöningarna.**

---

## Målgrupper

**Primär:** Executor  

**Sekundär:** Coach, stödperson

---

## Beteende per målgrupp

### Barn

```
Missar aktivitet
        ↓
Ingen stjärna
        ↓
Ingen bestraffning
        ↓
Coach: "Vi provar nästa."
```

**Får aldrig:** Röd varning, minuspoäng, "du misslyckades".

---

### Ungdom

```
Missar tre dagar
        ↓
Coach: "Ska vi börja med en enda uppgift idag?"
```

**Integritet:** Ingen förälder-notis om "misslyckande" utan policy/beslut.

---

### Vuxen

```
Missar två veckor
        ↓
Coach: "Vill du återstarta din rutin utan att förlora historiken?"
```

---

## Regler

| Regel | Detalj |
|-------|--------|
| **Ingen skam-copy** | Aldrig "Du misslyckades", "Du tappade streaken" som primärtext |
| **Streak** | Får pausas — behöver inte nollställas hårt |
| **Historik** | Bevaras alltid vid återstart |
| **En tröskel tillbaka** | Ett litet steg idag > perfekt plan imorgon |
| **Stödperson** | Får inte använda appen för att skuldbelägga (produkt kan inte förhindra allt — men copy ska inte uppmuntra det) |

---

## Alternativ

| Situation | Beteende |
|-----------|----------|
| Medveten paus (semester) | "Pausa streak" — inte räkna som miss |
| Användare vill börja om visuellt | Reset presentation — valbar behållning av historik |
| Lång inaktivitet | Hem/readiness: "Nästa lilla steg" — inte skuld-dashboard |

---

## Förväntat resultat

Användaren känner:

> **"Jag kan börja igen. Inget är förstört."**

---

## KPI

| Mätetal | Riktning |
|---------|----------|
| Return within 7 days after 7+ day gap | ↑ |
| Completion within 24 h efter restorative coach | ↑ |
| Support tickets om skam/negativitet | ↓ |

---

## Gen 1-status

| Del | Status |
|-----|--------|
| Explicit restorative coach | ❌ **Ska designas** |
| Ingen minuspoäng | ✅ Implicit |
| Återstart-UX | ⚠️ Delvis |

**Engines:** Coach, Progress

---

# Designprinciper (hela plattformen)

Dessa gäller **alla** PBS-sektioner och alla målgrupper.

### Primär princip

> **Appen ska aldrig få användaren att känna sig misslyckad. Den ska alltid hjälpa användaren att lyckas med nästa lilla steg.**

### Övriga principer

| # | Princip |
|---|---------|
| 1 | **Handling före utforskning** — Execution (Idag) är standardlandning |
| 2 | **Samma motor, olika upplevelse** — se architecture-platform |
| 3 | **Stöd ändrar hur, inte vad** — adaptiv profil (PBS12) ändrar inte IA |
| 4 | **Ansvar följer ålder** — barn utför; vuxen planerar (Gen 1) |
| 5 | **Historik är sanning** — radera inte det förflutna vid återstart |
| 6 | **Coach guidar, styr inte** — en CTA, kort copy |
| 7 | **Självständighet är framgång** — mindre hjälp över tid (PBS10) |
| 8 | **Integritet ökar med mognad** — teen/adult defaults |

---

## Bilaga A — PBS06–PBS12 (utkast)

*Volym 2 utbyter dessa till full PBS-format som PBS01–PBS05.*

| ID | Beteende | Kärnfråga | Gen 1 |
|----|----------|-----------|-------|
| **PBS06** | Komma igång | Känner jag mig trygg på 5 min? | Delvis |
| **PBS07** | Reflektion | Vad lär jag mig utan bedömning? | Delvis |
| **PBS08** | Relationer | Vem finns i mitt stödnät? | Live |
| **PBS09** | Delning | Vad delar jag, med vem, med samtycke? | Delvis |
| **PBS10** | Självständighet | Behöver jag appen mindre över tid? | Delvis |
| **PBS11** | Livsövergångar | Växer produkten med mig? | Strategi |
| **PBS12** | Anpassningsprofil | Guidad / Stöttad / Självständig | Delvis |

Detaljerad utkastlogik finns i [`USE_CASES_PLATFORM.md`](./USE_CASES_PLATFORM.md) (äldre UC-nummer) tills volym 2 migrerats.

### Mapping äldre UC → PBS

| Äldre UC | PBS |
|----------|-----|
| UC01 Komma igång | PBS06 |
| UC02 Planera dagen | **PBS01** |
| UC03 Utföra aktivitet | **PBS02** |
| UC04 Motivation | **PBS03** |
| UC05 Reflektion | PBS07 |
| UC06 AI Coach | **PBS04** |
| UC09 Kris/bakslag | **PBS05** |
| UC07 Relationer | PBS08 |
| UC08 Delning | PBS09 |
| UC10 Självständighet | PBS10 |
| UC11 Livsövergångar | PBS11 |
| UC12 Anpassningsprofil | PBS12 |

---

## Bilaga B — Testa beteende (inte bara funktion)

Varje PBS ska ha **acceptanstest** formulerat som beteende:

| ❌ Funktionstest | ✅ Beteendetest |
|----------------|----------------|
| "Schema sparas" | "Barn ser ny aktivitet inom 60 s utan att öppna schema-vy" |
| "Complete returnerar 200" | "Efter complete visas nästa steg utan meny-navigering" |
| "Streak nollställs" | "Efter 7 dagars gap: coach erbjuder ett steg, ingen skam-copy" |

---

## Versionshistorik

| Version | Datum | Ändring |
|---------|-------|---------|
| 0.1 | 2026-06-26 | Volym 1: PBS01–PBS05 fullständiga. PBS06–12 utkast. Primär produktspec. |

**Nästa:** Volym 2 — PBS06–PBS12 i full format. Volym 3+ — edge cases, AI-ton per trigger, flerspråk.
