# TEMP — Plattform & PBS (kopiera/klistra)

> Genererat 2026-06-26  
> **OBS:** `PRODUCT_BEHAVIOR_SPEC.md` är ~3400 rader — ofta bättre att länka/läsa direkt än kopiera hela TEMP.

| # | Fil |
|---|-----|
| 1 | `VISION-2030.md` (~69 r) |
| 2 | `PRODUCT_BEHAVIOR_SPEC.md` (~3436 r) |
| 3 | `architecture-platform.md` (~370 r) |
| 4 | `APP-V2-KRAVSPEC.md` (~686 r) |
| 5 | `USE_CASES_PLATFORM.md` (~917 r) |
| 6 | `barnmeny-v2.md` (~1414 r) |
| 7 | `vuxenmeny-v2.md` (~858 r) |

---


========================================================================
KÄLLA: VISION-2030.md
========================================================================

# Vision 2030 — Executive summary

**Skapad:** 2026-06-26  
**Status:** Strategisk riktning — kompletterar [`architecture-platform.md`](./architecture-platform.md)

---

## En mening

Vi bygger en **motor för exekutiv funktion** — inte en barnapp. Generation 1 (barn 4–12 + föräldrar) är första kunden, inte slutprodukten.

---

## Arkitektur i tre rader

1. **Core Platform** — tasks, goals, rewards, progress, relationships, coach, permissions (delad logik).
2. **Presentation Profiles** — Child, Teen, Young Adult, Adult (samma data, annan nav/språk/design).
3. **Produkter** — olika upplevelser på samma motor.

**Product Behavior Spec:** **[`PRODUCT_BEHAVIOR_SPEC.md`](./PRODUCT_BEHAVIOR_SPEC.md)** (PBS01–PBS05 volym 1)  
Arkitektur: **[`architecture-platform.md`](./architecture-platform.md)**

---

## Beslutsgate

Innan varje större v2-beslut:

> *Kan samma motor presenteras för en 24-åring med ADHD utan arkitekturomskrivning?*

---

## Generationer

| Gen | Målgrupp | Status |
|-----|----------|--------|
| 1 | Barn 4–12, föräldrar, pedagoger | Live |
| 2 | Ungdomar 13–17 | Spec |
| 3 | Unga vuxna 18–30 | Horisont |
| 4 | Vuxna | Horisont |

**App v2 = Platform v1** — nav, domänmodell och config som gör Gen 2–4 möjliga.

---

## Tre engines (plattformsneutralt)

| Engine | Barn (Gen 1) | Tonåring | Vuxen |
|--------|--------------|----------|-------|
| Execution | Idag | Idag | Tasks / Idag |
| Progress | Min värld | Mitt space | Mål / Growth |
| Relationship | Mina personer | Mina personer | Network |

---

## Vad vi säljer (egentligen)

Inte *bildschema* — utan **mindre stress, bättre rutiner, fungerande vardag**. Gäller barn, studenter och vuxna med NPF/ADHD.

---

## Nästa dokument att läsa

| Dokument | Innehåll |
|----------|----------|
| [`architecture-platform.md`](./architecture-platform.md) | Full plattformsspec |
| [`APP-V2-KRAVSPEC.md`](./APP-V2-KRAVSPEC.md) | Platform v1 leveranskrav |
| [`engineering-architecture-barnapp.md`](./engineering-architecture-barnapp.md) | Gen 1 implementation idag |

========================================================================
KÄLLA: PRODUCT_BEHAVIOR_SPEC.md
========================================================================

# Product Behavior Specification (PBS) — Version 1.0

**Skapad:** 2026-06-26  
**Version:** 1.0  
**Status:** Grundversion — normerande produktdokument  
**Ägare:** Produkt  
**Språk:** Svenska  
**Primär målgrupp för dokumentet:** UX, AI, test, QA, produkt, framtida medarbetare  
**Detta dokument är inte:** kodspec, API-dokumentation, implementationstodo eller sprintplan  
**Målomfång när PBS är komplett:** 250-400 sidor  
**Omfång i v1.0:** Fundamentet är definierat; Del 1-3 samt Del 5-10 är skrivna som styrande kapitel, Del 4 innehåller UC-mall, UC-katalog och åtta fulla use cases

> PBS är produktens beteendebibel. Den svarar inte främst på *hur koden byggs* utan på *hur produkten beter sig, känns, reagerar och begränsar sig* i verklig användning.

---

## Dokumenthierarki

```text
PBS
  > architecture-platform.md
    > APP-V2-KRAVSPEC.md
```

### Tolkning av hierarkin

- **PBS** definierar produktens avsikt, beteende, språk, psykologi, ansvar och icke-förhandlingsbara regler.
- **architecture-platform.md** beskriver den plattformsmotor som ska kunna bära samma beteende över flera presentationer och målgrupper.
- **APP-V2-KRAVSPEC.md** beskriver vad Generation 1 / App v2 ska leverera i denna fas.

### Vid konflikt gäller

1. **PBS vinner över alla andra produktdokument** när frågan gäller beteende, tonalitet, ansvar, användarupplevelse eller princip.
2. **architecture-platform.md** vinner över leveransspecar när frågan gäller konceptuell plattform och framtida presentationsneutralitet.
3. **APP-V2-KRAVSPEC.md** preciserar leverans, men får inte bryta mot PBS eller den plattformsriktning som arkitekturdokumentet sätter.

### Relaterade dokument

- [`architecture-platform.md`](./architecture-platform.md)
- [`VISION-2030.md`](./VISION-2030.md)
- [`APP-V2-KRAVSPEC.md`](./APP-V2-KRAVSPEC.md)

---

## Hur PBS ska användas

### PBS används när teamet frågar

- Hur ska coachen reagera när barnet inte orkar?
- Vem ansvarar för planering i respektive livsfas?
- Vad ska belöning förstärka, och vad ska den aldrig kapa?
- Hur ska misslyckanden kännas i appen?
- Hur beter sig produkten för barn jämfört med ungdom och vuxen?
- Vilka regler får inte brytas även om data visar kortsiktig vinst?

### PBS används inte som

- checklista för enskild route
- teknisk API-källa
- databasmanual
- färdig QA-matris
- pixelperfekt designspec

### Grundregel för läsning

Om en person läser endast ett dokument för att förstå produkten som system för mänskligt stöd ska den personen läsa **detta dokument**.

---

# DEL 1 – FILOSOFI

## 1.1 Varför produkten finns

Produkten finns för att vardagen ofta går sönder i glappet mellan vilja och handling. Många familjer vet *vad* de vill få gjort, men saknar ett system som gör nästa steg tydligt, tryggt och möjligt att börja med utan friktion.

Produkten finns inte för att digitalisera listor. Den finns för att minska kaos, minska tjat, minska skam och öka känslan av:

- jag vet vad som händer nu
- jag kan börja
- jag blev klar
- jag kan försöka igen i morgon

För Generation 1 börjar detta hos barn 4-12 och deras vårdnadshavare. Men själva problemet är större än målgruppen. Produkten adresserar exekutiv funktion: att planera, starta, fortsätta, slutföra, återhämta sig och bygga hållbara mönster.

## 1.2 Mission

**Mission:** Att hjälpa människor och familjer att få vardagen att fungera genom att göra nästa steg begripligt, genomförbart och meningsfullt.

Missionen är praktisk. Den ska märkas i varje interaktion. Appen ska inte bara vara "fin" eller "pedagogisk"; den ska konkret sänka tröskeln mellan intention och handling.

## 1.3 Vision

**Vision:** Att bli den ledande motorn för exekutiv funktion över livets olika faser: barn, ungdom, ung vuxen och vuxen.

Det betyder:

- samma kärnmotor kan hjälpa ett barn att borsta tänderna
- samma kärnmotor kan hjälpa en tonåring att få iväg en skoluppgift
- samma kärnmotor kan hjälpa en vuxen att skapa fungerande vardagsrutiner

Visionen handlar inte om att göra samma UI för alla. Den handlar om att samma beteendelogik ska kunna bära olika presentationer.

## 1.4 Produktens kärnidé

Produkten är en **motor för exekutiv funktion**. Den centrala loopen är:

```text
Planera -> Starta -> Göra -> Bekräfta -> Känna framsteg -> Försöka igen
```

Varje del i loopen måste vara lättare med appen än utan appen.

Om någon del känns tyngre än i verkligheten har produkten tappat sitt existensberättigande.

## 1.5 Produktprinciper

### P1. Handlingsklarhet före informationsmängd

Produkten ska alltid prioritera att användaren vet vad nästa steg är, före att användaren ser allt.

### P2. Stöd före styrning

Produkten får guida, föreslå, bryta ned och lugna, men ska undvika att ge känslan av övervakning eller befallning.

### P3. Framsteg före perfektion

Appen ska förstärka att det räcker att komma vidare. Den ska inte signalera att en "perfekt dag" är det enda som räknas.

### P4. Människan före streaken

Streak, stjärnor, XP och achievements är verktyg. De får aldrig bli viktigare än psykisk trygghet, relationell värme eller faktisk vardagsfunktion.

### P5. Kontinuitet före nystart

När användaren faller ur ska appen hjälpa hen tillbaka genom låg tröskel, inte genom att börja om från noll emotionellt.

### P6. Ålder ändrar presentation, inte värdighet

Barn, ungdomar och vuxna kan ha olika språk, design och motivationsnivå, men produkten ska behandla alla som kompetenta människor med olika stödbehov.

### P7. Relationer är stöd, inte kontroll

Förälder, pedagog, terapeut och coach ska stärka användarens förmåga. Systemet får inte normalisera att andra människor använder appen för ren kontroll.

### P8. Belöning ska peka tillbaka mot handling

Belöning får skapa energi, men den ska alltid förstärka att *du gjorde något* och inte att *appen gav dig något*.

### P9. Vardagen är primär, appen är sekundär

Appen ska korta vägen till livet. Den ska inte skapa ett beroende av att stanna i gränssnittet.

### P10. Ingen användare ska behöva skämmas inför appen

Produkten får visa att något inte blev gjort. Den får aldrig uttrycka att användaren är dålig.

## 1.6 Designprinciper

### D1. Ett tydligt "nu"

Barnets primära upplevelse ska alltid ge ett tydligt svar på frågan: **Vad gör jag nu?**

### D2. Nästa steg ska kännas mindre än problemet

När användaren tvekar ska produkten minska kognitiv vikt, inte öka den.

### D3. Värme utan sockersötma

Designen ska kännas trygg, varm och uppmuntrande utan att bli infantil eller manipulerande.

### D4. Rörelse med funktion

Animation används för:

- riktning
- bekräftelse
- emotionell avlastning
- övergång mellan tillstånd

Animation används inte för att stjäla fokus eller försvåra nästa handling.

### D5. Progress ska kännas byggd, inte utdelad

När användaren får stjärnor eller annan progress ska det upplevas som resultatet av handling, inte som en gåva från systemet.

### D6. Trygghetslager före upptäckarlager

Det viktigaste får aldrig ligga bakom kreativ utforskning, sidomenyer eller modala avstickare.

### D7. Samma känsloregler i hela produkten

Om ett misslyckande behandlas varsamt i barnvyn ska samma princip gälla i föräldravyn, coachen och framtida vuxenflöden.

## 1.7 Coachprinciper

### C1. Coachen observerar innan den korrigerar

Först förstå situation, sedan svar.

### C2. Coachen förstärker agency

Språket ska påminna användaren om att hen kan agera, välja och försöka.

### C3. Coachen förenklar utan att fördumma

Kortare meningar, färre val, tydlig riktning. Inte barnsligt tonfall till någon som behöver stöd.

### C4. Coachen ska tåla motstånd

När användaren inte vill, inte orkar eller har tappat rytm ska coachen inte bli straffande eller passiv-aggressiv.

### C5. Coachen får vara tyst

Tystnad är ofta bättre än ännu ett tips. Coachen ska inte fylla varje tomrum.

### C6. Coachen normaliserar återstart

Det viktigaste efter avbrott är att få användaren tillbaka till en möjlig nästa handling.

### C7. Coachen pratar aldrig om "fel person"

Coachen får tala om ett uteblivet beteende. Den får inte antyda en negativ identitet.

## 1.8 Motivationsprinciper

### M1. Start är dyrare än fortsättning

Systemet ska lägga störst stöd där initiering är svårast.

### M2. Bekräftelse ska komma nära handling

Bra feedback ska ske direkt när något faktiskt har gjorts.

### M3. Framsteg ska vara synligt även när resultatet är litet

En liten handling är bättre än ingen handling, och produkten ska signalera det.

### M4. Belöning ska vara proportionerlig

En liten aktivitet ger liten belöning. En större insats kan ge mer. Men ingen aktivitet ska kräva orimlig väntan på meningsfull feedback.

### M5. Missad dag ska inte döda identiteten

En bruten streak får aldrig kommuniceras som att användaren "är tillbaka på ruta ett" som människa.

### M6. Yttre motivation ska bära inre motivation

Stjärnor och visuella belöningar ska fungera som broar till vanor, stolthet, självbild och lugnare vardag.

### M7. Olika livsfaser behöver olika förstärkning

Barn behöver ofta konkret och synlig feedback. Ungdomar behöver mer autonomi och mindre uppenbar gamification. Vuxna behöver främst mening, struktur och friktionsreduktion.

## 1.9 Vad appen aldrig får göra

Produkten får aldrig:

1. få användaren att känna sig bedömd som person
2. kalla uteblivna handlingar för misslyckad identitet
3. använda skuld som primär drivkraft
4. belöna app-användning mer än verklig handling
5. få ett barn att tro att kärlek eller vuxengodkännande är villkorat av prestation
6. få föräldern att känna att enda vägen är hårdare kontroll
7. ge en tonåring eller vuxen ett infantilt språk om profilen inte explicit valt det
8. göra en svår dag värre genom att visa jämförelse, skam eller aggressiva streak-förluster
9. låta coachen prata hela tiden
10. skapa fler beslut i det ögonblick användaren redan är överbelastad
11. radera historik på ett sätt som förstör begriplighet
12. dölja vad som är "nu" bakom för mycket navigation
13. göra belöningar mer centrala än genomförandet
14. förutsätta perfekta morgnar, perfekta familjer eller perfekt energi
15. designa för att maximera skärmtid

## 1.10 Definition av framgång

Produkten är framgångsrik när användaren, på sin egen nivå, oftare kan säga:

- jag kom igång
- jag visste vad jag skulle göra
- det blev inte perfekt men det blev något
- jag kunde börja om
- vi hade mindre konflikt hemma
- appen hjälpte mer än den störde

---

# DEL 2 – DOMÄNMODELL

## 2.1 Syfte med domänmodellen

Den här delens uppgift är att definiera produktens begrepp på beteendenivå. Den beskriver inte exakt hur varje tabell ser ut i databasen, men den knyter varje produktbegrepp till nuvarande system så att UX, QA, AI och framtida produktarbete använder samma språk.

## 2.2 Övergripande domänbild

```text
Person
  -> kan ha en eller flera roller
  -> deltar i en eller flera grupper/familjer
  -> kan stötta eller utföra

Member
  -> är en person i en viss kontext
  -> har ansvar, rättigheter och presentation

Barn / Ungdom / Vuxen
  -> är presentationsprofiler av medlemmen

Förälder / Pedagog / Terapeut / Coach
  -> är stödroller kring medlemmen

Familj / Group
  -> håller relationer, regler, schema, belöningar och delat sammanhang

Aktivitet
  -> byggsten i rutin och dag

Rutin
  -> återkommande ordning av aktiviteter

Dag
  -> konkret spelplan för idag eller visst datum

Progress
  -> allt som visar rörelse över tid

Belöning
  -> konkret eller symbolisk återkoppling på handling

Mål
  -> riktning över flera dagar eller veckor

Achievement
  -> särskilt erkänd progresshändelse

Universe / Progress surface
  -> platsen där progress blir synlig och meningsfull

Historik
  -> minne av vad som hänt, utan att förvanska verkligheten
```

## 2.3 Kärnobjekt

### 2.3.1 Person

**Definition:** En människa i produktsystemet oavsett ålder, kontoform eller presentationsprofil.

**Viktiga beteenderegler:**

- Person är den mest värdiga och neutrala nivån i språket.
- Produkten ska över tid kunna tala om människor utan att vara låst till "barn" eller "förälder" i hela arkitekturen.
- En person kan vara både mottagare av stöd och ge stöd.

**Nuvarande systemankare:**

- `parent`
- `child`

**Framtida plattformsriktning:**

- neutralt person-/member-språk i events, AI-resonemang och framtida presentationer

### 2.3.2 Member

**Definition:** En person i en viss kontext, med vissa rättigheter, begränsningar, relationer och en viss presentation.

**Varför det behövs:**

- Samma människa kan uppträda som barn i en vy, elev i en annan, eller vuxen användare i framtiden.
- Samma person kan höra till flera relationer och grupper.

**Nuvarande systemankare:**

- `parent_child`
- `family`
- `parent.account_type`
- `child.child_view_config`

### 2.3.3 Barn

**Definition:** Medlem i barnpresentation, typiskt 4-12 år i Generation 1, där produkten bär mer av planeringen och görandet upplevs som konkret, visuellt och tryggt.

**Regler:**

- Barnet ansvarar inte för att förstå hela veckostrukturen.
- Barnet behöver ett tydligt nu, ett nästa steg och en begriplig bekräftelse.
- Barnets yta ska aldrig kräva strategisk planering för att användas vardagligt.

**Nuvarande systemankare:**

- `child`
- `daily_log`
- `daily_log_item`
- `streak`
- `reward_redemption`

### 2.3.4 Förälder

**Definition:** Primär stödperson i Generation 1. Föräldern sätter ramar, planerar, justerar och tolkar barnets behov.

**Regler:**

- Föräldern äger planeringen i Gen 1.
- Föräldern ska kunna dela ansvar utan att tappa överblick.
- Föräldern ska uppleva att appen minskar friktion, inte skapar nytt projektarbete.

**Nuvarande systemankare:**

- `parent`
- `family`
- `family_invite`
- `system_messages`
- `push_subscriptions`

### 2.3.5 Coach

**Definition:** Produktens stödjande intelligens eller vägledande lager. Coachen kan vara regelbaserad, AI-baserad eller blandad, men uppträder alltid som ett beteende, inte som en egen person.

**Regler:**

- Coachen ska förstärka nästa steg, lugna, hjälpa tolka mönster och normalisera återstart.
- Coachen äger inte beslutet; människan äger beslutet.
- Coachen ska inte simulera intimitet som produkten inte kan bära ansvar för.

**Nuvarande systemankare:**

- För dig-flöden
- readiness-ytor
- framtida AI coach-logik
- analytics events kring coachinteraktion

### 2.3.6 Familj / Group

**Definition:** Det sammanhang där planering, ansvar, belöningar och stöd delas.

**Regler:**

- Familjen är inte bara en juridisk enhet utan en operativ grupp.
- Gruppen sätter vardagens rytm.
- Produkten ska på sikt kunna bära fler gruppformer än kärnfamilj utan att förstöra modellen.

**Nuvarande systemankare:**

- `family`
- `parent_child`
- `pedagog_invite`
- `family_features`
- `family_subscriptions`

### 2.3.7 Relation

**Definition:** Bindningen mellan människor i systemet: omsorg, ansvar, delning, samarbete, observation, coaching eller professionellt stöd.

**Nuvarande systemankare:**

- `parent_child`
- `pedagog_invite`
- `professional_share_link`
- `family_invite`

**Beteenderegel:**

Relationer ska ge rätt sorts synlighet och rätt sorts gräns. Inte allt stöd kräver full åtkomst.

### 2.3.8 Aktivitet

**Definition:** Minsta meningsfulla handlingsenhet som kan planeras, startas, utföras, hoppas över, pausas eller slutföras.

**Exempel:**

- klä på sig
- äta frukost
- ta medicin
- packa gympapåse
- skriva två meningar på en uppgift

**Nuvarande systemankare:**

- `activity_template`
- `default_activity_template`
- `weekly_schedule_item`
- `special_day_schedule_item`
- `daily_log_item`

**Beteenderegel:**

En aktivitet ska vara tillräckligt liten för att börja, men tillräckligt meningsfull för att kännas verklig.

### 2.3.9 Rutin

**Definition:** En återkommande struktur av aktiviteter med ordning, sammanhang och ofta återkommande tidpunkt eller sektion.

**Nuvarande systemankare:**

- `weekly_schedule`
- `weekly_schedule_item`
- `default_schedule`
- `default_schedule_item`

**Beteenderegel:**

En rutin är inte bara en lista; den är ett förutsägbart mönster som minskar beslutsbörda.

### 2.3.10 Dag

**Definition:** Den konkreta dagliga exekveringsytan där rutiner, specialdagar, undantag och faktiskt genomförande möts.

**Nuvarande systemankare:**

- `daily_log`
- `daily_log_item`
- `special_day_schedule`
- `schedule_date_exclusion`

**Beteenderegel:**

Det är dagen, inte originalschemat, som användaren lever i. Därför ska dagens vy alltid kunna bära sena starter, ändringar och återhämtning.

### 2.3.11 Progress

**Definition:** All information som visar rörelse över tid, både numerisk och emotionell.

**Innehåller:**

- stjärnor
- XP eller framtida progressenheter
- streaks
- avslutade dagar
- upprepade vanor
- synlig byggd värld
- reflektion och historik

**Nuvarande systemankare:**

- `streak`
- star history
- `reward_redemption`
- analytics snapshots

### 2.3.12 Belöning

**Definition:** Återkoppling som gör ansträngning och handling kännbara och meningsfulla.

**Former:**

- stjärnor
- visuella upplåsningar
- samlarobjekt
- konkreta familjebelöningar
- verbal bekräftelse

**Nuvarande systemankare:**

- `reward`
- `default_reward`
- `reward_redemption`
- `daily_log_item.star_value`

### 2.3.13 Mål

**Definition:** En riktning som samlar flera aktiviteter eller flera dagar kring något användaren vill uppnå.

**Exempel:**

- få morgonen att fungera fyra dagar i rad
- bygga en vana att börja läxan i tid
- spara stjärnor till en önskad belöning

**Nuvarande systemankare:**

- delvis representerat via `reward`, streak och familjens planeringslogik
- fullt målobjekt är ännu inte helt förstaklass i nuvarande datamodell

### 2.3.14 Achievement

**Definition:** Ett särskilt igenkännbart tecken på att något viktigt har byggts upp eller uppnåtts.

**Exempel:**

- första slutförda aktivitet
- första hela morgonen
- fem återstarter efter motgång
- sju dagar med kvällsrutin

**Nuvarande systemankare:**

- delvis i visuella progressytor
- delvis implicit i historik
- kräver framtida tydligare modellering som plattformsbegrepp

### 2.3.15 Universe / Progress surface

**Definition:** Den plats där progress blir synlig, samlad och emotionellt begriplig.

**Barnets språk i Gen 1:** Min värld, Skattkammaren, samling, museum, upplåsningar.  
**Plattformsspråk:** Progress surface.

**Beteenderegel:**

Progressytan ska kännas som något användaren byggt, inte som ett skyltfönster för mekanik.

### 2.3.16 Historik

**Definition:** Minnet av vad som har hänt över tid.

**Funktion:**

- skapar kontinuitet
- möjliggör reflektion
- gör stödpersoners tolkning bättre
- ger AI möjlighet att föreslå lagom nästa steg

**Nuvarande systemankare:**

- `daily_log`
- `daily_log_item`
- `notification_log`
- `analytics_events`
- `analytics_daily_snapshots`
- rapport- och delningsytor

**Beteenderegel:**

Historik ska vara sanningsenlig, användbar och icke-dömande.

## 2.4 Hur objekten kopplar till varandra

| Objekt | Primär relation | Sekundär relation | Beteendemässig betydelse |
|--------|------------------|-------------------|---------------------------|
| Person | blir Member | ingår i Group | Gör modellen framtidssäker |
| Member | har profil/roll | kopplas till relationer | Bär ansvar och presentation |
| Barn | utför Aktivitet | samlar Progress | Mottagare av tydligt nu |
| Förälder | planerar Rutin | följer Historik | Bär planeringsansvar i Gen 1 |
| Coach | tolkar Historik | ger stöd i Dag | Hjälper utan att ta över |
| Familj/Group | rymmer Relationer | sätter Belöningar | Skapar delat sammanhang |
| Aktivitet | finns i Rutin | skrivs till Historik | Minsta meningsfulla enhet |
| Rutin | materialiseras som Dag | påverkar Progress | Förutsägbarhet över tid |
| Dag | bär Aktivitetstillstånd | matar Historik | Operativ verklighet |
| Progress | påverkar Motivation | syns i Progress surface | Känsla av rörelse |
| Belöning | växlas mot Progress | påverkar Motivation | Konkretisering av värde |
| Mål | organiserar Progress | påverkar Coach | Ger riktning över tid |
| Achievement | speglar milstolpe | stärker identitet | Synlig meningsfull signal |
| Historik | matar Coach/AI | stödjer QA/insikt | Människans minne i systemet |

## 2.5 Mappning till nuvarande databas

| PBS-begrepp | Nuvarande tabeller | Kommentar |
|------------|--------------------|-----------|
| Person | `parent`, `child` | Splittrad i dagens schema, bör hållas samman konceptuellt |
| Member | `parent`, `child`, `parent_child` | Är idag mer implicitt än explicit |
| Barn | `child` | Gen 1 primär utövare |
| Förälder | `parent` | Gen 1 primär planerare |
| Familj / Group | `family` | Kan på sikt generaliseras till grupp |
| Relation | `parent_child`, `family_invite`, `pedagog_invite`, `professional_share_link` | Olika djup av åtkomst |
| Aktivitet | `activity_template`, `default_activity_template`, schedule-item-tabeller | Mall, planerad instans och historik är redan separerade |
| Rutin | `weekly_schedule`, `weekly_schedule_item`, `default_schedule`, `default_schedule_item` | Bygger återkommande struktur |
| Dag | `daily_log`, `daily_log_item`, `special_day_schedule`, `schedule_date_exclusion` | Verklig operativ dag |
| Progress | `streak`, `daily_log_item.star_value`, `reward_redemption`, snapshots | Delvis distribuerad |
| Belöning | `reward`, `default_reward`, `reward_redemption` | Både konkret och motiverande lager |
| Mål | delvis `reward`, `streak`, framtida målmodell | Behöver tydligare förstaklassplats |
| Achievement | delvis implicit, framtida modell | Bör bli explicit senare |
| Progress surface | barnets progress-vyer, framtida neutral yta | Namn och UI skiftar per profil |
| Historik | `daily_log`, `daily_log_item`, `analytics_events`, delningsobjekt | Systemets minne |
| Coach / AI | rules, copy, future AI-layer, analytics | Beteende definieras här, teknik senare |

## 2.6 Domänregler

1. En aktivitet är inte samma sak som en aktivitetstemplate.
2. En dag får avvika från veckoplanen utan att historik eller förståelse förstörs.
3. Progress får samlas utan att vara låst till en enda valuta för alltid.
4. Relation och åtkomst är inte samma sak.
5. Belöning måste kunna vara både konkret och symbolisk.
6. Historik ska bevara att saker hände i rätt dag, även om de registrerades senare.
7. Coachens resonemang ska alltid utgå från domänobjekt, inte skärmnivåer.
8. Samma kärnobjekt ska kunna presenteras annorlunda för barn, ungdom och vuxen.

---

# DEL 3 – ROLLER

## 3.1 Syfte

Rollkapitlet definierar inte bara vem som kan klicka var. Det definierar förväntat ansvar, lämplig autonominivå, rimliga begränsningar, primära mål, motiverande mekanismer och vad produkten ska optimera för i mötet med varje roll.

## 3.2 Rollöversikt

| Roll | Primär fråga i produkten | Stödbehov | Typisk primär yta |
|------|---------------------------|-----------|-------------------|
| Barn | Vad gör jag nu? | Hög struktur, låg kognitiv last | Idag / Min värld |
| Förälder | Hur får vi vardagen att fungera? | Överblick, planering, samordning | Hem / Planering / Familj |
| Ungdom | Hur får jag kontroll utan att bli styrd? | Autonomi + trygg struktur | Idag / mål / coach |
| Vuxen | Hur får jag vardagen att hålla? | Friktionsreduktion, reflektion, stöd | tasks / mål / progress |
| Pedagog | Hur kan jag stötta i min professionella roll? | Relevanta observationer, tydliga gränser | pedagogytor / delade rapporter |
| Terapeut | Hur kan jag förstå mönster utan att störa vardagen? | Selektiv insyn, kontext, samtycke | delning / rapport / observation |

## 3.3 Barn

### Ansvar

- försöka starta nästa aktivitet
- utföra aktiviteten på sin nivå
- markera klar med stöd när det passar upplägget
- uttrycka behov av hjälp när något känns svårt

### Förväntningar

- barnet ska inte behöva förstå hela veckan för att lyckas idag
- barnet ska kunna lyckas även när energi, humör eller tempo varierar
- barnet ska mötas av tydlighet, trygghet och snabb återkoppling

### Begränsningar

- ansvarar inte för övergripande planering i Gen 1
- ska inte behöva tolka komplex statistik
- ska inte bära skulden för att rutinen blivit felkonstruerad
- ska inte mötas av för många samtidiga val

### Mål

- veta vad som händer nu
- få känna "jag kan"
- se att små insatser räknas
- bygga vardagsfärdigheter och självförtroende

### Motivation

- snabb konkret bekräftelse
- visuellt begriplig progress
- känsla av att bygga något eget
- varm och tydlig coach

### Belöningar

- stjärnor, samlingar, upplåsningar och familjebelöningar fungerar bra
- belöning ska vara nära handling och aldrig ersätta relationell bekräftelse

### Produktens ton mot barn

- tydlig
- varm
- saklig
- lekfull vid rätt tillfälle
- aldrig sarkastisk eller skammande

## 3.4 Förälder

### Ansvar

- skapa och justera barnets rutiner
- tolka barnets behov och dagsform
- sätta rimliga förväntningar
- definiera belöningar och struktur
- samordna med andra vuxna vid behov

### Förväntningar

- föräldern ska känna kontroll utan att behöva mikroadministrera
- planering ska gå snabbt att förstå och lätt att ändra
- produkten ska hjälpa föräldern bli mjukare och tydligare, inte hårdare

### Begränsningar

- föräldern kan inte kräva perfekta mätvärden från barnet
- produkten ska inte erbjuda överdetaljerad kontroll som ökar konflikt hemma
- föräldern ska inte behöva bli projektledare för appen

### Mål

- färre konflikter
- lugnare övergångar
- bättre morgnar och kvällar
- högre självständighet hos barnet
- mer delat ansvar mellan vuxna

### Motivation

- se att vardagen faktiskt blir lättare
- se tydliga nästa steg när något inte fungerar
- få stöd i att justera rutiner, inte bara läsa data

### Belöningar

- föräldern motiveras främst av minskad friktion och synlig vardagsvinst
- produktens "belöning" till föräldern är klarhet, inte gamification

### Produktens ton mot föräldern

- empatisk
- handlingsorienterad
- icke-dömande
- kunnig utan att vara mästrande

## 3.5 Ungdom

### Ansvar

- vara delaktig i planering
- välja prioritet eller strategi när möjligt
- starta, pausa, återuppta och slutföra på eget konto
- reflektera över vad som fungerar

### Förväntningar

- ungdomen ska känna ägarskap, inte barnstyrning
- systemet ska erbjuda struktur utan att kännas som föräldrakontroll
- coachen ska respektera integritet och självbild

### Begränsningar

- för mycket barnslig belöningslogik blir kontraproduktiv
- föräldralogik får inte läcka in i språk eller visualitet
- statistik ska hjälpa självförståelse, inte upplevas som övervakning

### Mål

- större självständighet
- bättre skol- och vardagsgenomförande
- minskad friktion mellan vilja och start
- stärkt känsla av kompetens

### Motivation

- autonomi
- tydlig kontroll över egna prioriteringar
- vuxnare språk
- progress som känns legitim, inte gullig

### Belöningar

- streaks, levels, mål, achievement och självvalda rewards kan fungera
- belöningsspråk måste dämpas och individualiseras

### Produktens ton mot ungdom

- respektfull
- rak
- hjälpsam
- aldrig bebisifierande

## 3.6 Vuxen

### Ansvar

- planera sin vardag
- välja ambitionsnivå
- utvärdera vad som fungerar
- söka stöd från coach eller nätverk när det behövs

### Förväntningar

- vuxna ska kunna använda samma kärnmotor utan att känna att de använder en barnapp
- appen ska avlasta exekutiv börda, inte skapa ännu ett system att sköta

### Begränsningar

- för mycket pynt, samlarprat eller infantil feedback riskerar att förstöra förtroendet
- systemet får inte låtsas förstå djupa livsproblem som det inte kan bära

### Mål

- stabil vardagsfunktion
- pålitlig struktur
- bättre start på viktiga uppgifter
- mindre skuld och mer återstart

### Motivation

- tydlig prioritet
- minskad mental friktion
- begriplig progress
- känsla av att bygga ett fungerande livssystem

### Belöningar

- progress, klarhet, streaks, självformulerade mål och meningsfull reflektion är viktigare än barnsliga tokens

### Produktens ton mot vuxen

- respektfull
- lågmält trygg
- intelligent
- precis

## 3.7 Pedagog

### Ansvar

- stötta barnet inom professionell kontext
- observera relevanta mönster
- bidra med struktur och uppföljning när familjen vill
- respektera ansvarsfördelning och integritet

### Förväntningar

- pedagogen ska se det som behövs för att kunna stötta
- pedagogen ska inte behöva navigera familjens hela privatliv
- professionella anteckningar ska vara möjliga utan att rollen blandas ihop med förälder

### Begränsningar

- pedagogen ska bara ha åtkomst till tilldelade barn och avsedd information
- rollen får inte kunna använda appen som generell familjemonitor

### Mål

- bättre kontinuitet mellan hem och skola/verksamhet
- tydligare uppföljning av vardagsstöd
- mindre informationsförlust mellan miljöer

### Motivation

- enkel åtkomst till rätt observationsyta
- tydlig relevans
- låg administrationskostnad

### Belöningar

- pedagogen motiveras inte av produktbelöningar utan av att stödet fungerar och att samarbete blir lättare

## 3.8 Terapeut

### Ansvar

- bidra med professionell förståelse av mönster, hinder och möjliga anpassningar
- använda delad information varsamt och med samtycke
- hjälpa till att tolka, inte styra vardagsdrift

### Förväntningar

- terapeuten ska kunna se tillräcklig kontext för att ge bättre stöd
- delning ska vara selektiv, tidsbegränsad och begriplig

### Begränsningar

- ingen full familjeåtkomst utan explicit behov
- ingen permanent närvaro som standard
- terapeuten ska inte ersätta familjens eller individens ägarskap

### Mål

- förstå mönster
- ge bättre rekommendationer
- minska missförstånd kring vardagsfunktion

### Motivation

- tydlig historik
- bra sammanfattningar
- möjlighet att fokusera på relevanta perioder och fält

### Belöningar

- inga spelifierade belöningar; värdet är bättre klinisk eller stödjande förståelse

## 3.9 Rollregler över hela systemet

1. Barnets yta optimerar för genomförande.
2. Förälderns yta optimerar för planering och samordning.
3. Ungdomens yta optimerar för autonomi med stöd.
4. Vuxnas yta optimerar för struktur utan infantilisering.
5. Pedagog och terapeut ska arbeta med rätt nivå av åtkomst.
6. Coachens språk, intensitet och synlighet varierar per roll och profil.
7. Samma domänobjekt får presenteras olika, men deras mening ska vara konsekvent.

---

# DEL 4 – USE CASES

## 4.0 UC-mall

Varje full UC i PBS ska använda följande mall. Syftet är att beskriva beteende, inte enbart funktion.

### UC-mall

| Fält | Beskrivning |
|------|-------------|
| **Syfte** | Varför use caset finns i människans verklighet |
| **Mål** | Vad som ska vara sant när use caset lyckas |
| **Roller** | Vilka roller som deltar eller påverkas |
| **Ansvar** | Vem som äger vilken del av flödet |
| **Trigger** | Vad som startar use caset |
| **Förutsättningar** | Vad som måste vara sant innan |
| **Normalflöde** | Huvudförlopp steg för steg |
| **Alternativa flöden** | Rimliga variationer som fortfarande leder framåt |
| **Undantag** | När något går fel eller måste stoppas |
| **UI** | Hur gränssnittet ska bära beteendet |
| **Coach** | Hur coachen agerar, säger och avstår |
| **Animation** | Rörelseregler för detta läge |
| **Ljud** | Regler för ljud och tystnad |
| **Belöning** | Vilken förstärkning som ges och varför |
| **Progress** | Vilken progress som påverkas eller inte påverkas |
| **Statistik** | Vilka beteendesignaler som ska synas för mänsklig uppföljning |
| **AI** | Hur AI eller regelmotor får bidra |
| **Analytics** | Eventnamn och mätpunkter |
| **KPI** | Hur vi vet att beteendet fungerar |
| **Acceptance Criteria** | Beteendetester, inte funktionstester |
| **Future barn/ungdom/vuxen** | Hur samma use case ska ändra presentation över livsfaser |

### Regler för alla UC-specar

1. Beskriv vad användaren upplever, inte bara vad systemet gör.
2. Om ett steg kan kännas skammande ska det designas om.
3. Alla UCs ska ange vad coachen **inte** får säga.
4. Alla UCs ska ange om belöning är relevant eller uttryckligen frånvarande.
5. Acceptance criteria ska beskriva beteende, upplevelse och riktning, inte bara API-resultat.

## 4.1 Katalog UC001-UC060

> **Not om numrering:** UC-ID är låsta i denna version för att skapa en stabil referensryggrad för design, QA och framtida volymer. Några namn ligger därför kvar på historiska nummer trots att tematisk gruppering kommer att kunna förfinas i senare versioner.

### Identitet & konto (UC001-UC005)

| ID | Namn | Gen1-status |
|----|------|-------------|
| UC001 | Skapa konto | live |
| UC002 | Logga in och återuppta session | live |
| UC003 | Skapa första barnet | live |
| UC004 | Bygga schema / planera dag | live |
| UC005 | Hantera familjekonto och vuxenroller | delvis |

### Onboarding (UC006-UC010)

| ID | Namn | Gen1-status |
|----|------|-------------|
| UC006 | Första appstart och trygg första riktning | delvis |
| UC007 | Starta aktivitet | live |
| UC008 | Slutföra aktivitet | live |
| UC009 | Hoppa över aktivitet | live |
| UC010 | Första synliga framsteg och första stjärnan | delvis |

### Planering (UC011-UC018)

| ID | Namn | Gen1-status |
|----|------|-------------|
| UC011 | Justera ordning i dagens rutin | live |
| UC012 | Kopiera dag, vecka eller barnets schema | live |
| UC013 | Planera specialdag eller undantag | live |
| UC014 | Coach interagerar | delvis |
| UC015 | Pausa, avvakta eller omplanera aktivitet | delvis |
| UC016 | Lägg till aktivitet från bibliotek | live |
| UC017 | Sätt sektionstider och rytm för dagen | live |
| UC018 | Skapa återanvändbar rutinmall | delvis |

### Execution (UC019-UC028)

| ID | Namn | Gen1-status |
|----|------|-------------|
| UC019 | Visa dagens nu-läge | live |
| UC020 | Visa nästa aktivitet | live |
| UC021 | Starta timer eller tidshjälp | delvis |
| UC022 | Arbeta genom delsteg | delvis |
| UC023 | Be om vuxenhjälp | planerat |
| UC024 | Byt barn eller användare i säker kontext | live |
| UC025 | Växla visningsläge efter behov | live |
| UC026 | Återuppta pausad aktivitet | delvis |
| UC027 | Hantera sen start eller avvikande morgon | delvis |
| UC028 | Avsluta dagens körning | planerat |

### Motivation (UC029-UC035)

| ID | Namn | Gen1-status |
|----|------|-------------|
| UC029 | Fira framsteg | live |
| UC030 | Återstart efter misslyckande | delvis |
| UC031 | Bygga och bära streak | live |
| UC032 | Sätta mål eller riktning | planerat |
| UC033 | Lösa in belöning | live |
| UC034 | Visa achievement eller milstolpe | delvis |
| UC035 | Veckoreflektion och lugn återblick | planerat |

### Coach & AI (UC036-UC042)

| ID | Namn | Gen1-status |
|----|------|-------------|
| UC036 | Coach föreslår nästa steg | delvis |
| UC037 | Coach hjälper omplanera dagen | planerat |
| UC038 | Coach bryter ned en stor uppgift | planerat |
| UC039 | Coach lugnar efter motgång | delvis |
| UC040 | Coach ställer reflektionsfråga | delvis |
| UC041 | Coach väljer att vara tyst | planerat |
| UC042 | Coach eskalerar till vuxen eller stödperson | planerat |

### Relationer (UC043-UC048)

| ID | Namn | Gen1-status |
|----|------|-------------|
| UC043 | Bjud in medförälder | live |
| UC044 | Bjud in pedagog | live |
| UC045 | Dela ansvar mellan vuxna | delvis |
| UC046 | Ge observation eller återkoppling mellan stödpersoner | delvis |
| UC047 | Se barnets stödteam | planerat |
| UC048 | Avsluta eller begränsa en relation | live |

### Delning & export (UC049-UC052)

| ID | Namn | Gen1-status |
|----|------|-------------|
| UC049 | Dela rapport | delvis |
| UC050 | Exportera historik | delvis |
| UC051 | Skapa professionell delningslänk | live |
| UC052 | Dela framsteg med samtycke | planerat |

### System (UC053-UC060)

| ID | Namn | Gen1-status |
|----|------|-------------|
| UC053 | Få relevant påminnelse | delvis |
| UC054 | Hantera offline eller svag uppkoppling | planerat |
| UC055 | Återställ session tryggt | live |
| UC056 | Anpassa språk och tillgänglighet | delvis |
| UC057 | Hantera notispreferenser | live |
| UC058 | Skydda med PIN och föräldralås | live |
| UC059 | Säker återinloggning efter avbrott | live |
| UC060 | Arkivera, pausa eller lämna produkten värdigt | planerat |

## 4.2 UC001 — Skapa konto

### Syfte

Att ge en ny användare en trygg, lågfriktionsstart där produkten upplevs som hjälp för vardagen, inte som ännu ett system som kräver energi innan värde känns.

### Mål

- användaren ska förstå varför kontot behövs
- registreringen ska kännas kortare än oron inför att börja
- användaren ska efter skapandet veta exakt nästa steg
- kontoskapandet ska öppna vägen till första verkliga värde inom samma session

### Roller

- primär: förälder i Generation 1
- sekundär: framtida vuxen användare
- indirekt berörd: barn, eftersom barnets framtida vardag bärs av detta första steg

### Ansvar

- användaren ansvarar för att ge tillräcklig grundinformation
- produkten ansvarar för att förklara värdet, minska osäkerhet och inte efterfråga mer än vad som behövs
- systemet ansvarar för att nästa steg efter skapandet är tydligt och varmt

### Trigger

- användaren klickar på "Skapa konto"
- eller når registreringsflödet efter att ha blivit inbjuden

### Förutsättningar

- användaren är inte redan aktivt inloggad
- registreringskanal är tillgänglig
- grundläggande identitetsinformation kan samlas in

### Normalflöde

1. Användaren möts av ett tydligt värdelöfte: appen hjälper familjen att få vardagen att fungera.
2. Formuläret ber om minsta möjliga information för att skapa en trygg start.
3. Varje fält motiveras implicit av sammanhanget; inget känns som onödig administration.
4. När kontot skapas får användaren omedelbar bekräftelse att första steget är taget.
5. Produkten leder direkt vidare till nästa meningsfulla handling, i Gen 1 vanligen att skapa första barnet.

### Alternativa flöden

- användaren registrerar sig via social eller federerad inloggning och ska då hoppa över onödig duplicerad information
- användaren kommer från inbjudan och leds direkt mot att ansluta till rätt familjekontext
- användaren avbryter mitt i; produkten ska kunna bjuda in tillbaka utan skuld

### Undantag

- felaktig e-post eller svagt lösenord ska beskrivas sakligt och reparerbart
- om session eller nätverk faller ska användaren inte känna att "allt försvann"
- om e-postverifiering krävs ska det kommuniceras som nästa steg, inte som avvisning

### UI

- formuläret ska vara kort, luftigt och begripligt
- primär CTA ska svara på användarens mentala fråga: "börja" snarare än "skicka"
- texten runt formuläret ska signalera stöd och vardagsnytta, inte konto- och policytyngd
- efter lyckad registrering ska användaren landa i rörelse framåt, inte på en död "klart"-skärm

### Coach

**Coachens roll:** lågmäld trygghet, inte närvaro i varje steg.

**Exempel på copy:**

- "Vi tar det steg för steg."
- "Börja enkelt nu, du kan justera senare."
- "Snart kan vi skapa första rutinen tillsammans."

**Coachen får aldrig säga:**

- "Du måste fylla i allt korrekt nu."
- "Om du hoppar över detta blir appen sämre."
- "Bra, nu är du äntligen igång" på ett sätt som låter skuldbeläggande

### Animation

- övergång till nästa steg ska kännas framåtdrivande men lugn
- ingen konfetti eller stark gamification vid konto; det här är en tröskelsänkning, inte en final
- lyckad registrering får gärna använda en kort mjuk övergång som signalerar trygg start

### Ljud

- tyst som standard
- eventuell ljudbekräftelse ska vara diskret och avstängningsbar

### Belöning

- ingen spelifierad belöning ges för kontoskapande
- den primära belöningen är psykologisk: "nu har vi börjat"

### Progress

- onboarding-progress kan markeras visuellt
- inget barns progresssystem påverkas ännu

### Statistik

- tid från landning till lyckat konto
- var avbrott sker
- om användaren når nästa meningsfulla steg i samma session

### AI

- AI ska inte generera långa välkomstbudskap här
- AI kan senare personalisera nästa steg baserat på kanal eller segment, men ska inte öka beslutsbördan i registreringen

### Analytics

- `signup_started`
- `signup_field_error`
- `signup_completed`
- `signup_returned_from_verification`
- `onboarding_step_entered`

### KPI

- andel som når skapad första familjekontext efter påbörjad registrering
- andel som går vidare till nästa steg utan att lämna produkten
- minskad avhoppsgrad i registrering

### Acceptance Criteria

- Givet att en ny användare startar kontoflödet ska upplevelsen kännas som en väg in i hjälp, inte som administration.
- Givet att ett fel uppstår i ett fält ska användaren förstå hur det går att reparera utan att känna att hela försöket misslyckats.
- När kontot skapats ska nästa steg framstå som naturligt och mindre svårt än före registreringen.
- Kontoskapandet ska inte innehålla belöningsspråk som konkurrerar med vardagsvärdet.

### Future barn/ungdom/vuxen

- **Barn:** skapar sällan konto själva; detta use case ägs av vuxen.
- **Ungdom:** behöver enklare men mer autonom identitetsskapning, med starkare integritetsramar.
- **Vuxen:** kontoflödet ska kännas som ett verktyg för självstöd, inte som familjeadmin.

## 4.3 UC003 — Skapa första barnet

### Syfte

Att göra produkten konkret. I samma ögonblick som första barnet skapas ska appen kännas mindre som ett konto och mer som ett stöd för en verklig människa.

### Mål

- föräldern ska känna att "nu bygger vi det här för mitt barn"
- barnet ska få en tydlig, trygg identitet i systemet
- produkten ska kunna gå vidare till meningsfull planering utan mer setup än nödvändigt

### Roller

- primär: förälder
- sekundär: barn
- indirekt: medförälder, pedagog, coach

### Ansvar

- föräldern ansvarar för grunduppgifter och rimliga val
- produkten ansvarar för att inte kräva perfektion eller komplett framtidsplanering

### Trigger

- användaren har skapat konto och befinner sig i onboarding
- eller väljer att lägga till första barnet i en ny familj

### Förutsättningar

- det finns ett aktivt föräldrakonto
- familjekontext finns eller skapas i samma flöde

### Normalflöde

1. Föräldern uppmanas att börja med barnet, inte med full veckoplan.
2. Produkten ber om namn och en första igenkänningsmarkör, exempelvis emoji eller bild.
3. Eventuella frivilliga uppgifter presenteras som hjälpsamma, inte obligatoriska.
4. När barnet sparas får föräldern en bekräftelse på att barnets plats nu finns i systemet.
5. Produkten leder direkt vidare mot enkel planering eller första rutin.

### Alternativa flöden

- föräldern väljer att skapa barnet med minimal information och komplettera senare
- föräldern lägger till flera barn senare, men förstaflödet ska fokusera på ett barn i taget

### Undantag

- om namn saknas ska återkopplingen vara enkel och konkret
- om bild eller emoji inte väljs ska produkten ha en varm standardidentitet
- om födelsedag saknas ska systemet fortsätta fungera utan skuld

### UI

- barnskapandet ska kännas personligt men inte tungt
- visuella val ska vara snabba och tydliga
- formuläret ska visa att detta går att ändra senare
- när barnet skapats ska nästa steg vara "bygg första dagen", inte "gå till inställningar"

### Coach

**Exempel på copy:**

- "Nu skapar vi en trygg start för [namn]."
- "Det här räcker för att komma igång."
- "Ni kan alltid justera senare."

**Coachen får aldrig säga:**

- "Välj rätt från början."
- "Barnets profil måste vara komplett."
- "Nu ska vi optimera allt"

### Animation

- när barnet sparas kan identiteten få en mjuk materialisering, exempelvis avatar/emoji som landar in
- övergången ska ge känslan av att något riktigt nu finns
- ingen överdriven segeranimation; detta är etablering, inte prestation

### Ljud

- inget ljud krävs
- eventuellt positivt klick ska vara mycket diskret

### Belöning

- ingen yttre belöning
- emotionell belöning: barnet blir synligt, namngivet och "hemma" i appen

### Progress

- onboarding-progress går framåt
- systemet kan nu börja koppla framtida historik, schema och rewards till rätt barn

### Statistik

- tid från konto till första barn skapat
- andel användare som fortsätter till planering efter att barn skapats

### AI

- AI kan föreslå enkla nästa steg baserat på barnets ålder eller vald nivå
- AI ska inte analysera barnet utifrån för lite data

### Analytics

- `child_profile_create_started`
- `child_profile_created`
- `child_profile_create_skipped_optional_field`
- `onboarding_continue_to_planning`

### KPI

- andel nya familjer som skapar minst ett barn första sessionen
- andel som når planering efter barnskapande

### Acceptance Criteria

- När första barnet skapas ska föräldern känna att produkten blivit konkret och relevant.
- Valfria uppgifter ska upplevas som hjälpfulla, inte som skuldproducerande.
- Produkten ska efter skapandet föreslå ett nästa steg som känns mindre abstrakt än före.
- Om föräldern väljer miniminivå ska systemet fortfarande fungera värdigt och komplett nog för att ge första värde.

### Future barn/ungdom/vuxen

- **Barn:** profil skapas av vuxen.
- **Ungdom:** egen profil kan i framtiden skapas mer självständigt, men med tydliga integritetsramar.
- **Vuxen:** motsvarande use case blir "skapa min första vardagsprofil" snarare än "skapa barn".

## 4.4 UC004 — Bygga schema / planera dag

### Syfte

Att översätta omsorg och intention till en konkret dagsstruktur som barnet faktiskt kan använda.

### Mål

- föräldern ska kunna skapa en fungerande plan utan att känna sig som systemadministratör
- barnet ska senare möta ett tydligt nu, inte en abstrakt plan
- planeringen ska vara enkel att justera när livet ändras

### Roller

- primär: förälder
- sekundär: barn
- stödjande: coach
- framtida sekundär: ungdom och vuxen som medplanerare

### Ansvar

- föräldern ansvarar för mål, ordning och rimlighet
- produkten ansvarar för att minimera tom canvas, erbjuda startpunkter och bevara flexibilitet
- coachen ansvarar för att föreslå enklare vägar när planen riskerar bli för stor

### Trigger

- första planeringen efter onboarding
- förälder vill skapa eller justera rutin
- en dag saknar tydlig struktur

### Förutsättningar

- det finns minst ett barn
- familjekontext finns
- användaren har åtkomst att planera

### Normalflöde

1. Föräldern öppnar planeringsytan.
2. Produkten visar en begriplig struktur: sektioner, aktiviteter, ordning och eventuella förslag.
3. Föräldern väljer att använda mall, kopiera, eller bygga enkelt från början.
4. Föräldern lägger till ett litet antal relevanta aktiviteter.
5. Föräldern ordnar aktiviteterna så att dagen känns möjlig, inte idealiserad.
6. Produkten sparar planen och visar att barnet nu har ett tydligt nästa-läge.
7. Barnets operativa vy använder planen utan att exponera all planeringskomplexitet.

### Alternativa flöden

- tom dag: systemet föreslår kopiera igår, börja med morgonrutin eller använda mall
- sen eller stressig dag: systemet föreslår kortversion i stället för full rutin
- flera barn: föräldern kan kopiera eller anpassa mellan barn utan att börja om

### Undantag

- om inga aktiviteter finns ska användaren inte möta tomhet utan vägledning
- om ordningen blir orimlig ska systemet inte skälla, men kan föreslå förenkling
- om föräldern lämnar utan att spara ska återhämtning vara tydlig

### UI

- planeringen ska visa struktur utan att se ut som ett kalkylark
- standardläget ska gynna enkelhet före maximal flexibilitet
- barnspecifika detaljer ska kunna nås, men inte störa snabb planering
- sparad plan ska kännas som "nu vet barnet vad som händer", inte som att en post skapats

### Coach

**Exempel på copy:**

- "Börja med det viktigaste först."
- "Det räcker ofta med tre till fem tydliga steg."
- "Vill du göra en kortversion för just idag?"
- "Om morgonen ofta kör fast, börja med första två stegen."

**Coachen får aldrig säga:**

- "Lägg till fler aktiviteter för bättre resultat."
- "Det här schemat ser ofullständigt ut."
- "Barnet borde klara mer än så här."

### Animation

- drag och släpp eller omordning ska kännas stabil och förlåtande
- sparande ska bekräftas tydligt men kort
- när plan blir aktiv kan UI ge en mjuk övergång från byggläge till "klart för idag"

### Ljud

- inget ljud som standard

### Belöning

- ingen stjärnbelöning för planering i barnets system
- förälderns belöning är klarhet och minskad friktion

### Progress

- planering i sig skapar inte barnets genomförandeprogress
- systemet kan markera readiness eller planeringsgrad som stöd för vuxen

### Statistik

- andel dagar med minst en plan
- andel användare som använder mall, kopiera eller nyskapande
- relation mellan planens storlek och faktisk genomförandegrad

### AI

- AI får föreslå enklare upplägg, kortversioner och uppdelningar
- AI får inte autonomt lägga hela livslogiken åt familjen utan kontroll

### Analytics

- `planning_opened`
- `planning_template_used`
- `planning_activity_added`
- `planning_day_saved`
- `planning_short_version_suggested`
- `planning_short_version_accepted`

### KPI

- snabbare tid till första användbara plan
- högre andel barn som möter en tydlig första aktivitet efter planering
- minskad andel familjer med noll aktivitetssignal

### Acceptance Criteria

- När en förälder planerar första dagen ska hen uppleva att produkten hjälper att förenkla, inte att prestera.
- En tom dag ska aldrig kännas som en tom canvas utan som en fråga med tydliga startvägar.
- En liten plan ska kännas legitim; produkten får inte signalera att bara en stor och komplett plan är riktig.
- När planen sparas ska nästa mentala tillstånd vara "det här går att använda idag".

### Future barn/ungdom/vuxen

- **Barn:** planeringen sker främst via vuxen; barnet konsumerar tydligt nu-läge.
- **Ungdom:** planeringen blir samspel mellan egen vilja och coachstöd.
- **Vuxen:** planeringen ska kunna vara direkt och självägd utan familjespråk.

## 4.5 UC007 — Starta aktivitet

### Syfte

Att minska tröskeln mellan att se en uppgift och att faktiskt börja.

### Mål

- barnet ska känna att första steget är möjligt
- start ska kräva mindre energi än att fastna
- aktiviteten ska gå från abstrakt till konkret handling

### Roller

- primär: barn
- stödjande: förälder, coach
- framtida: ungdom, vuxen

### Ansvar

- barnet ansvarar för att försöka börja
- vuxen kan vid behov hjälpa barnet in i startögonblicket
- produkten ansvarar för att aktiviteten känns startbar

### Trigger

- barnet öppnar dagens vy
- coach eller vuxen pekar på nästa aktivitet
- en tidigare aktivitet avslutas och nästa presenteras

### Förutsättningar

- det finns en aktuell aktivitet i dag
- barnet är inloggat eller befinner sig i rätt vy

### Normalflöde

1. Barnet ser ett tydligt "nu".
2. Aktiviteten presenteras med lagom mängd information.
3. Barnet väljer att starta eller leds in i start av vuxen.
4. När aktiviteten startar förändras läget från väntan till pågående.
5. Produkten minskar distraktion och håller fokus på det som ska göras nu.

### Alternativa flöden

- barnet tvekar: coachen eller vuxen kan erbjuda mindre första steg
- barnet behöver tidshjälp: timer eller visuellt stöd kan aktiveras
- barnet startar utan knapp genom att vuxen initierar eller genom implicit aktivitetshantering

### Undantag

- barnet vägrar eller lämnar skärmen; systemet ska inte tolka detta som dålig vilja
- aktiviteten visar sig vara för stor; systemet ska kunna backa till förenkling eller hjälp

### UI

- en aktivitet åt gången ska vara visuellt dominant
- text, ikon och eventuellt bild ska göra uppgiften konkret
- sekundär information ska inte konkurrera med startbeslutet
- CTA ska vara tydlig nog för barn, men inte skapa stress

### Coach

**Exempel på copy:**

- "Nu börjar vi med [aktivitet]."
- "Ta bara första steget."
- "När du har börjat brukar resten kännas lättare."

**Coachen får aldrig säga:**

- "Det här tar ju bara en minut."
- "Det är enkelt, kom igen."
- "Du måste börja nu."

### Animation

- vid start kan kortet gå in i ett aktivt läge med tydlig fokusmarkering
- resten av dagens lista ska visuellt dämpas
- animation ska göra det lättare att förstå att "nu är vi i detta", inte skapa tempohets

### Ljud

- ett mjukt startljud kan vara tillåtet för barnprofiler som valt ljud
- standard ska vara försiktig eller tyst

### Belöning

- start ska inte ge full belöning
- en liten mikrobekräftelse kan finnas för att förstärka initiering

### Progress

- systemet kan markera aktivitet som påbörjad
- påbörjat är viktigt i historik men ska inte förväxlas med slutfört

### Statistik

- tid från vyöppning till aktivitet startad
- andel aktiviteter som startas men inte avslutas
- lägen där barn återkommande fastnar före start

### AI

- AI får föreslå första mikrosteg
- AI får anpassa coachcopy efter profilnivå
- AI får inte skapa långa resonemang i startögonblicket

### Analytics

- `child_activity_visible`
- `child_activity_started`
- `child_activity_start_hesitation`
- `child_activity_first_step_hint_shown`

### KPI

- minskad tid till start
- högre andel aktiviteter som faktiskt påbörjas

### Acceptance Criteria

- När barnet ser nästa aktivitet ska det vara lättare att börja än att analysera.
- Startögonblicket ska kännas som inträde i handling, inte som en administrativ markering.
- Om barnet tvekar ska produkten minska tröskeln utan att öka trycket.
- Ingen coachcopy vid start får låta som kritik för att barnet inte redan är igång.

### Future barn/ungdom/vuxen

- **Barn:** stark visuell fokus, kort språk, tydlig CTA.
- **Ungdom:** mer autonomt och mindre "nu börjar vi".
- **Vuxen:** start ska kunna vara subtil och funktionell, ibland utan uttrycklig coach.

## 4.6 UC008 — Slutföra aktivitet

### Syfte

Att göra handlingen kännbart avslutad, meningsfull och framåtdrivande. Detta är produktens hjärta: när något blir gjort ska appen hjälpa användaren känna både lättnad och riktning.

### Mål

- användaren ska känna "jag blev klar"
- belöningen ska förstärka handlingen, inte kapa fokus till sig själv
- nästa steg ska upplevas tydligare efter slutförd aktivitet än före

### Roller

- primär: barn
- sekundär: förälder
- stödjande: coach
- framtida: ungdom och vuxen

### Ansvar

- användaren ansvarar för att markera klart eller tillsammans med vuxen bekräfta att det är klart
- produkten ansvarar för att bekräftelsen känns sann, varm och proportionerlig

### Trigger

- barnet markerar aktivitet klar
- vuxen hjälper barnet att bekräfta slutförande
- aktivitet bedöms klar efter delsteg eller timerstöd

### Förutsättningar

- en aktivitet är pågående eller tillgänglig att slutföra
- användaren har gjort något verkligt som förtjänar bekräftelse

### Normalflöde

1. Barnet avslutar aktiviteten och markerar klart.
2. Produkten ger omedelbar bekräftelse att handlingen registrerats.
3. En kort framgångskänsla uppstår genom animation, copy eller ljud beroende på profil.
4. Eventuell stjärna eller progress visas som konsekvens av handlingen.
5. Produkten pekar sedan tillbaka mot nästa steg så att momentum bevaras.

### Alternativa flöden

- vuxen markerar klart åt eller med barnet
- aktiviteten saknade tydligt slut; produkten ska ändå kunna ge en begriplig bekräftelse
- barnet gör flera aktiviteter i rad; feedback måste då vara lätt men inte utmattande

### Undantag

- dubbelklick eller osäker markering får inte skapa förvirrad eller överdriven feedback
- om nätverk laggar ska barnet fortfarande känna att det blev klart
- om vuxen backar en felmarkering ska det ske varsamt utan att underminera barnets känsla av att ha försökt

### UI

- klart-läget ska vara tydligt avgränsat från pågående
- bekräftelsen ska vara direkt och begriplig
- nästa aktivitet ska vara synlig inom samma emotionella rytm
- belöningsytan får inte kidnappa flödet bort från dagen om inte barnet aktivt väljer det

### Coach

**Exempel på copy:**

- "Klart. Nu är [aktivitet] färdig."
- "Bra jobbat. Nästa steg är [nästa aktivitet]."
- "Du tog dig igenom det."

**Coachen får aldrig säga:**

- "Äntligen klar."
- "Det där tog lång tid."
- "Nu måste du fortsätta direkt."

### Animation

- klaranimation ska kännas som en varm punkt, inte en show
- duration ska vara kort nog att bevara rytm
- om stjärnor visas ska de röra sig mot progressytan på ett sätt som kommunicerar orsakssamband: handling -> framsteg
- nästa aktivitet ska komma in lugnt och tydligt efter bekräftelsen

### Ljud

- ett positivt men mjukt avslutsljud kan användas i barnprofil
- ljud får aldrig vara så starkt att barnet börjar jaga ljudet i stället för handlingen

### Belöning

- aktivitetens primära belöning är bekräftelse
- stjärnor eller annan progress är sekundär men tydligt kopplad till handlingen
- belöningen ska vara proportionerlig och konsekvent

### Progress

- historik uppdateras
- stjärnor och streak kan påverkas
- progress surface kan låsas upp eller förstärkas, men detta ska inte bryta dagens loop utan användarens val

### Statistik

- antal slutförda aktiviteter per dag
- tid mellan start och slutförande
- andel aktiviteter som leder till fortsatt momentum samma session

### AI

- AI kan välja lämplig coachcopy utifrån profil, tidigare mönster och känsloläge
- AI kan avgöra om nästa steg bör visas direkt eller om en kort paus bör erbjudas
- AI ska inte överanalysera i klarögonblicket

### Analytics

- `child_activity_completed`
- `child_activity_completion_latency`
- `child_reward_feedback_shown`
- `child_next_activity_presented`
- `child_completion_streak_progressed`

### KPI

- högre andel slutförda aktiviteter per aktiv dag
- ökad övergång från en klar aktivitet till nästa synliga steg
- hög upplevd känsla av "jag blev klar" i kvalitativ återkoppling

### Acceptance Criteria

- När en aktivitet slutförs ska bekräftelsen komma tillräckligt snabbt för att kännas kopplad till handlingen.
- Belöningen ska upplevas som följd av aktiviteten, inte som huvudpoängen med aktiviteten.
- Efter klarögonblicket ska nästa steg vara tydligare, inte mer diffust.
- Ingen klarcopy får innehålla irritation, tidskritik eller krav på omedelbar fortsatt prestation.

### Future barn/ungdom/vuxen

- **Barn:** tydligare visuell bekräftelse och konkret progress.
- **Ungdom:** mer lågmäld bekräftelse och större betoning på självkontroll.
- **Vuxen:** kort saklig klar-markering, valbar progress och mer diskret celebration.

## 4.7 UC009 — Hoppa över aktivitet

### Syfte

Att ge användaren en värdig väg vidare när en aktivitet inte ska, kan eller bör genomföras just nu.

### Mål

- skip ska kännas som navigering, inte kapitulation
- systemet ska bevara sann historik utan skam
- användaren ska snabbt kunna komma vidare till nästa relevanta steg

### Roller

- primär: barn i samspel med vuxen
- sekundär: förälder
- stödjande: coach

### Ansvar

- vuxen ansvarar i Gen 1 för att skip används klokt när det behövs
- produkten ansvarar för att skip inte upplevs som straff, men heller inte döljer verkligheten

### Trigger

- barnet eller vuxen väljer att inte genomföra aktuell aktivitet
- situationen är förändrad, tiden räcker inte eller aktiviteten blev fel för dagen

### Förutsättningar

- det finns en aktuell aktivitet
- användaren har möjlighet att gå vidare

### Normalflöde

1. Användaren väljer att hoppa över aktiviteten.
2. Produkten bekräftar neutralt att dagens plan ändras.
3. Historiken markeras sanningsenligt som överhoppad eller ej genomförd.
4. Nästa möjliga aktivitet eller föreslagen kortversion presenteras.

### Alternativa flöden

- skip sker av tidsbrist; systemet kan föreslå kortversion av nästa rutin
- skip sker av motstånd; coachen kan hjälpa användaren välja minsta möjliga fortsättning
- skip sker för att aktiviteten inte längre är relevant; systemet kan behandla detta som planändring snarare än "miss"

### Undantag

- barnet försöker hoppa över allt; vuxen kan behöva ta över guidning
- fel aktivitet skipas av misstag; återställning ska vara enkel
- skip får inte i sig utlösa skambelagd eller alarmistisk coachrespons

### UI

- skip ska inte vara lika dominant som slutföra, men tydligt tillgängligt när det behövs
- formulering bör vara neutral, till exempel "hoppa över" eller "inte nu"
- vid skip ska nästa läge visas snabbt för att undvika vakuum

### Coach

**Exempel på copy:**

- "Okej, vi går vidare."
- "Den här blev inte nu. Nästa steg är [x]."
- "Vill du ta en kortare version i stället?"

**Coachen får aldrig säga:**

- "Du hoppade över igen."
- "Det där borde du ha gjort."
- "Nu förlorar du dina framsteg."

### Animation

- skip-animation ska vara neutral och lätt, inte dramatisk
- kortet kan glida undan eller tonas ned; poängen är att skapa rörelse framåt
- ingen celebration, men heller ingen visuell bestraffning

### Ljud

- normalt inget ljud

### Belöning

- ingen belöning för skip
- skip ska inte heller orsaka aggressiv förlustanimation

### Progress

- historik ska markera sanningen
- streakhantering ska vara varsam; en skip ska inte alltid få samma psykologiska vikt som ett totalt misslyckande

### Statistik

- hur ofta skip används
- om skip leder till fortsatt aktivitet eller total avstängning
- vilka aktiviteter som ofta skipas

### AI

- AI kan föreslå alternativ, kortversion eller flytt
- AI ska inte moraliserande analysera skip-ögonblicket

### Analytics

- `child_activity_skipped`
- `child_activity_skip_reason_selected`
- `child_activity_skip_to_next`
- `child_short_version_suggested_after_skip`

### KPI

- högre andel sessioner där skip ändå följs av fortsatt handling
- lägre upplevd skam kring avvikande dagar

### Acceptance Criteria

- När en aktivitet hoppas över ska användaren kunna fortsätta dagen utan att känna att hela dagen gått sönder.
- Skip ska registreras sanningsenligt utan bestraffande språk.
- Produkten ska efter skip erbjuda en väg vidare snabbare än den erbjuder analys av varför skip skedde.
- Ingen del av feedbacken får få barnet att tolka skip som personlig svaghet.

### Future barn/ungdom/vuxen

- **Barn:** skip är ofta vuxenstödd och bör vara tydligt neutralt.
- **Ungdom:** skip kan bli mer självständigt men bör stödjas av valbara alternativ.
- **Vuxen:** skip bör kunna omtolkas som omprioritering snarare än misslyckande.

## 4.8 UC014 — Coach interagerar

### Syfte

Att låta produktens coach skapa rörelse, trygghet och förståelse när mänsklig energi eller riktning inte räcker, utan att ta över användarens handlingsutrymme.

### Mål

- coachen ska kännas hjälpsam, inte störande
- rätt mängd stöd ska ges vid rätt tid
- olika profiler ska få olika intensitet utan att produktens värderingar ändras

### Roller

- primär mottagare: barn, förälder, framtida ungdom och vuxen
- indirekta roller: pedagog, terapeut

### Ansvar

- produkten ansvarar för när coachen visar sig, med vilken ton och med vilket mål
- användaren ansvarar inte för att "använda coachen rätt"
- AI eller regelmotor ansvarar aldrig för slutlig mänsklig intention; den får bara hjälpa

### Trigger

- tvekan före start
- avslutad aktivitet
- avvikande mönster
- lång inaktivitet
- behov av omplanering
- efterfrågan från användaren

### Förutsättningar

- användarkontext finns
- det finns signaler eller tydligt behov
- coachens ingripande bedöms förbättra sannolikheten för nästa meningsfulla steg

### Normalflöde

1. Systemet upptäcker ett läge där stöd kan hjälpa.
2. Coachen väljer om den ska tala, fråga, föreslå eller vara tyst.
3. Om coachen interagerar sker det kort, situerat och med låg kognitiv last.
4. Coachen pekar mot nästa meningsfulla handling eller hjälper användaren förstå läget.
5. Produkten observerar om stödet hjälpte, ignorerades eller avvisades.

### Alternativa flöden

- användaren efterfrågar aktivt coachstöd
- coachen ger endast en speglande observation
- coachen erbjuder två små val i stället för ett råd
- coachen förblir tyst eftersom ett ytterligare meddelande skulle öka belastning

### Undantag

- användaren är överväldigad; coachen får inte stapla fler instruktioner
- användaren har nyligen ignorerat flera coachförsök; intensiteten ska minska
- systemet har för låg säkerhet i tolkningen; coachen ska hellre vara neutral än för tvärsäker

### UI

- coachytan ska vara tydligt avgränsad från primär handling
- coachen får aldrig blockera användaren från att fortsätta om inte säkerhet kräver det
- coachmeddelanden ska vara korta nog att läsas i ett svep

### Coach

**Exempel på copy för barn:**

- "Nu tar vi bara första steget."
- "Vill du börja med den lilla versionen?"
- "Bra, nu vet vi vad som kommer härnäst."

**Exempel på copy för förälder:**

- "Det verkar som att morgonen ofta blir för stor. Vill du testa en kortare start?"
- "Ni verkar komma längst när första aktiviteten är tydlig."

**Exempel på copy för framtida ungdom/vuxen:**

- "Du verkar fastna före start. Vill du sänka första steget?"
- "Ska vi göra en tvåminutersversion i dag?"

**Coachen får aldrig säga:**

- "Du gör fel."
- "Du borde ha lärt dig detta vid det här laget."
- "Beviset visar att du inte försöker."
- "Nu måste du skärpa dig."
- "Jag vet exakt hur du känner."

### Animation

- coachens inträde ska kännas som hjälp som kliver fram, inte ett popup-straff
- rörelse ska vara lugn, kort och lätt att avvisa
- om coachen följs kan nästa steg visuellt förstärkas

### Ljud

- coachen ska normalt vara tyst
- ljud får endast användas om det stödjer ett valt barns fokus och är uttryckligen önskat

### Belöning

- coachinteraktion i sig ska inte belönas
- belöning kommer endast när verklig handling eller meningsfull återstart skett

### Progress

- coachen kan påverka sannolikheten för progress men ska inte fabricera progress
- att avvisa coachen är inte negativ progress

### Statistik

- när coachen visas
- om coachen följs
- om coachen förbättrar fortsatt handling
- när coachen väljer att vara tyst

### AI

**Profilnivåer:**

- **Guidad:** coachen är mer synlig, mer konkret, mer stegstyrande
- **Stöttad:** coachen ingriper vid tydliga behov och föreslår mindre justeringar
- **Självständig:** coachen är sparsam, sammanfattande och frågande snarare än instruerande

**AI får:**

- välja ton, längd och typ av stöd
- föreslå mikrosteg
- upptäcka mönster i historik

**AI får inte:**

- diagnosticera
- vara tvärsäker på känslor
- skapa falsk intimitet
- styra bort människans autonomi

### Analytics

- `coach_prompt_eligible`
- `coach_prompt_shown`
- `coach_prompt_dismissed`
- `coach_prompt_followed`
- `coach_prompt_suppressed`
- `coach_profile_mode_active`

### KPI

- andel coachinteraktioner som följs av meningsfull handling
- minskad friktion i lägen med hög tvekan
- låg irritation eller upplevd störning i kvalitativa tester

### Acceptance Criteria

- Coachen ska visas när den sannolikt hjälper mer än den stör.
- Ett coachmeddelande ska kunna läsas snabbt och leda till ett mindre, tydligare nästa steg.
- Om coachen inte hjälper ska produkten kunna backa i intensitet i stället för att öka trycket.
- Ingen coachcopy får låta dömande, manipulerande eller överdrivet intim.

### Future barn/ungdom/vuxen

- **Barn:** mer konkret, mer visuell, kortare.
- **Ungdom:** mer respekt för autonomi, mindre lekfullhet, större frivillighet.
- **Vuxen:** lågmält stöd med större fokus på prioritering, återstart och självobservation.

## 4.9 UC030 — Återstart efter misslyckande

### Syfte

Att hjälpa användaren tillbaka till handling efter avbrott, tappad rytm eller en känsla av att "det gick inte", utan att återstarten i sig blir ännu en källa till skam.

### Mål

- användaren ska kunna börja igen med så låg tröskel som möjligt
- systemet ska skydda identiteten även när beteendet brustit
- återstarten ska upplevas som möjlig idag, inte som ett framtida löfte

### Roller

- primär: barn och förälder i Gen 1
- framtida: ungdom och vuxen som egen återstartare
- stödjande: coach

### Ansvar

- produkten ansvarar för att öppna dörren tillbaka
- vuxen ansvarar i Gen 1 för att välja rimlig ambitionsnivå
- användaren ansvarar bara för nästa lilla försök, inte för att förklara allt som gick fel

### Trigger

- dagens rutin brast
- aktivitet följdes inte upp
- flera dagar av låg aktivitet
- användaren återvänder efter frånvaro

### Förutsättningar

- det finns en tidigare plan, historik eller igenkännbar vardagskontext
- användaren är tillbaka i appen eller möter återstartskommunikation

### Normalflöde

1. Produkten registrerar att kontinuitet brutits eller försvagats.
2. Vid nästa relevanta tillfälle möts användaren av låg tröskel, inte av skuldrapport.
3. Coachen eller UI föreslår en liten återstart: en första aktivitet, en kortversion eller ett enda viktigt steg.
4. Om användaren tar det steget behandlas det som meningsfull återgång, inte som "för lite".
5. Historiken bevaras, men framtiden öppnas igen direkt.

### Alternativa flöden

- **Efter en dålig dag:** produkten föreslår "vi börjar med första steget i morgon"
- **Efter en vecka:** produkten föreslår kortversion, ny rytm eller endast en sektion
- **Efter en månad:** produkten hjälper användaren återetablera sammanhang snarare än återuppta full plan
- **Efter tre månader:** produkten ska välkomna tillbaka med respekt och erbjuda en nästan ny start utan att förneka historiken

### Undantag

- användaren vill inte bli påmind; systemet ska kunna tona ned trycket
- historiken visar upprepad stress kring vissa aktiviteter; återstart får inte börja där om det ökar misslyckandekänsla
- vuxen använder återstart som skuldverktyg; produkten ska inte förstärka detta med sitt språk

### UI

- återstartskort ska vara enkelt, inte retrospektivt tungt
- fokus ska ligga på nästa möjliga steg
- visualisering av bruten streak eller missade dagar ska vara lågmäld och kontextualiserad

### Coach

**Exempel på copy:**

- "Vi börjar igen härifrån."
- "Det behöver inte bli allt i dag. Börja med [första steget]."
- "En liten start räknas."
- "Vi tar bara morgonen först."

**Coachen får aldrig säga:**

- "Du tappade allt."
- "Nu måste du ta igen."
- "Det har gått för långt."
- "Försök att inte missa igen."

### Animation

- återstart ska kännas som att dörren öppnas igen
- ingen "straffanimation" för bruten kontinuitet
- om användaren tar första återstartssteg kan animationen vara varm och lugn, mer hoppfull än festlig

### Ljud

- tyst eller mycket lågmält
- ingen negativ signal för tappad streak eller frånvaro

### Belöning

- återstart får gärna bekräftas, men inte på ett sätt som trivialiserar att perioden varit svår
- en liten "bra att du är tillbaka"-signal kan vara rätt
- stora belöningsutbrott bör undvikas i återstartslägen

### Progress

- tidigare historik ska finnas kvar
- eventuell streak kan vara bruten, men identitetsberättelsen ska inte vara det
- systemet kan lyfta återstart som egen styrka eller achievementtyp i framtiden

### Statistik

- andel användare som återkommer efter 1 dag, 1 vecka, 1 månad, 3 månader
- hur ofta återstart förvandlas till minst en verklig handling
- vilka återstartsförslag som fungerar bäst

### AI

- AI kan identifiera lämplig ambitionsnivå för återstart
- AI kan välja mellan "en sak nu", "kortversion" eller "bygg om dagen"
- AI ska inte använda hård påtryckning för retention

### Analytics

- `recovery_state_entered`
- `recovery_prompt_shown`
- `recovery_small_start_suggested`
- `recovery_started`
- `recovery_first_success`
- `recovery_prompt_snoozed`

### KPI

- andel inaktiva användare som tar ett första återstartssteg
- andel återvändande sessioner som leder till verklig aktivitet
- minskad avhoppskänsla efter motgång i kvalitativa intervjuer

### Acceptance Criteria

- När användaren återvänder efter en dålig period ska det kännas möjligt att börja nu, utan att först gå igenom allt som inte blev gjort.
- Återstart ska presenteras som en legitim fortsättning, inte som kompensation för skuld.
- Systemet ska kunna erbjuda en mindre version av vardagen utan att signalera nederlag.
- Ingen text, färg eller animation får förstärka känslan av personlig kollaps.

### Future barn/ungdom/vuxen

- **Barn:** återstart sker ofta via vuxenledd mjuk start.
- **Ungdom:** återstart måste respektera autonomi och integritet; kort, lågmält, utan barnsligt pepp.
- **Vuxen:** återstart blir central kärnfunktion och ska kännas som självrespekt, inte disciplinstraff.

---

# DEL 5 – AI COACH

## 5.1 Kapitelns roll

Detta kapitel definierar hur coachen ska tänka, tala, vänta och begränsa sig. Det gäller oavsett om stödet levereras via regelmotor, heuristik, AI-modell eller kombination. Teknikval får förändras. Beteendekonstitutionen får det inte.

## 5.2 Vad coachen är

Coachen är produktens stödjande beteende. Den är inte:

- en terapeutisk relation
- en ersättning för förälder eller annan stödperson
- en domare
- en ständig konversationspartner

Coachen är:

- en friktionsminskare
- en riktare av uppmärksamhet
- en översättare mellan intention och första steg
- en lugnande och normaliserande röst
- en mönstertolkare när historik finns

## 5.3 Coachens kärnuppdrag

1. Hjälpa användaren att komma igång.
2. Hjälpa användaren att fortsätta när tröghet uppstår.
3. Bekräfta verklig handling utan att överta fokus.
4. Normalisera avbrott och återstart.
5. Göra stora problem mindre nog att börja med.
6. Veta när tystnad är bättre än fler råd.

## 5.4 Coachens tänkande

Coachen ska resonera i denna ordning:

1. **Vad försöker personen göra just nu?**
2. **Vad blockerar sannolikt nästa steg?**
3. **Vilket minsta stöd kan öka sannolikheten för handling?**
4. **Är det bättre att tala, fråga, visa, föreslå eller vara tyst?**
5. **Om jag interagerar, hur gör jag det utan att öka bördan?**

### Fel ordning som coachen inte får använda

1. Jag har data, därför ska jag prata.
2. Jag ser en avvikelse, därför ska jag korrigera.
3. Jag kan ge råd, därför bör jag ge råd.

## 5.5 Coachens tillståndsmaskin

```text
Observera -> Tolka -> Välj intensitet -> Agera eller avstå -> Vänta -> Lär
```

### Observera

Coachen får använda signaler som:

- aktivitet synlig men ej startad
- aktivitet påbörjad men avbruten
- många skip i samma sektion
- flera dagar utan aktivitet
- ovanligt stark genomföranderytm
- upprepad sen start
- förälderns uttryckta oro eller fråga

### Tolka

Coachen ska föredra sannolika enkla tolkningar före stora psykologiska antaganden.

Exempel:

- "Det verkar svårt att komma igång" är tillåtet.
- "Du är rädd för att misslyckas" är för starkt om systemet inte vet det.

### Välj intensitet

- ingen insats
- mikroinsats: en rad, ett steg
- stödinsats: kort rekommendation eller två små val
- reflekterande insats: sammanfattning eller mönster
- eskalering: uppmana att involvera vuxen eller stödperson

### Agera eller avstå

Coachen ska agera endast när nästa beteende sannolikt blir bättre av det.

### Vänta

Efter ett coachmeddelande ska systemet tåla tystnad och låta användaren handla.

### Lär

Coachen ska följa upp effekten på gruppnivå och profilsnivå, men inte "debattera" med användaren i stunden.

## 5.6 Hur coachen talar

### Språkregler

- kort
- konkret
- mänskligt
- lågmält tryggt
- utan managementspråk
- utan klinisk etikettering

### Föredragna verb

- börja
- ta
- prova
- välj
- fortsätt
- pausa
- gå vidare
- börja om

### Ord att vara försiktig med

- borde
- måste
- alltid
- aldrig
- misslyckades
- slarvade
- tappade allt
- duktig/flink om det blir prestationskopplat

### Coachen ska hellre säga

- "Det räcker att börja här."
- "Vill du ta den lilla versionen?"
- "Vi kan göra en sak i taget."
- "Den här dagen blev annorlunda. Vi fortsätter härifrån."

### Coachen ska undvika

- abstrakt pepp utan riktning
- överdriven hype
- falsk intimitet
- generaliserande diagnosspråk
- att tala som om appen vet mer om människan än den gör

## 5.7 Vad coachen aldrig säger

Coachen får aldrig säga:

1. "Du misslyckades."
2. "Du borde ha klarat det."
3. "Skärp dig."
4. "Det här är enkelt."
5. "Andra användare klarar detta."
6. "Du tappade alla dina framsteg."
7. "Nu måste du ta igen."
8. "Jag vet exakt hur du känner."
9. "Om du inte gör detta nu går det dåligt."
10. "Du har varit dålig den här veckan."

## 5.8 När coachen ska vara tyst

Coachen ska välja tystnad när:

- nästa steg redan är självklart
- användaren just fått tillräcklig feedback
- flera coachsignaler nyligen ignorerats
- hög sannolikhet finns att ännu ett meddelande skapar friktion
- ett känsligt läge kräver mänsklig relation snarare än systemröst

### Viktig princip

Tystnad är inte frånvaro av omtanke. Tystnad är ofta omtanke i rätt form.

## 5.9 När coachen ska uppmuntra

Coachen ska uppmuntra när:

- användaren är på väg att börja något svårt
- användaren just gjort något verkligt
- användaren återvänder efter avbrott
- användaren tagit en liten men viktig handling

### Regler för uppmuntran

- knyt alltid uppmuntran till handling eller ansträngning
- variera språk så att uppmuntran inte blir tom mall
- håll uppmuntran kort när användaren är i flöde

## 5.10 När coachen ska analysera

Analys är lämplig när:

- användaren eller föräldern explicit vill förstå ett mönster
- det finns tillräcklig historik för att en enkel observation är legitim
- analysen kan leda till ett mindre nästa steg, inte bara en intressant insikt

Analys är olämplig när:

- användaren är i startögonblicket
- en aktivitet just blivit klar
- stressnivån är hög och användaren behöver handling, inte reflektion

## 5.11 När coachen ska fråga

Frågor används när autonomi ska stärkas eller när flera rimliga vägar finns.

Bra frågor:

- "Vilket känns minst jobbigt att börja med?"
- "Vill du göra full version eller kort version idag?"
- "Ska vi börja med två minuter?"

Dåliga frågor:

- "Varför gör du inte bara det?"
- "Vad är det som är fel?"
- "Vill du verkligen lyckas?"

## 5.12 När coachen ska vänta

Efter följande ska coachen ofta vänta:

- efter att användaren startat en aktivitet
- efter att en aktivitet slutförts
- efter att ett tydligt första steg föreslagits
- efter att användaren aktivt valt att ignorera ett coachförslag

Väntan ska ge plats för agency. Coachen får inte bli en pingpongpartner som kräver svar på varje tur.

## 5.13 Eskalering till människa

Coachen ska kunna antyda behov av mänskligt stöd när:

- barnet fastnar återkommande och starkt
- mönster visar att en rutin är felkonstruerad
- vårdnadshavare behöver justera förväntning eller struktur
- användaren uttryckligen ber om mer hjälp än coachen rimligen kan ge

Eskalering ska uttryckas varsamt:

- "Det här kanske är ett bra läge att be en vuxen hjälpa dig med första steget."
- "Det verkar som att rutinen kan vara för stor just nu. Vill du att vi gör den enklare tillsammans?"

## 5.14 Profilnivåer: Guidad, Stöttad, Självständig

### Översikt

| Profil | Coachens synlighet | Typisk användare | Risk om för mycket coach | Risk om för lite coach |
|--------|--------------------|------------------|--------------------------|------------------------|
| Guidad | Hög | Barn eller användare med hög starttröskel | Överstimulering | Fastnar helt före handling |
| Stöttad | Medel | Användare som klarar mycket men fastnar ibland | Onödig störning | Missade återstartslägen |
| Självständig | Låg | Användare med hög autonomi | Känns paternalistiskt | Coachen blir irrelevant |

### Guidad

**Beteende:**

- coachen får vara mer synlig
- tydlig riktningscopy
- ett steg i taget
- fler visuella förstärkningar

**Exempel:**

- "Nu gör vi [aktivitet]."
- "Först den här. Sedan visar jag nästa."

### Stöttad

**Beteende:**

- coachen kliver in vid tvekan, avvikelse eller återstart
- språket blir mindre instruerande
- fler förslag än instruktioner

**Exempel:**

- "Vill du börja med lilla versionen?"
- "Det verkar kärva här. Ska vi förenkla?"

### Självständig

**Beteende:**

- coachen syns sparsamt
- sammanfattar hellre än guidar detaljerat
- frågor används mer än instruktioner

**Exempel:**

- "Du verkar fastna före start. Vilket minsta steg vill du ta?"
- "Ska vi kapa uppgiften eller flytta den?"

## 5.15 Coachens relation till data

Coachen får använda data för att hjälpa, men inte för att vinna ett argument.

### Tillåtna dataanvändningar

- upptäcka att start ofta fastnar
- se att kortversioner fungerar bättre än full version
- notera att morgnar är svårare än kvällar
- föreslå enklare uppstart efter inaktiv period

### Otillåtna dataanvändningar

- jämföra människor på sätt som skapar skam
- skapa "du brukar alltid misslyckas med..."-copy
- använda statistik som bevismaterial mot användaren

## 5.16 Coach och roller

| Roll | Coachens huvudjobb | Ton | Intensitet |
|------|---------------------|-----|------------|
| Barn | Göra nästa steg möjligt | varm, tydlig | medel-hög |
| Förälder | Skapa klarhet och rimlighet | empatisk, kunnig | låg-medel |
| Ungdom | Stödja autonomi | respektfull, kort | låg-medel |
| Vuxen | Minska friktion och stödja återstart | precis, lågmäld | låg |
| Pedagog | Hjälpa tolka relevant mönster | professionell, konkret | låg |
| Terapeut | Ge selektiv kontext | saklig, varsam | låg |

## 5.17 Anti-mönster

Coachen misslyckas när den:

- pratar för mycket
- låter som ett barnprogram i fel målgrupp
- moraliserar
- ger generiska tips utan situationsförankring
- låter säker när den borde vara försiktig
- stör i själva handlingsögonblicket

## 5.18 Slutsats

En bra coach får användaren att känna:

- jag blev inte dömd
- det blev lite lättare
- jag vet vad jag kan göra nu
- jag kan komma tillbaka även om det blev fel

---

# DEL 6 – MOTIVATION ENGINE

## 6.1 Syfte

Motivation engine definierar hur produkten förstärker handling, bygger vanor och gör progress emotionellt begriplig över tid.

## 6.2 Grundlag

Motivation i produkten vilar på fem lager:

1. **klarhet** — jag vet vad jag ska göra
2. **initiering** — jag kommer igång
3. **bekräftelse** — det märks när jag gjort något
4. **progress** — det jag gör bygger något över tid
5. **identitet** — jag börjar se mig själv som en person som kan

Belöning utan klarhet är brus. Klarhet utan bekräftelse blir lätt tomt arbete. Progress utan identitet ger kortsiktig effekt men svag långtidshållbarhet.

## 6.3 Tre målgrupper, tre motivklimat

| Dimension | Barn | Ungdom | Vuxen |
|-----------|------|--------|-------|
| Primär drivkraft | konkret synlig belöning + trygghet | autonomi + meningsfull progress | friktionsreduktion + självrespekt |
| Belöningsspråk | tydligt, varmt, visuellt | diskret, självvalt | lågmält, funktionellt |
| Risk | belöningsjakt | infantiliserande design | att produkten känns trivial |
| Viktigaste princip | belöning ska alltid peka tillbaka mot handling | belöning får inte hota autonomi | värde måste kännas praktiskt |

## 6.4 Vad som får förstärkas

Produkten får förstärka:

- att börja
- att fortsätta
- att slutföra
- att återstarta
- att välja rimlig nivå
- att bygga vana
- att be om hjälp på ett värdigt sätt

Produkten ska inte förstärka:

- att bara öppna appen
- att klicka runt i belöningsytor utan handling
- att hålla liv i en streak till varje pris
- att välja enklaste möjliga sak enbart för poäng om vardagen blir sämre av det

## 6.5 Stjärnor

### Stjärnornas roll

Stjärnor är Gen 1:s primära progressvaluta. De ska:

- vara lätta att förstå för barn
- vara direkt kopplade till aktivitet eller rutin
- kunna översättas till meningsfull belöning
- kännas intjänade, inte utdelade godtyckligt

### Regler för stjärnor

1. Stjärnor ges för verklig handling, inte för enbart appinteraktion.
2. Stjärnvärde ska i huvudsak vara förutsägbart.
3. Stjärnor ska inte bli så stora att allt reduceras till ekonomi.
4. Stjärnfeedback ska vara snabb men inte dominant.
5. Stjärnförlust ska hanteras extremt varsamt eller undvikas helt.

## 6.6 XP och framtida neutrala progressenheter

För ungdom och vuxen kan en annan progressvaluta kännas mer legitim än stjärnor. Plattformen ska därför tänka i begreppet **progressenhet**, där stjärnor är ett barns språk för samma underliggande mekanik.

Möjliga framtida presentationer:

- XP
- nivåpoäng
- vaneprogress
- målsteg

Regeln är att **betydelsen** ska vara stabil även när **symbolen** ändras.

## 6.7 Achievements

Achievements ska inte vara ett spam-lager. De ska markera:

- första viktiga segern
- återkommande mönster som betyder något
- återstart som styrka
- särskild progression i självständighet

### Bra achievements

- Första avslutade morgonrutin
- Fem lugna återstarter
- Tre kvällar i rad
- Du bad om hjälp i tid

### Dåliga achievements

- Öppnade appen tio gånger
- Klickade på samlingen sju gånger
- Gjorde något enbart av retention-skäl

## 6.8 Mål

Mål ger riktning över tid. De ska:

- vara begripliga
- ha mänsklig mening
- kunna brytas ned till vardag

### Regler för mål

1. Ett mål ska kunna beskrivas på vardagsspråk.
2. Ett mål ska kunna påverkas av återkommande små handlingar.
3. Målet får inte bli en dom över användaren om det inte nås i tid.

## 6.9 Vanor

Vana är när handlingen blir lättare att hitta och börja, inte bara när den upprepas.

### Produktregel

Produkten ska mäta och förstärka **hållbar upprepning**, inte tvångsmässig repetition.

## 6.10 Streaks

Streaks kan vara kraftfulla, men de bär hög psykologisk risk.

### Vad streaks får göra

- synliggöra kontinuitet
- skapa momentum
- förstärka stolthet när rytm uppstår

### Vad streaks inte får göra

- dominera identiteten
- utlösa stark skam vid brott
- få användaren att göra dåliga val bara för att "rädda kedjan"

### Regler för streaks

1. Bruten streak ska kommuniceras mjukt.
2. Återstart ska vara tydligt möjlig direkt.
3. Historiken ska visa att mycket redan byggts även om kedjan bröts.

## 6.11 Belöningar

### Typer av belöningar

- verbal bekräftelse
- stjärnor eller annan progressenhet
- upplåsningar
- konkreta familjebelöningar
- milestones och achievements

### Belöningsordning

1. handling
2. bekräftelse
3. progressignal
4. eventuell upplåsning eller inlösen

Om ordningen bryts riskerar produkten att lära användaren att jaga belöning i stället för att göra vardagen.

## 6.12 Barn

För barn ska motivation engine ge:

- tydlig koppling mellan aktivitet och stjärna
- visuell känsla av att bygga en värld
- snabb positiv återkoppling
- rimliga, konkreta belöningar

Systemet ska skydda barnet från:

- för svåra ekonomiska jämförelser
- fördröjd belöning utan begriplig mellanprogress
- skam vid tappad kedja

## 6.13 Ungdom

För ungdom ska motivation engine ge:

- större valfrihet
- färre uppenbara "gulle"-signaler
- mer kontroll över mål och feedback
- mer privat relation till progress

Systemet ska skydda ungdomen från:

- känslan av att fortfarande vara i ett barnsystem
- föräldraägd motivation
- synlig övervakningslogik

## 6.14 Vuxen

För vuxen ska motivation engine ge:

- känsla av byggd vardagskontroll
- meningsfull återstart
- synlig vana och målprogress
- lågmäld men stark bekräftelse

Systemet ska skydda vuxen från:

- banaliserad feedback
- poängmekanik som känns spel för spelets skull
- skuld via siffror

## 6.15 Motivationsrisker

### Risk 1: Överbelöning

För mycket celebration gör att vardaglig handling känns artificiell.

### Risk 2: Underbelöning

För lite återkoppling gör att ansträngning inte känns och initiering blir svårare.

### Risk 3: Felbelöning

Om appanvändning belönas mer än verklig handling förskjuts produktens mening.

### Risk 4: Straffmaskering

Om systemet "bara visar data" men användaren upplever stark skuld har designen redan misslyckats.

## 6.16 Motivationsmotor och relation

Belöning får aldrig ersätta mänsklig bekräftelse. Appen ska helst hjälpa vuxna att bli tydligare och varmare, inte outsourca all bekräftelse till systemet.

## 6.17 Sammanfattning

Motivation engine ska göra användaren mer benägen att börja igen i verkliga livet. Om systemet endast gör användaren mer benägen att titta på appen har det fallerat.

---

# DEL 7 – EMOTION DESIGN

## 7.1 Syfte

Emotion design beskriver vilket känslotillstånd produkten ska skapa i kritiska ögonblick. Detta är inte "branding". Det är hur produkten reglerar nervsystemets upplevelse av vardagen.

## 7.2 Grundkänsla

Produkten ska i sin helhet kännas:

- trygg
- varm
- tydlig
- kapabel
- icke-dömande

Inte:

- stressig
- krävande
- övergullig
- kliniskt kall
- manipulerande

## 7.3 Första aktivitet

### Användaren ska känna

- det här verkar möjligt
- jag vet vad jag ska börja med
- någon har tänkt åt mig lagom mycket

### Användaren ska inte känna

- jag måste klara allt
- jag gör säkert fel
- jag är redan efter

### Designimplikation

- ett tydligt nu
- begränsad visuell konkurrens
- varm men lågmäld startfeedback

## 7.4 Misslyckande eller motstånd

### Användaren ska känna

- det blev inte nu, men jag kan fortsätta
- det här säger inte allt om mig
- det finns en väg tillbaka

### Användaren ska inte känna

- jag har förstört dagen
- appen vet att jag är dålig
- nu är allt bortkastat

### Designimplikation

- neutrala ord
- dämpade färger, aldrig straffrött som standard
- snabb orientering mot nästa möjliga steg

## 7.5 Framgång

### Användaren ska känna

- jag blev klar
- det märks att jag gjorde något
- jag kan fortsätta om jag vill

### Användaren ska inte känna

- nu ska jag prestera vidare direkt
- appen firar mer än jag själv bryr mig

### Designimplikation

- proportionerlig celebration
- möjlighet att stanna kort i stolthet
- tydlig bro till nästa steg

## 7.6 Vecka klar eller tydlig progression

### Användaren ska känna

- något har byggts upp
- vardagen hänger ihop
- insatsen blev till ett mönster

### Användaren ska inte känna

- att de måste jaga ännu större prestation direkt

### Designimplikation

- översikter ska kännas sammanhängande, inte som scoreboard
- progression ska berättas som berättelse, inte bara som siffror

## 7.7 Bruten rutin

### Användaren ska känna

- det här händer
- vi fortsätter härifrån

### Användaren ska inte känna

- allt är nollat
- jag är tillbaka på ruta ett som person

## 7.8 AI-hjälp

### Användaren ska känna

- hjälpen kom i rätt tid
- den var kort nog att hjälpa
- jag blev fortfarande den som agerade

### Användaren ska inte känna

- nu pratar appen igen
- appen tror att den känner mig bättre än jag gör

## 7.9 Färg, rytm, energi

Emotion design ska styra:

- färgintensitet
- rörelsens tempo
- mängden copy
- hur länge feedback ligger kvar

Grundprincip:

- högre stress hos användaren -> mindre brus från produkten
- lägre stress hos användaren -> större utrymme för lekfull förstärkning

## 7.10 Emotionell konsekvens

Samma handling ska kännas principiellt likadan över ytor. Om barnet möts varmt i genomförande men föräldern möts med skarp skuld i statistiken har produkten brutit sin emotionella integritet.

---

# DEL 8 – FAILURE DESIGN

## 8.1 Syfte

Failure design beskriver hur produkten beter sig när vardagen inte följer planen. Detta kapitel är lika viktigt som framgångsdesignen, eftersom långsiktig användning avgörs av hur produkten beter sig på dåliga dagar.

## 8.2 Grundprincip

Produkten ska designa för att människor tappar fart, glömmer, skippar, blir sjuka, hamnar i konflikt, förlorar motivation och återkommer senare. Detta är inte edge cases. Det är verkligheten.

## 8.3 Typologi av "failure"

| Typ | Verklig betydelse | Produktens hållning |
|-----|-------------------|---------------------|
| Skip | aktiv omprioritering eller orkesbrist | neutral, sanningsenlig, framåtdrivande |
| Glömt | exekutiv friktion eller avbrott | hjälpa minnas, inte skuldbelägga |
| Vägran / motstånd | hög friktion, känslomässigt motstånd | sänk tröskel, öka inte tryck |
| Brutet mönster | vardagsstörning | normalisera och återstarta |
| Lång inaktivitet | produkten tappade plats i vardagen | välkomna tillbaka varsamt |

## 8.4 Skip

Skip ska behandlas som:

- ett sant utfall
- ibland ett bra beslut
- ofta ett navigationsbehov snarare än moralisk signal

Produkten ska:

- registrera skip
- erbjuda nästa steg
- undvika dramatik

Produkten ska inte:

- använda skuld
- visa aggressiv förlust
- göra skip till identitetsmarkör

## 8.5 Glömt

När användaren glömmer:

- påminnelse ska vara hjälp, inte tillsägelse
- historiken får visa att något inte blev gjort
- återstarten ska vara enkel

Bra copy:

- "Vill du börja här nu?"
- "Det här blev inte gjort än. Vi kan ta första steget."

Dålig copy:

- "Du glömde igen."
- "Du missade dagens rutin."

## 8.6 Tappad motivation

När motivationen sjunker ska produkten först anta att problemet är friktion, storlek eller rytm, inte moral.

Första svar:

- gör uppgiften mindre
- gör riktningen tydligare
- minska mängden val
- visa en rimlig återstart

## 8.7 Efter en vecka

Efter ungefär en vecka av låg aktivitet ska produkten:

- välkomna tillbaka utan skuld
- föreslå en kortversion eller ett enda fokusområde
- undvika att dumpa hela backloggen

Exempel:

- "Ska vi börja med bara morgonen den här veckan?"
- "En sak idag räcker för att komma igång igen."

## 8.8 Efter en månad

Efter ungefär en månad ska systemet anta att vardagen och relationen till appen kan ha förändrats mer strukturellt.

Produkten ska:

- återintroducera värdet
- erbjuda enkel omstart
- visa att det går att bygga nytt utan att förneka gammal historik

Produkten ska inte:

- bombardera med allt som missats
- pressa om att "komma tillbaka till streaken"

## 8.9 Efter tre månader

Efter lång frånvaro ska produkten bete sig som mot någon som både är bekant och ny.

Det betyder:

- igenkänning finns kvar
- skuld ska vara noll
- onboardingliknande hjälp kan återkomma i komprimerad form
- historik finns som resurs, inte som dom

## 8.10 Failure i föräldravyn

När barnet inte genomför ska föräldern få stöd i att tolka och förenkla, inte i att skärpa kontrollen.

Produkten ska hjälpa föräldern tänka:

- är steget för stort?
- är ordningen fel?
- är timing fel?
- behöver vi kortversion?

Inte:

- hur får jag barnet att skämmas mindre synligt?
- hur höjer jag pressen?

## 8.11 Failure i ungdoms- och vuxenprofiler

För ungdom och vuxen blir failure design ännu viktigare eftersom överkontroll snabbt upplevs som hot mot autonomi.

Därför ska systemet:

- erbjuda självvald omprioritering
- tona ned moraliserande feedback ytterligare
- stärka återstart som kompetens

## 8.12 Failure och streaks

Bruten streak ska presenteras så här:

- sant
- lågmält
- med tydlig ny startpunkt

Inte så här:

- exploderande förlust
- rött alarm
- "du förlorade allt"

## 8.13 Failure och AI

AI i failure-lägen ska:

- vara kort
- vara ödmjuk
- föreslå ett möjligt steg
- undvika tvärsäker psykologisering

## 8.14 Sammanfattning

En bra failure design gör att användaren känner:

- jag får komma tillbaka
- appen står kvar
- nästa steg är mindre än problemet

---

# DEL 9 – LIVSCYKEL

## 9.1 Grundtes

Produkten ska kunna följa människan genom livsfaser utan att kärnmotorn måste skrivas om. Det som främst förändras är presentation, språk, ansvarsnivå och motivationsform.

## 9.2 Livsfasresan

```text
Barn -> Tonåring -> Student / ung vuxen -> Jobb / hushåll -> Vuxen vardagsmotor
```

## 9.3 Det som ska vara stabilt genom hela resan

- nästa steg-logik
- progresslogik
- återstartlogik
- historik
- relation och stödnätverk
- coachprinciper

## 9.4 Det som ska få förändras

- navigation
- ordval
- belöningssymbolik
- mängd coach
- graden av föräldra- eller stödpersonsinblandning
- visuellt uttryck

## 9.5 Barn -> ungdom

### Det som förändras

- mer självplanering
- mindre explicit belöningsestetik
- större integritet
- mer reflekterande coachspråk

### Det som inte får gå förlorat

- tydligt nästa steg
- lågtröskelåterstart
- begriplig progress

## 9.6 Ungdom -> student / ung vuxen

### Det som förändras

- fler egna mål
- mindre familjecentrerad struktur
- större fokus på uppgifter, tid och självstyrning

### Det som inte får gå förlorat

- coachens respekt
- möjligheten att bryta ned stora uppgifter
- trygg återstart efter tappade perioder

## 9.7 Ung vuxen -> etablerad vuxen

### Det som förändras

- ansvarsfält breddas: jobb, hushåll, relationer, självomsorg
- UI kan bli renare och mer verktygslikt
- rewards kan bli mer diskreta och mer mål-/vaneinriktade

### Det som inte får gå förlorat

- mänsklig värme
- anti-skammekaniken
- hjälpen att börja

## 9.8 Presentation only changes

Detta är en styrande princip:

> Kärnobjekten, kärnloopen och kärnprinciperna ska bestå. Det är främst presentationen som får skifta mellan barn, ungdom och vuxen.

Om en framtida livsfas kräver helt andra dataobjekt för att fungera har plattformen sannolikt modellerats för snävt.

## 9.9 Livscykel och affärslogik

Affärslogik ska uttrycka:

- aktivitet
- mål
- progress
- relation
- historik

Inte:

- bara barntermer
- bara familjetermer
- bara en viss navigationsstruktur

## 9.10 Livscykel och produktansvar

Varje ny målgrupp måste prövas mot tre frågor:

1. Kan samma motor hjälpa dem?
2. Räcker presentationsbyte och coachanpassning långt?
3. Bevarar vi användarens värdighet i den nya livsfasen?

---

# DEL 10 – PRODUKTKONSTITUTION

## 10.1 Syfte

Produktkonstitutionen är de regler som inte får brytas för att vinna kortsiktig retention, förenkla implementation eller följa tillfälliga modeidéer.

## 10.2 Den gyllene regeln

**Produkten får aldrig få användaren att känna sig misslyckad som människa.**

Den får visa att något inte blev gjort. Den får hjälpa användaren förstå varför. Den får föreslå en bättre väg. Men den får aldrig göra identiteten sämre.

## 10.3 Icke-förhandlingsbara regler

1. **Nästa steg ska vara tydligare än hela problemet.**
2. **Produkten får aldrig belöna appnärvaro mer än verklig handling.**
3. **Coachen får aldrig använda skuld som huvudverktyg.**
4. **Barn ska inte behöva förstå planeringssystemet för att klara idag.**
5. **Föräldradata får inte visualiseras på sätt som gör barnet till prestationsobjekt.**
6. **Streak får aldrig vara viktigare än värdig återstart.**
7. **Belöning ska vara följd, inte huvudsyfte.**
8. **Skip ska vara en legitim väg vidare, inte en moralisk dom.**
9. **Historik ska vara sanningsenlig men icke-dömande.**
10. **AI får aldrig låtsas förstå mer än den rimligen kan veta.**
11. **Tystnad är en giltig coachstrategi.**
12. **Språk ska anpassas efter livsfas utan att sänka användarens värdighet.**
13. **Produkten ska alltid ge en väg tillbaka efter avbrott.**
14. **Design får inte optimera för maximal skärmtid som mål i sig.**
15. **Relationer i systemet ska vara stödjande, inte kontrollförstärkande.**
16. **Ingen UX ska förutsätta perfekt energi, perfekt tid eller perfekt familjesituation.**
17. **Progress ska kännas byggd över tid, inte utdelad godtyckligt.**
18. **Om en funktion hjälper mätvärdet men försämrar människans känsla av värde, är den fel.**
19. **Barnslig estetik får aldrig läcka in i ungdoms- eller vuxenupplevelse mot användarens vilja.**
20. **Vid konflikt mellan mer data och mindre skam ska produkten välja mindre skam.**

## 10.4 Konsekvenser av konstitutionen

Om ett framtida förslag:

- ökar retention genom skuld
- gör streak central på bekostnad av återstart
- gör coachen mer pratsam än hjälpsam
- belönar klick mer än vardag

...då ska förslaget anses bryta mot konstitutionen även om det ser lönsamt ut på kort sikt.

## 10.5 Hur konstitutionen ska användas

### Vid designbeslut

Fråga:

- Skyddar detta användarens värdighet?
- Gör detta nästa steg tydligare?
- Ökar detta verklig vardagsfunktion?

### Vid AI-beslut

Fråga:

- Är coachen sann, varsam och tillräckligt tyst?

### Vid QA

Fråga:

- Finns det något i denna upplevelse som kan få användaren att känna personlig skuld eller felhet?

### Vid produktprioritering

Fråga:

- Bygger detta kärnmotorn eller bara yttre aktivitet?

---

# APPENDIX

## Appendix A – Mapping PBS01-PBS05 till UC-katalogen

### PBS01 – Planera dagen

Kopplas främst till:

- UC004 Bygga schema / planera dag
- UC011 Justera ordning i dagens rutin
- UC012 Kopiera dag, vecka eller barnets schema
- UC013 Planera specialdag eller undantag
- UC015 Pausa, avvakta eller omplanera aktivitet
- UC017 Sätt sektionstider och rytm för dagen
- UC018 Skapa återanvändbar rutinmall

### PBS02 – Genomföra aktivitet

Kopplas främst till:

- UC007 Starta aktivitet
- UC008 Slutföra aktivitet
- UC009 Hoppa över aktivitet
- UC019 Visa dagens nu-läge
- UC020 Visa nästa aktivitet
- UC021 Starta timer eller tidshjälp
- UC022 Arbeta genom delsteg
- UC026 Återuppta pausad aktivitet
- UC027 Hantera sen start eller avvikande morgon

### PBS03 – Motivation

Kopplas främst till:

- UC010 Första synliga framsteg och första stjärnan
- UC029 Fira framsteg
- UC031 Bygga och bära streak
- UC032 Sätta mål eller riktning
- UC033 Lösa in belöning
- UC034 Visa achievement eller milstolpe
- UC035 Veckoreflektion och lugn återblick

### PBS04 – Coach

Kopplas främst till:

- UC014 Coach interagerar
- UC036 Coach föreslår nästa steg
- UC037 Coach hjälper omplanera dagen
- UC038 Coach bryter ned en stor uppgift
- UC039 Coach lugnar efter motgång
- UC040 Coach ställer reflektionsfråga
- UC041 Coach väljer att vara tyst
- UC042 Coach eskalerar till vuxen eller stödperson

### PBS05 – Misslyckanden

Kopplas främst till:

- UC009 Hoppa över aktivitet
- UC015 Pausa, avvakta eller omplanera aktivitet
- UC027 Hantera sen start eller avvikande morgon
- UC030 Återstart efter misslyckande
- UC037 Coach hjälper omplanera dagen
- UC039 Coach lugnar efter motgång
- UC053 Få relevant påminnelse
- UC060 Arkivera, pausa eller lämna produkten värdigt

## Appendix B – Dokumentroadmap v1.1 till 3.0

### Version 1.1

Fördjupar:

- fler fulla UCs i Del 4
- bättre koppling mellan motivation och reward-ekonomi
- första QA-checklistor per kapitel
- tydligare copybibliotek för coach

### Version 1.2

Fördjupar:

- ungdomsprofil
- vuxenprofil
- relation mellan familjevy, pedagog och terapeut
- tydligare anti-mönster per roll

### Version 2.0

Fördjupar:

- full domänneutralisering från barntermer till person/member/group
- komplett AI coach policy med guardrails
- full failure-recovery-matris för 1 dag, 1 vecka, 1 månad, 3 månader, 1 år
- mål- och achievement-system som förstaklassobjekt

### Version 3.0

Fördjupar:

- komplett livscykelspec barn -> vuxen
- komplett terapeutisk/professionell delningsmodell
- full beteendemodell för multi-group, team och hushåll utanför kärnfamilj
- slutlig PBS-volym i riktning 250-400 sidor

## Appendix C – Läsordning för nya personer

1. Läs detta dokument först.
2. Läs sedan [`architecture-platform.md`](./architecture-platform.md).
3. Läs därefter [`VISION-2030.md`](./VISION-2030.md) för kort strategisk riktning.
4. Läs sist [`APP-V2-KRAVSPEC.md`](./APP-V2-KRAVSPEC.md) för leveransomfattning och implementationens målbild.

## Appendix D – Kort sammanfattning att bära med sig

Om någon måste minnas fem saker om produkten ska det vara dessa:

1. Vi bygger inte bara en barnapp; vi bygger en motor för exekutiv funktion.
2. Nästa steg ska alltid vara tydligare än hela problemet.
3. Belöning är viktig, men handlingen är helig.
4. Återstart är lika viktig som framgång.
5. Produkten får aldrig få användaren att känna sig misslyckad som människa.

---

## Versionshistorik

- **1.0 (2026-06-26):** Första normerande grundversionen. Ersätter tidigare PBS-utkast och etablerar ny struktur med Del 1-10, UC-katalog och åtta fulla use cases.

========================================================================
KÄLLA: architecture-platform.md
========================================================================

# Core Platform — Arkitektur & presentationslager

**Skapad:** 2026-06-26  
**Version:** 0.1 (utkast)  
**Status:** Strategisk arkitekturspec — styr långsiktiga beslut, **ingen omedelbar implementation**  
**Ägare:** Produkt + teknik

> **Relaterat:** [`PRODUCT_BEHAVIOR_SPEC.md`](./PRODUCT_BEHAVIOR_SPEC.md) · [`architecture-platform.md`](./architecture-platform.md) · [`APP-V2-KRAVSPEC.md`](./APP-V2-KRAVSPEC.md)

---

## 0. En rad som styr allt

> **Samma motor, olika upplevelser.**

Produkten är inte en barnapp. Den är **Generation 1** av en motor för **exekutiv funktion** — planera, utföra, bekräfta, belöna, bygga vanor. Den råkar idag användas av familjer med barn 4–12.

**Beslutsgate för varje v2-ändring:**

> *Kan samma motor presenteras för en 24-åring med ADHD utan att vi skriver om arkitekturen?*

| Svar | Betydelse |
|------|-----------|
| **Ja** | Plattform — bygg vidare |
| **Nej** | Barnapp-skuld — ompröva |

---

## 1. Vad kunderna faktiskt köper

Idag marknadsför vi *visuella scheman*. Det kunderna köper är:

| Värde | Gäller även 22-åring med ADHD? |
|-------|-------------------------------|
| Mindre stress | ✅ |
| Mindre tjat / självövertygelse | ✅ ("Jag säger till mig själv att jag ska börja") |
| Mer självständighet | ✅ |
| Bättre rutiner | ✅ |
| Lugnare vardag | ✅ |
| Fungerande exekutiva funktioner | ✅ |

**Kärnloopen (åldersneutral):**

```
Planera → Utföra → Bekräfta → Belöna → Bygga vanor
```

---

## 2. Produktgenerationer

```
Generation 1 (nu)     Barn 4–12 + föräldrar + pedagoger
        ↓
Generation 2          Ungdomar 13–17
        ↓
Generation 3          Unga vuxna 18–30
        ↓
Generation 4          Vuxna
```

**Vad förändras per generation:** nästan bara **presentation** (nav, språk, illustrationer, gamification-nivå, coach-ton).

**Vad förändras inte:** core engines, datamodell, API-kontrakt.

App v2 / nav v2 är **Platform v1** — grunden som gör Generation 2–4 möjliga utan omskrivning.

---

## 3. Två lager (övergripande)

```
┌─────────────────────────────────────────────────────────────┐
│                    CORE PLATFORM (Layer 1)                   │
│         Domänlogik — förändras sällan, delas av alla         │
│                                                              │
│  Identity · Tasks · Goals · Rewards · Progress · Habits     │
│  Relationships · Timeline · Coach (AI) · Permissions          │
│  Notifications · Analytics                                   │
│                                                              │
│              Gemensam datamodell & API                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              PRESENTATION LAYER (Layer 2)                      │
│    Navigation · språk · färger · animation · gamification    │
│                                                              │
│   CHILD    TEEN    YOUNG_ADULT    ADULT    (+ Parent, Educator) │
└─────────────────────────────────────────────────────────────┘
```

**Regel:** Presentation får **aldrig** äga affärslogik. Paket, capabilities och permissions lever i Layer 1.

---

## 4. Layer 1 — Core Platform

### 4.1 Engines (domänlogik)

Dessa är produkten — inte barn-UI:t.

| Engine | Ansvar | Befintlig kod / data (Generation 1) |
|--------|--------|-------------------------------------|
| **Task** | Skapa, planera, schemalägga, slutföra uppgifter | `activity_template`, `weekly_schedule`, `daily_log_item`, `sub_steps` |
| **Goal** | Kort- och långsiktiga mål | `reward` (stjärnkost), streak, familjeprojekt |
| **Reward** | Poäng, inlösen, unlocks | `daily_log_item.star_value`, `reward_redemption`, universe |
| **Progress** | Streaks, nivåer, historik, statistik | `streak`, museum, star history |
| **Habit** | Återkommande mönster, vanor | weekly schedule, completion patterns |
| **Relationship** | Grupper, roller, inbjudan, stödpersoner | `family`, `parent_child`, `pedagog_invite` |
| **Timeline** | NU / NÄSTA / SEN, tidslinje, kalender | `view_type`, `now_next_later`, calendar |
| **Coach (AI)** | Personliga förslag, nästa steg | För dig (förälder, Gen 1), framtida per profil |
| **Notification** | Push, påminnelser, systemmeddelanden | `push_subscriptions`, `notification_log` |
| **Permission** | Roller, integritet, åtkomst | `parent_child.role`, authz, PIN/parental gate |
| **Identity** | Person, konto, session | `parent`, `child` (→ `member`), JWT |

### 4.2 Tre motorer — generiska namn

Dagens barn-specifika namn mappas till **plattformsneutrala** engines. Barn-IA är en *presentation* av dem.

| Plattform (Layer 1) | Generation 1 (barn-UI) | Mental modell |
|---------------------|------------------------|---------------|
| **Execution Engine** | Today / Idag | *Vad ska jag göra nu?* |
| **Progress Engine** | Universe / Min värld | *Vad har jag byggt upp?* |
| **Relationship Engine** | Family / Mina personer | *Vem finns i mitt liv?* |

```
Execution Engine     →  tasks → complete → emit event
Progress Engine      →  points → unlocks → collections
Relationship Engine  →  groups → shared story → support network
```

**Viktigt:** Vi **ersätter inte** Today/Universe/Family i Generation 1-koden över natten. Vi **namnger dem konceptuellt** i nya specs och ser till att v2-implementationen inte låser oss till barnord i *ny* kod.

### 4.3 Domänspråk (mål)

| Idag (Generation 1) | Plattform (mål) | Barn ser | Vuxen ser |
|---------------------|-----------------|----------|-----------|
| `child` | `member` / `person` | "Astrid" | "Jag" |
| `family` | `group` | "Familjen" | "Mitt team" / "Hushållet" |
| `reward` + stars | `reward` + `progress_unit` | ⭐ Stjärnor | Progress / XP |
| Skattkammaren | `progress_surface` | 🏰 Min värld | Mål / Achievements |
| `parent` | `guardian` / `account` | Förälder | Stödperson / Själv |

**Migreringsprincip:** Tabellnamn `child` / `family` **behålls** tills explicit migration. Ny kod och nya API-fält använder neutrala begrepp där det är billigt (`member_id` i events, `presentation_profile` i config).

---

## 5. Layer 2 — Presentation Profiles

### 5.1 `PresentationProfile`

```ts
type PresentationProfile =
  | 'CHILD'        // 4–12
  | 'TEEN'         // 13–17
  | 'YOUNG_ADULT'  // 18–30
  | 'ADULT'        // 30+
  | 'PARENT'       // vårdnadshavare (Gen 1)
  | 'EDUCATOR'     // pedagog (finns)
  | 'THERAPIST'    // horisont
```

Varje profil styr **endast presentation:**

| Dimension | Styrs av profil |
|-----------|----------------|
| Navigation (etiketter, antal flikar) | ✅ |
| Färger, illustrationer, animation | ✅ |
| Språk och metaforer | ✅ |
| Gamification-nivå (stjärnor vs XP vs %) | ✅ |
| Coach-ton | ✅ |
| Ikoner | ✅ |
| Affärslogik, API, permissions | ❌ Layer 1 |

**Teknisk början (v2, ingen ny tabell nödvändig):**

```js
// Utöka befintlig config — inte ny backend
child_view_config.presentation_profile  // 'CHILD' | 'TEEN' | …
child_view_config.age_band              // härledd från birthday
```

### 5.2 Navigation per profil

Samma tre **engine-slots** — olika etiketter och visuell tyngd.

| Engine slot | CHILD (4–12) | TEEN (13–17) | YOUNG_ADULT | ADULT |
|-------------|--------------|--------------|-------------|-------|
| Execution | ☀️ Idag | Idag | Idag / Tasks | Idag / Tasks |
| Progress | 🏰 Min värld | Mitt space | Mål / Progress | Mål / Growth |
| Relationship | ❤️ Mina personer | Mina personer | Mitt nätverk | Network / People |

**v2 gör redan rätt:** Idag · Min värld · Mina personer är **översättningsbara** etiketter — inte hårdkodade barnbegrepp i motorerna.

### 5.3 Gamification per profil

Samma API-anrop — olika presentation:

| Händelse | CHILD | TEEN | YOUNG_ADULT / ADULT |
|----------|-------|------|---------------------|
| Slutför uppgift | +1 ⭐ → glass | +25 XP → achievement | Progress 73 % → månadsmål |
| API | `POST …/complete` → `{ progress_delta, unit: 'stars' }` | samma | samma — `unit` + profil styr UI |
| Progress-yta | Skattkammaren, hus, rum | Avatar, streak, stats | Grafer, mål, vanor |

### 5.4 Coach per profil

| Profil | Coach-roll | Generation 1-status |
|--------|------------|---------------------|
| PARENT | Lösningslager för vårdnadshavare | För dig — **levererat** |
| CHILD | Kort loop efter aktivitet | v2 coach-loop |
| TEEN | Självständighet + integritet | Ej byggt |
| YOUNG_ADULT / ADULT | AI-stöd, dagssammanfattning | Ej byggt |

Samma **Coach engine** — olika `tone` + `placement` per `PresentationProfile`.

---

## 6. Produkter & roller (horisont)

```
Product (byggda på Core Platform)

├── Child          Generation 1 — live
├── Parent         Generation 1 — live
├── Educator       Generation 1 — live (pedagog)
├── Teen           Generation 2
├── Young Adult    Generation 3
├── Adult          Generation 4
├── Therapist      Horisont
└── Organization   Horisont (skola, BUP, arbetsplats)
```

Paket (`basic_app`, `reporting`, `pedagog`, `teacch`) är **capabilities** ovanpå Core — inte separata produkter.

---

## 7. Relation till befintlig barnarkitektur

**Gör inte:** Slänga Today / Universe / Family — de fungerar för Generation 1.

**Gör:** Lyfta dem ett konceptuellt lager och behandla dem som **första presentation** av Execution / Progress / Relationship.

```
                    CORE PLATFORM
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   Execution         Progress         Relationship
        │                 │                 │
        ▼                 ▼                 ▼
   CHILD preset      CHILD preset      CHILD preset
   "Idag"            "Min värld"       "Mina personer"
        │                 │                 │
        ▼                 ▼                 ▼
   TEEN preset       TEEN preset       TEEN preset
   "Idag"            "Mitt space"      "Mina personer"
```

| Befintligt dokument | Roll efter denna spec |
|--------------------|------------------------|
| `engineering-architecture-barnapp.md` | **Generation 1 implementation** av Core |
| `separation-contract-barnapp.md` | **Execution ⊥ Progress ⊥ Relationship** — fortfarande giltigt |
| `informationsarkitektur-barnapp.md` | CHILD presentation IA |
| `barnmeny-v2.md` / `vuxenmeny-v2.md` | Platform v1 nav-migration |
| `APP-V2-KRAVSPEC.md` | Platform v1 leveranskrav |

---

## 8. Vad v2 / Platform v1 ska förbereda (utan att bygga Gen 2)

| Åtgärd | Kostnad | Varför |
|--------|---------|--------|
| Åldersneutrala nav-etiketter (Idag, Min värld, Mina personer) | Pågår | Översättningsbar till teen/adult |
| `presentation_profile` / `age_band` i view-config | Låg | En källa för framtida UI |
| Capabilities med `domain` + `placement` (ej barnord i ny kod) | Pågår | `nav-config.js`, `child-worlds.js` |
| Events med neutrala namn (`activity_completed`, `progress_delta`) | Låg | `analytics_events` redan neutral |
| **Inte** byta tabell `child` → `member` nu | — | För tidigt; dokumentera mappning |
| **Inte** bygga teen/adult UI nu | — | Presentation Profiles är spec, inte sprint |

---

## 9. API-exempel (samma motor)

**Barn:**

```
POST /api/me/daily-log/items/:id/complete
→ { progress_delta: 1, unit: 'stars', unlocks: [...] }

UI: "Bra jobbat! +1 ⭐" → glass i Skattkammaren
```

**Ung vuxen (samma endpoint, annan profil):**

```
POST /api/me/daily-log/items/:id/complete
→ { progress_delta: 25, unit: 'xp', unlocks: [...] }

UI: "Uppgift klar. +25 XP" → veckomål 80 %
```

Backend returnerar **data** — `PresentationProfile` styr **hur** det renderas.

---

## 10. AI-lager (horisont)

```
Coach Engine (Layer 1)
├── Inputs: tasks, progress, goals, calendar, member context
├── Outputs: suggestion, next_step, activation_package
└── Presentation: tone + length per profile

PARENT  → "Prova kvällsrutinen för Astrid"     (För dig, Gen 1)
CHILD   → "Bra jobbat! Nästa: frukost"           (coach-loop, v2)
TEEN    → "Du har 2 kvar idag. Vill du se dem?"
ADULT   → "Morgonblock klart. Dags för fokuspass."
```

---

## 11. Plugin / capabilities (befintligt → plattform)

Nuvarande `component-feature-map.js` och `CAPABILITIES` är redan rätt modell:

```
Capability → feature gate → placement → visibility
```

Det skalar till nya produkter utan ny nav per paket. Se `paket-v1.2-spec.md`.

---

## 12. Öppna arkitekturbeslut

| # | Fråga | Rekommendation |
|---|-------|----------------|
| A1 | När byta `child` → `member` i API? | Generation 2 — alias i Gen 1 |
| A2 | En app eller flera App Store-listningar? | En motor; ev. separat branding senare |
| A3 | `PresentationProfile` i DB eller härledd? | `birthday` + `account_type` + override i config |
| A4 | Ersätta engine-namn i kod nu? | Nej — konceptuellt i docs; kod vid React-migration |
| A5 | För dig för teen/adult? | Nej — ny coach-yta, samma engine |

---

## 13. Dokumentstruktur (mål)

```
docs/
├── PRODUCT_BEHAVIOR_SPEC.md          ← PRIMÄR — hur produkten beter sig (PBS)
├── USE_CASES_PLATFORM.md             ← arkiv / volym 2-referens (UC01–UC12)
├── architecture-platform.md          ← Core Platform (engines, profiles)
├── APP-V2-KRAVSPEC.md              ← Platform v1 leverans
├── engineering-architecture-barnapp.md  ← Gen 1 implementation
├── informationsarkitektur-barnapp.md
├── separation-contract-barnapp.md
├── barnmeny-v2.md
├── vuxenmeny-v2.md
└── VISION-2030.md                  ← kort executive summary (valfritt)
```

---

## 14. Versionshistorik

| Version | Datum | Ändring |
|---------|-------|---------|
| 0.1 | 2026-06-26 | Första utkast. Core Platform + Presentation Profiles. v2 = Platform v1. |

========================================================================
KÄLLA: APP-V2-KRAVSPEC.md
========================================================================

# App v2 — Kravspecifikation

**Skapad:** 2026-06-26  
**Version:** 0.3 (utkast)  
**Status:** Platform v1 leveranskrav — nav och presentation för Generation 1, med plattformsgrund för Gen 2–4  
**Ägare:** Produkt  
**Målgrupp v2:** Barn 4–12 år och deras vårdnadshavare (pedagoger som tillägg)

> Det här dokumentet är **leveranskrav** för Platform v1. **Beteende** styrs av [`PRODUCT_BEHAVIOR_SPEC.md`](./PRODUCT_BEHAVIOR_SPEC.md) — vid konflikt vinner PBS.

---

## Relaterade dokument

| Dokument | Roll |
|----------|------|
| [`PRODUCT_BEHAVIOR_SPEC.md`](./PRODUCT_BEHAVIOR_SPEC.md) | **Primär produktspec** — hur produkten beter sig (PBS) |
| [`USE_CASES_PLATFORM.md`](./USE_CASES_PLATFORM.md) | Arkiv — UC01–UC12 för volym 2 (PBS06–12) |
| [`architecture-platform.md`](./architecture-platform.md) | Core Platform — engines, Presentation Profiles |
| [`VISION-2030.md`](./VISION-2030.md) | Kort executive summary |
| [`barnmeny-v2.md`](./barnmeny-v2.md) | Barnsidans IA, tre världar, migration |
| [`vuxenmeny-v2.md`](./vuxenmeny-v2.md) | Föräldrasidans IA, hubbar, domänmodell |
| [`vuxenmeny-v2-operations-checklist.md`](./vuxenmeny-v2-operations-checklist.md) | Acceptance + KX-rader (förälder) |
| [`informationsarkitektur-barnapp.md`](./informationsarkitektur-barnapp.md) | Tre lager: Idag / Skattkammaren / Familj |
| [`separation-contract-barnapp.md`](./separation-contract-barnapp.md) | Hårda gränser mellan lager |
| [`engineering-architecture-barnapp.md`](./engineering-architecture-barnapp.md) | Implementation-grade systemdesign |
| [`implementation-plan-3-layers.md`](./implementation-plan-3-layers.md) | Fasplan tre-lager-refaktor |
| [`paket-v1.2-spec.md`](./paket-v1.2-spec.md) | Paket, komponenter, pedagog, TEACCH |
| [`for-dig-spec.md`](./for-dig-spec.md) | För dig — **redan levererat** (underhåll; ej v2-bygge) |
| [`kravspec-app-webb.md`](./kravspec-app-webb.md) | Auth, roller, säkerhet, plattform |
| [`tillvaxt-retention-krav.md`](./tillvaxt-retention-krav.md) | KPI:er, aktivering, North Star |
| [`admin-v2/ADMIN-V2-DELIVERY.md`](./admin-v2/ADMIN-V2-DELIVERY.md) | Admin v2 (levererat) |
| [`magic-view-rollout.md`](./magic-view-rollout.md) | Magic-vy global rollout |
| [`config/component-feature-map.js`](../config/component-feature-map.js) | Feature → paket → placement |

---

## 0. Sammanfattning (TL;DR)

**App v2 = Platform v1** — inte en ny produkt, utan **konsekvent omorganisering** av kärnmotorn (planera → utföra → bekräfta → belöna) plus presentationslager som klarar framtida målgrupper.

**Beslutsgate (varje större ändring):** *Kan samma motor presenteras för en 24-åring med ADHD utan arkitekturomskrivning?* Se [`architecture-platform.md`](./architecture-platform.md).

| Dimension | v1 (idag) | v2 (mål) |
|-----------|-----------|----------|
| Föräldernav | Feature-lista, dubbla källor (LEGACY/ROLLOUT), Mer/Extra | Fem jobb-flikar: Hem · Planering · Belöningar · För dig · Familj |
| Barnnav | Classic/magic/rollout, 4+ parallella nav-system | Tre världar: Idag · Min värld · Mina personer |
| Ny funktion | Ofta ny flik eller gömd | Placement i befintlig domän |
| Paket | Synlig i menyn | Utökar **djup**, inte bredd |
| Backend | — | **Oförändrad affärslogik** — nya hubbar och routes som tunt lager |

**Strategiskt mål:** Gör det lättare att **aktivera** (första stjärnan), **använda dagligen** (Idag som OS) och **växa in i paket** utan navigationskaos.

**North Star (oförändrad):** Family Day 14-retention — familj aktiv dag 13–15 efter start. Se [`tillvaxt-retention-krav.md`](./tillvaxt-retention-krav.md).

---

## 1. Bakgrund & problem

### 1.1 Varför v2?

Produktens **kärnvärde** fungerar för aktiva familjer (särskilt NPF 4–12). Men informationsarkitekturen har vuxit organiskt:

| Symptom | Konsekvens |
|---------|------------|
| Förälder: Schema, Skatt, Mer, Extra, Familj, Inställningar i olika kombinationer | Användaren navigerar **funktioner**, inte **jobb** |
| Barn: classic vs magic vs package-nav (2–4 flikar) | Dubbel testyta, inkonsekvent startflik |
| `/skattkammaren` = demo + förälder + barn | Förvirrande URL-semantik |
| Barninställningar i drawer + `/child-settings` | Fragmenterad barnadministration |
| Paket synliga som menypunkter | Säljbarhet och UX konkurrerar |

Rotorsak i aktiveringsdata (2026-06): **43 % av familjer har aldrig någon aktivitetssignal** — produkten känns som "tom canvas" innan värdet syns. v2 adresserar detta genom tydligare **Hem** (readiness) och barnets **coach-loop** — inte genom nytt För dig-arbete (redan på plats).

### 1.2 Vad v2 inte är

| v2 är | v2 är inte |
|-------|------------|
| Ny navigation och presentation | Omskrivning av schedule/daily-log/rewards-API |
| Hub-sidor som länkar till befintliga routes | Flytt av affärslogik till nya filer |
| En källa för nav (`nav-config.js`, `child-worlds.js`) | React-rewrite (långsiktig target, ej v2-blocker) |
| Inkrementell migration med redirects | Big-bang-lansering |
| Konsekvent 4–12-upplevelse | Ungdoms-/vuxenprodukt (horisont, §3.3) |

---

## 2. Vision

> **Appen hjälper familjen att få vardagen att fungera — barnet vet vad som händer nu, vuxna planerar utan friktion, och belöningar ger mening utan att stjäla fokus från handlingen.**

### 2.1 Produktprinciper (låsta)

1. **Intent före feature** — navigation svarar på användarens fråga, inte systemets modulnamn.
2. **Idag är operativsystemet** — ~80 % av barnets tid ska landa i handling, inte utforskning.
3. **Tre lager, tre mentala modeller** — Idag (göra) · Min värld (bli) · Mina personer (höra till). Blanda aldrig på samma skärm. Se [`separation-contract-barnapp.md`](./separation-contract-barnapp.md).
4. **Paket utökar djup** — TEACCH, rapporter och pedagog läggs som placements i befintliga domäner, inte som nya toppflikar.
5. **Samma data, adaptiv presentation** — stödnivå och ålder ändrar *hur* saker visas, inte *var* de bor.
6. **Coach, inte verktyg** — Hem (läge + nästa steg) och barnets coach-loop guidar till handling. För dig finns redan för 4–12-föräldrar; v2 bygger inte ut den.
7. **Backend-first stabilitet** — befintliga API:er och tabeller återanvänds; v2 är primärt frontend-IA.

### 2.2 Framgångsmått

| KPI | Baslinje | v2-mål (indikatorer) |
|-----|----------|----------------------|
| Aktivering (första stjärnan) | 17 % | ↑ via tydligare Hem/onboarding/barn-inloggning |
| Day 14-retention | ~26 % av aktiverade | ↑ via Idag-fokus + coach |
| Barn: tid till första avbockning | Ej mätt konsekvent | `child_today_first_complete` < 60 s efter login |
| Förälder: hub-adoption | — | `nav_hub_click` planning/rewards > direktlänkar |
| Barnprofil-adoption | — | `/family/child/:id` ≥ 80 % av barnsessioner (fas 3) |
| Supportärenden "var hittar jag…" | Kvalitativ | ↓ efter nav-enhetlighet |

Detaljerad KPI-plan: [`tillvaxt-retention-krav.md`](./tillvaxt-retention-krav.md).

---

## 3. Omfattning

### 3.1 In scope (v2)

| Område | Leverans |
|--------|----------|
| **Föräldernav v2** | `nav-config.js`, fem flikar, hubbar `/planning` + `/rewards` |
| **Barnnav v2** | `child-worlds.js`, tre världar, routes `/child/today` · `/child/world` · `/child/family` |
| **Barnprofil** | `/family/child/:id` samlar schema, framsteg, PIN, inställningar |
| **Settings-sanering** | Konto, GDPR, prenumeration i `/settings` — inte i Familj-fliken |
| **Hem som coach** | Readiness-kort med tydliga nästa steg (nytt v2-arbete) |
| **Barn coach-loop** | Kort bekräftelse efter aktivitet → pekar till NÄSTA |
| **Avveckla** | Classic/magic-nav-split, Mer/Extra-flikar, dubbla LEGACY/ROLLOUT-källor |
| **Redirects** | Permanent redirect-tabell (§11) |
| **Analytics** | Events vid varje UX-förändring (§10) |
| **Paket-placements** | `CAPABILITIES` / `CHILD_CAPABILITIES` när paket aktiveras |

### 3.2 Explicit out of scope (v2)

| Post | Varför | Var dokumenterat |
|------|--------|------------------|
| Omskrivning av `/schedule`, `/library`, `/reports` | Non-goal | `vuxenmeny-v2.md` §0 |
| Ny backend för befintliga flows | Non-goal | `vuxenmeny-v2.md` §0 |
| React SPA-migration | Långsiktig target | `engineering-architecture-barnapp.md` |
| AI-startschema (ACT-1) | Parallellt aktiveringsarbete | `act-1-ai-startschema-spec.md` |
| Referral, SEO-artiklar | Tillväxt, ej IA | `tillvaxt-retention-krav.md` |
| Admin v2 | **Redan levererat** | `admin-v2/ADMIN-V2-DELIVERY.md` |
| **För dig (ny funktionalitet)** | **Redan levererat** för nuvarande målgrupp | `for-dig-spec.md` — v2 behåller fliken, bygger inte ut |
| Stripe / webb-betalning | Borttaget; IAP only | `docs/app-store-iap.md` |

### 3.3 Horisont (ej v2 — framtida utvärdering)

Följande diskuterades som produktutvidgning men **ingår inte i v2-krav**:

| Segment | Krav på framtida version |
|---------|--------------------------|
| Tonåringar 13–17 | Eget konto, integritetsnivåer, dämpad gamification |
| Unga vuxna 18–25 | Självregistrering, NPF/ADHD-positionering, ingen "barnprofil"-UX |
| Vuxna 25+ | Hushållsläge, professionellt stöd (bygg på pedagog-mönstret) |

**För dig och nästa målgrupp:** För dig är utformat för vårdnadshavare till barn 4–12 (problemorienterade familjemål, åldersfiltrering via `child.birthday`). Det **ingår inte** i planen för ungdom/vuxen — där behövs annan coachning (egna mål, integritet, självstyrd planering), inte en vidareutveckling av För dig-fliken.

Teknisk förberedelse i v2 (låg kostnad): `child.birthday` + `child_view_config` kan senare utökas med `age_band` utan nav-refaktor.

---

## 4. Målgrupp & roller

### 4.1 Primär målgrupp

| Persona | Behov | v2-yta |
|---------|-------|--------|
| **Förälder (primary/shared)** | Överblick, planera, belöna, bjuda in | Fem flikar + barnprofil |
| **Barn 4–12** | Veta vad som händer nu, känna progression, trygghet | Tre världar |
| **Pedagog** | Följa tilldelade barn, anteckna, skolaktiviteter | Separat nav (`pedagog_view`) — oförändrat i v2 |
| **Medförälder delad vårdnad** | Se endast sina barn | `parent_child`-länk — oförändrat |

### 4.2 Kontotyper (`account_type`)

| Typ | v2-beteende |
|-----|-------------|
| `family` | Standard föräldravvy |
| `educator` | Redirect till pedagog-översikt; separat nav |
| `dual` | Växling via avatar-meny |

Säkerhetskrav oförändrade: [`kravspec-app-webb.md`](./kravspec-app-webb.md) §0–§2.

---

## 5. Systemarkitektur (v2)

### 5.1 Tre engines (barn)

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  IDAG       │────▶│  MIN VÄRLD   │────▶│  MINA       │
│  (action)   │     │  (meaning)   │     │  PERSONER   │
└─────────────┘     └──────────────┘     └─────────────┘
  tasks→complete      stars→unlocks       relation→trygghet
```

**Hård regel:** Ingen skärm blandar engines. Detaljer: [`separation-contract-barnapp.md`](./separation-contract-barnapp.md).

### 5.2 Fyra domäner (vuxen)

| Domän | Parent intent | v2-nav |
|-------|---------------|--------|
| `home` | *Här är läget* | Hem |
| `planning` | *Jag vill planera* | Planering (hub) |
| `rewards` | *Stjärnor och belöningar* | Belöningar (hub) |
| `for_you` | *Vad rekommenderar ni?* | För dig *(befintlig flik — behåll i nav, ej v2-bygge)* |
| `family` | *Vilka är med?* | Familj |
| `child_profile` | *Allt om ett barn* | `/family/child/:id` |
| `settings` | *Mitt konto* | Avatar → Inställningar |
| `pedagog_view` | *Mina elever* | Separat universum |

### 5.3 Capabilities-modellen

Varje funktion deklareras med **obligatoriska fält**:

```js
{
  id: 'reports',              // stabil nyckel
  feature: 'reporting',       // access gate (null = basic)
  domain: 'child_progress',   // parent intent
  placements: ['child_profile', 'rewards_hub'],  // var UI kan visas
  label: 'Rapporter',
  href: '/reports',
}
```

**Access** (har familjen köpt?) och **visibility** (ska vi visa nu?) är separata lager. Se `vuxenmeny-v2.md` §3.

Barn motsvarighet: `CHILD_CAPABILITIES` med exakt **en** `primaryPlacement` per capability.

### 5.4 Tekniska källor (single source of truth)

| Fil | Äger |
|-----|------|
| `public/js/nav-config.js` | Förälder: `PRIMARY_NAV`, `CAPABILITIES`, hubbar |
| `public/js/child-worlds.js` | Barn: `CHILD_WORLDS`, etiketter, paths |
| `public/js/child-capabilities.js` | Barn: feature-placements |
| `public/js/child-placements.js` | Barn: visibility per placement |
| `config/component-feature-map.js` | Feature → paket → komponent |

**Konsumenter** (ska läsa config, inte hårdkoda):

- `native-tab-bar.js`
- `parent-magic-shell.js` / `parent-magic-auto.js`
- `mobile-nav.js`
- `child-shell.js` (mål)
- `child-layer-router.js` (hash-fallback under migration)

---

## 6. Funktionella krav

### 6.1 Föräldervy

#### FR-P-01 Primärnav

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-P-01.1 | Exakt fem bottenflikar: Hem, Planering, Belöningar, För dig, Familj | Samma på native, mobil webb, desktop sidebar |
| FR-P-01.2 | Ingen Mer- eller Extra-flik | `nav-config.js` är enda källan |
| FR-P-01.3 | Inställningar endast via avatar-meny | Inte i bottennav |
| FR-P-01.4 | Notiser via header-klocka | `placement: header_notifications` |

#### FR-P-02 Planeringshub (`/planning`)

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-P-02.1 | Tunn hub som länkar till befintliga routes | `/schedule`, `/calendar`, `/activities`, `/library`, `/assign-schedule` |
| FR-P-02.2 | TEACCH visas här när köpt + aktiverat | `feature: teacch`, `placement: planning_hub` |
| FR-P-02.3 | Ingen duplicerad schedule-logik | Hub = länkar + kort beskrivning |

#### FR-P-03 Belöningshub (`/rewards`)

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-P-03.1 | Tunn hub för stjärnor, belöningar, kista, museum | Länkar till befintliga vyer |
| FR-P-03.2 | Inloggad förälder: `/skattkammaren` → redirect `/rewards` | Aldrig loop |
| FR-P-03.3 | Publik demo: `/skattkammaren?demo=1` oförändrad | Barn/demo ej påverkad |

#### FR-P-04 Hem (coach-lager)

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-P-04.1 | Statuskort per barn: Idag X/Y, ⭐, varningar (PIN saknas, etc.) | `home-readiness.js` |
| FR-P-04.2 | Kort leder till **handling** (inte bara info) | `readiness_action_click` event |
| FR-P-04.3 | Distinkt från För dig: Hem = läge, För dig = rekommendation | Produktcopy granskad |

#### FR-P-05 För dig (redan levererat — regressionskrav)

För dig är **på plats** för målgruppen 4–12. v2 ska **inte** planera ny funktionalitet här — bara behålla fliken i `PRIMARY_NAV` och säkerställa att nav-migrationen inte bryter befintlig route.

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-P-05.1 | Fliken kvar i femfliks-nav | `/for-dig` nåbar från alla plattformar |
| FR-P-05.2 | Ingen v2-scope för nya mål, Aktivera-flöden eller V3–V5 i `for-dig-spec.md` | Underhåll vid behov, separat spår |
| FR-P-05.3 | Ej relevant för nästa målgrupp (13+) | Horisont §3.3 — ersätts av annan modell, inte För dig v2 |

#### FR-P-06 Familj & barnprofil

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-P-06.1 | `/family` visar barn, vuxna, pedagoger — inte kontoinställningar | PIN/GDPR flyttat till settings |
| FR-P-06.2 | `/family/child/:id` samlar allt om ett barn | Schema, framsteg, PIN, vy, foto |
| FR-P-06.3 | Framsteg som domän: stjärnor, historik, rapporter, mål | Rapporter under Framsteg, inte Belöningar |
| FR-P-06.4 | `/child-settings` → redirect barnprofil | Permanent efter fas 7 |
| FR-P-06.5 | Barn-drawer avvecklas när analytics OK | ≥ 80 % adoption 14 dagar |

#### FR-P-07 Inställningar

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-P-07.1 | Grupperad meny: Profil, Notiser, Säkerhet, App, Data, Prenumeration | Magic settings-meny |
| FR-P-07.2 | `/upgrade` → `/settings#prenumeration` | Redirect |
| FR-P-07.3 | Pedagog-växling i avatar-meny (dual) | Inte i Familj-fliken |

### 6.2 Barnvy

#### FR-B-01 Primärvärldar (Barnregeln)

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-B-01.1 | Exakt tre världar: Idag, Min värld, Mina personer | Ingen fjärde primärvärld |
| FR-B-01.2 | Ny funktion får **inte** skapa ny värld | Code review + §Barnregel i `barnmeny-v2.md` |
| FR-B-01.3 | Login → animation (max 2 s) → **Idag** | Aldrig Hem/Min värld som start |
| FR-B-01.4 | `CHILD_WORLDS` är enda IA-källa | Ingen classic/magic/rollout-nav-split |

#### FR-B-02 Idag (`/child/today`)

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-B-02.1 | NU / NÄSTA / SEN eller dagsektioner — max 5 synliga uppdrag | `child-today-focus.js`, `child-today-tasks.js` |
| FR-B-02.2 | Delsteg (sub_steps) inline eller expanderbara | Befintlig daily-log |
| FR-B-02.3 | Ingen kalender, statistik eller universum på Idag-skärmen | Separation contract |
| FR-B-02.4 | Kompakt mål (1 rad) tillåtet | `goal_preview` |
| FR-B-02.5 | CTA till Min värld sekundär — inte konkurrerande | QuestCTA längst ner |

#### FR-B-03 Min värld (`/child/world`)

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-B-03.1 | All progression: stjärnor, rum, avatar, samlingar, museum | Internt: Skattkammaren |
| FR-B-03.2 | Ingen task-checklist här | Route guard |
| FR-B-03.3 | Känns som belöning för handling — inte huvuddestination | Inte default efter login |

#### FR-B-04 Mina personer (`/child/family`)

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-B-04.1 | "De som hjälper mig" — personer först | Ingen social graph |
| FR-B-04.2 | Familjeprojekt / berättelse när live | `familjehallen_v0` |
| FR-B-04.3 | Barn kan inte skriva familjedata | Read-only child UI |

#### FR-B-05 Coach-loop

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-B-05.1 | Kort bekräftelse efter avklarad aktivitet | Ej chat-bot |
| FR-B-05.2 | Leder till NÄSTA steg — aldrig till meny | `today_coach_post_activity` |
| FR-B-05.3 | Valfritt att expandera; `aria-live` för a11y | WCAG-granskning |

#### FR-B-06 Adaptivt stöd

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-B-06.1 | Samma `daily_log` data, olika rendering per barn | `child_view_config` |
| FR-B-06.2 | Stöd ändrar upplevelse — aldrig informationsarkitektur | TEACCH = overlay på Idag |
| FR-B-06.3 | Personliga etiketter per ålder inom 4–12 | `labels.young` / `default` / `personal` |

#### FR-B-07 System & säkerhet

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-B-07.1 | Byt barn, logga ut bakom vuxenikon + Parental Gate | `parental-gate.js` |
| FR-B-07.2 | `session-gate.js` inkluderar `/child/*` | Förälder blockeras på barnroutes |
| FR-B-07.3 | Barn-session: endast child JWT | Ingen `/api/family/*` |

#### FR-B-08 Presentation

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-B-08.1 | `presentationMode`: mobile, tablet, desktop, native | Styr placering, inte antal världar |
| FR-B-08.2 | Tema/färger via `child_view_config` — inte separat app | Magic = utseende, inte IA |

### 6.3 Pedagogläge

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-ED-01 | Separat nav-universum — inga föräldraflikar | `PEDAGOG_PRIMARY_NAV` |
| FR-ED-02 | Pedagog skapar endast `source='educator'` data | Konstitutionell regel i `paket-v1.2-spec.md` |
| FR-ED-03 | v2 ändrar inte pedagog-IA | Endast ev. deep-link-uppdateringar |

### 6.4 Onboarding & aktivering

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-ON-01 | Onboarding utanför v2-nav — engångsflöde | `magic-view-rollout.md` |
| FR-ON-02 | Efter onboarding: landa i Hem med readiness-kort | "Nästa steg" synligt |
| FR-ON-03 | Barn-inloggning tydlig från Hem | `dashboard-child-handoff.js` |
| FR-ON-04 | ACT-1 (AI-startschema) kompletterar v2 — ej blocker | Parallellt spår |

### 6.5 Paket & monetisering

| Paket | Komponent | v2-placering |
|-------|-----------|--------------|
| Basic | `basic_app` | Hela kärnnav |
| Familj Rapportering | `reporting` | Barnprofil → Framsteg |
| Familj Pedagog | `pedagog` | Familj + separat vy |
| Familj Extra stöd | `teacch` | Idag-overlay + Planeringshub |

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-PK-01 | Köp ändrar inte antal nav-flikar | Placements only |
| FR-PK-02 | `GET /api/subscription/access` styr access-lager | Oförändrat API |
| FR-PK-03 | Prenumeration i settings — inte Extra-flik | Fas 4 |

---

## 7. Icke-funktionella krav

### 7.1 Säkerhet & behörighet

Oförändrade krav från [`kravspec-app-webb.md`](./kravspec-app-webb.md):

- `parent_child` + `revoked_at IS NULL` på alla child-scoped routes
- CSRF på muterande vuxen-requests
- Parental Gate på delad enhet
- `requirePrimaryParent` för känsliga operationer

### 7.2 Tillgänglighet (a11y)

| Krav | Detalj |
|------|--------|
| NFR-A11Y-01 | `aria-current` på aktiv nav/värld |
| NFR-A11Y-02 | Coach-loop: `aria-live="polite"` |
| NFR-A11Y-03 | Touch targets ≥ 44 px (native + mobil) |
| NFR-A11Y-04 | Fokusfälla i modaler och Parental Gate |

### 7.3 Prestanda

| Krav | Detalj |
|------|--------|
| NFR-PERF-01 | Idag ska vara interaktiv < 2 s efter child-login (P95) |
| NFR-PERF-02 | Hub-sidor < 50 KB extra JS (tunna) |
| NFR-PERF-03 | SW `CACHE_NAME` bump vid varje v2-release |

### 7.4 Plattform

| Plattform | Krav |
|-----------|------|
| iOS/Android native | Tab bar läser `nav-config.js`; safe-area |
| Mobil webb/PWA | Hamburger + samma fem flikar |
| Desktop | Sidebar = samma IA som tab bar |
| Offline | Befintlig daily-log-kö oförändrad |

Se [`plattform-webb-ios-android.md`](./plattform-webb-ios-android.md).

### 7.5 Analytics

| Event | När |
|-------|-----|
| `nav_hub_click` | Hub-flik klickad |
| `readiness_action_click` | Hem-kort → handling |
| `child_profile_section` | Sektion öppnad i barnprofil |
| `child_world_view` | Barn byter värld |
| `today_coach_shown` / `_dismissed` | Coach-loop |
| `page_view` | Route-migration (före/efter baseline) |

Ingen PII i `analytics_events`. Befintlig tabell återanvänds.

---

## 8. Datamodell & API (begränsningar)

v2 **introducerar inga obligatoriska nya tabeller** för kärnnav. Befintliga entiteter räcker:

| Entitet | v2-användning |
|---------|---------------|
| `child` | `birthday`, `view_type`, `child_view_config` |
| `child_view_config` | `view_mode`, element-flags, framtida `age_band` |
| `parent` | `account_type`, `preferred_view_mode` |
| `parent_child` | Roller, granular åtkomst |
| `family_subscriptions` | Paket-access |
| `daily_log` / `daily_log_item` | Idag-engine |
| `analytics_events` | v2-mätning |

**API:er som inte får brytas:** `/api/me/daily-log`, `/api/children`, `/api/subscription/access`, `/api/auth/*`.

Nya endpoints tillåtna för v2-stöd (tunna):

- `GET /api/family/readiness` (förslag — aggregering för Hem)
- Befintliga routes oförändrade i path och kontrakt

---

## 9. Design

### 9.1 Designtokens (oförändrade)

| Token | Värde |
|-------|-------|
| Navy | `#1B2340` |
| Gold | `#F5A623` |
| Lavender | `#EDE7F6` |
| Typsnitt | Outfit + Plus Jakarta Sans |

### 9.2 Visuell ton per yta

| Yta | Ton |
|-----|-----|
| Förälder | Ljus, professionell, lugn |
| Barn Idag | Tydlig, låg kognitiv belastning |
| Barn Min värld | Rikare, belönande — sekundär |
| För dig (befintlig) | Varm, handlingsorienterad — underhåll, ej v2-utveckling |
| Hem / barn coach | Tydlig, låg friktion |

### 9.3 Mockups & referenser

| Mockup | Fil |
|--------|-----|
| Föräldra-dashboard | `docs/mockups/foraldra.html` |
| Barnvy | `docs/mockups/barnvy.html` |
| Belöningar | `docs/mockups/beloningar.html` |

---

## 10. Leveransplan (samlad)

v2 levereras **inkrementellt**. Förälder och barn kan vara i olika faser kortvarigt — men `nav-config` + `child-worlds` ska vara synkade i principer före fas 3.

### Fas 0 — Lås arkitektur

| Leverans | Förälder | Barn |
|----------|----------|------|
| Config-filer | `nav-config.js` | `child-worlds.js`, `child-capabilities.js` |
| Konsumenter kopplade | tab-bar, magic-shell, mobile-nav | layer-router (läs config) |
| Beteende | Oförändrat synligt | Oförändrat synligt |

### Fas 1 — Synlig v2-nav

| Leverans | Förälder | Barn |
|----------|----------|------|
| Nytt primärnav | 5 flikar | 3 världar |
| Bort | Mer, Extra, dubbla källor | classic/magic nav-split |
| Start | Hem | Idag |

### Fas 2 — Hubbar & moduler

| Leverans | Förälder | Barn |
|----------|----------|------|
| Hubbar | `/planning`, `/rewards` | — |
| Modulsplit | — | `child-shell.js` ersätter orchestrator |
| Redirect | `/skattkammaren` → `/rewards` (förälder) | — |

### Fas 3 — Profiler & routes

| Leverans | Förälder | Barn |
|----------|----------|------|
| Barnprofil | `/family/child/:id` | — |
| Routes | — | `/child/today`, `/child/world`, `/child/family` |
| Analytics baseline | 2 veckor före/efter | `child_world_view` |

### Fas 4 — Coach & stöd

| Leverans | Förälder | Barn |
|----------|----------|------|
| Coach | `home-readiness.js` (förälder) | Coach-loop på Idag (barn) |
| Settings | Sanering | — |
| Adaptivt stöd | — | `child-support-layer` |

### Fas 5 — Paket-placements

Nya `CAPABILITIES` / `CHILD_CAPABILITIES` rader. Ingen nav-refaktor.

### Fas 6 — Städning

| Åtgärd |
|--------|
| Permanent redirects |
| Ta bort drawer, `/child-settings`, Extra/Mer |
| Avveckla `child-dashboard.js` som orchestrator (behåll shim) |

### Sprint-översikt (låst ordning)

| Sprint | Fokus | Detaljspec |
|--------|-------|------------|
| 0 | Config | `barnmeny-v2.md` §9, `vuxenmeny-v2.md` §8 |
| 1 | Synlig nav | Båda § Sprint 1 |
| 2 | Hubbar + moduler | Båda § Sprint 2 |
| 3 | Barnprofil + routes | `vuxenmeny-v2.md` § Sprint 3, `barnmeny-v2.md` § Sprint 3 |
| 4 | Settings + coach | Båda § Sprint 4 |
| 5 | Readiness + adaptivt stöd | Båda § Sprint 5 |
| 6+ | Paket + städ | Fas 6–7 |

---

## 11. Redirects (sammanfattning)

| Från | Till | Villkor |
|------|------|---------|
| `/skattkammaren` | `/rewards` | Inloggad förälder |
| `/skattkammaren` | *(oförändrad)* | `?demo=1` eller barnsession |
| `/child-settings` | `/family/child/:id` | Efter fas 3 |
| `/upgrade` | `/settings#prenumeration` | Alltid |
| `/child-dashboard` | `/child/today` | Efter fas 3 (shim under migration) |
| `#schedule` (hash) | `#today` / `/child/today` | Barn hash-fallback |
| `/family-week` | `/schedule?view=family` | Redan live |

Fullständig lista: `vuxenmeny-v2.md` §10, `barnmeny-v2.md` §11.

---

## 12. Acceptanskriterier (v2 klar)

v2 anses **produktionsklar** när alla punkter är uppfyllda:

### Navigation

- [ ] Förälder: en `PRIMARY_NAV`, fem flikar, alla plattformar
- [ ] Barn: en `CHILD_WORLDS`, tre världar, alla plattformar
- [ ] Ingen Mer/Extra/classic-magic-nav-split i produktion
- [ ] Alla redirects fungerar (§11)

### Kärnflöden (röktest)

- [ ] Ny familj: registrera → onboarding → Hem med nästa steg → barn login → Idag → avbocka → stjärna
- [ ] Förälder: Planeringshub → schema → ändring syns på barns Idag
- [ ] Förälder: Belöningshub → belöning → barn ser i Min värld
- [ ] Förälder: För dig fungerar oförändrat (regression — ej v2-leverans)
- [ ] Barn: Parental Gate blockerar vuxenåtgärder
- [ ] Pedagog: oförändrat flöde fungerar
- [ ] Native iOS/Android: tab bar + safe-area

### Mätning

- [ ] Analytics-baseline insamlad före fas 3
- [ ] Barnprofil ≥ 80 % adoption (14 dagar) innan drawer tas bort
- [ ] Inga regressions i Day 14-retention (veckovis kontroll)

### Tekniskt

- [ ] `npm test` grönt
- [ ] `npm run lint` utan nya errors
- [ ] SW version bumpad
- [ ] Inga nya errors i `route-inventory` check

---

## 13. Risker & öppna frågor

| Risk | Sannolikhet | Åtgärd |
|------|-------------|--------|
| `child-dashboard.js` monolit svår att migrera | Hög | `child-shell.js` tidigt (Sprint 2); shim, inte parallell IA |
| Förälder och barn i olika faser förvirrar QA | Medel | Feature-flagg per familj om nödvändigt; tydlig release notes |
| `/skattkammaren`-redirect bryter bokmärken/marknadsföring | Medel | 301 + uppdatera SEO/demo-länkar |
| Barnprofil URL: `slug` vs `id` | Medel | **Beslut krävs Sprint 3** — rekommendation: stabilt `child_id` i URL |
| Analytics otillräcklig för beslut | Medel | Baseline 2 veckor **före** fas 3 |
| Paket-kunder missar nya placements | Låg | Synliggör i hub + Hem, inte ny flik |

### Öppna beslut (kräver produktbeslut)

| # | Fråga | Alternativ | Rekommendation |
|---|-------|------------|----------------|
| D1 | Barnprofil-URL | `/family/child/:id` vs `:slug` | `:id` (stabilt) |
| D2 | Magic view-växlare kvar efter v2? | Behåll tema / ta bort | Behåll som **tema**, inte nav |
| D3 | `child-new.html` | Deprecera nu / senare | Efter barn-routes stabila (fas 3) |
| D4 | Feature-flagg för v2 per familj? | Alla / allowlist | Alla (som magic idag) med `V2_DISABLED` nödstopp |

---

## 14. Versionshistorik

| Version | Datum | Ändring |
|---------|-------|---------|
| 0.1 | 2026-06-26 | Första samlade kravdokument. Syntes av barnmeny-v2, vuxenmeny-v2, IA, paket, tillväxt. |
| 0.2 | 2026-06-26 | För dig markerat som redan levererat; utanför scope för v2-bygge och nästa målgrupp. |
| 0.3 | 2026-06-26 | Platform v1-ramning; länk till `architecture-platform.md` + `VISION-2030.md`. |

---

## 15. Nästa steg (team)

1. **Granska utkast 0.3** — produkt + teknik: bekräfta scope, öppna beslut (§13).
2. **Lås D1–D4** — särskilt barnprofil-URL före Sprint 3.
3. **Skapa tickets** från Fas 0/Sprint 0 i befintliga sprint-planer.
4. **Baslinje analytics** — starta `page_view` för `/child-settings`, `/skattkammaren` innan nav-byte.
5. **Uppdatera detta dokument** till v0.2 efter beslut — inte efter implementation.

========================================================================
KÄLLA: USE_CASES_PLATFORM.md
========================================================================

# Plattform — Use cases (arkiv / volym 2-referens)

> **⚠️ Primär spec:** [`PRODUCT_BEHAVIOR_SPEC.md`](./PRODUCT_BEHAVIOR_SPEC.md) (PBS)  
> Det här dokumentet = äldre UC01–UC12-utkast för PBS06–PBS12. Se mapping i PBS bilaga A.

---

---

## 0. Hur det här dokumentet används

Use cases beskrivs **inte** utifrån funktioner (schema, stjärnor, inställningar) utan utifrån **människans resa** — samma berättelse för barn, ungdom och vuxen, med olika presentation.

| Roll | Användning |
|------|------------|
| **Produkt** | Prioritera generationer; testa beslut mot resan |
| **UX** | Designa per målgrupp utan att skriva om flödet |
| **Utveckling** | Mappa till Core engines — inte till skärmar |
| **Test** | Acceptanskriterier per UC, inte per sida |
| **Ny målgrupp** | Lägg till kolumn i §presentation — inte nytt dokument |

### Standardstruktur (varje UC)

1. Mål  
2. Primär användare  
3. Sekundära användare  
4. Förutsättningar  
5. Normalflöde  
6. Alternativa flöden  
7. Undantag / fel  
8. Affärsregler  
9. Mätetal (KPI)  
10. Presentation: Barn · Ungdom · Vuxen  

### Core engines (referens)

| UC | Primära engines |
|----|-----------------|
| UC01–02 | Identity, Task, Timeline, Coach |
| UC03 | Task (Execution) |
| UC04 | Reward, Progress |
| UC05 | Coach, Progress |
| UC06 | Coach (AI) |
| UC07 | Relationship, Permission |
| UC08 | Relationship, Permission |
| UC09 | Coach, Progress |
| UC10 | Coach, Permission |
| UC11 | Identity, Presentation Profile |
| UC12 | Presentation Profile (Adaptive Experience) |

### Generationsstatus (översikt)

| UC | Gen 1 (barn 4–12) | Gen 2–4 |
|----|-------------------|---------|
| UC01 Komma igång | ✅ Delvis live | Planerat |
| UC02 Planera dagen | ✅ Live | Planerat |
| UC03 Utföra aktivitet | ✅ Live | Planerat |
| UC04 Motivation | ✅ Live | Planerat |
| UC05 Reflektion | ⚠️ Delvis (mood, coach-loop v2) | Planerat |
| UC06 AI Coach | ⚠️ Delvis (För dig förälder; barn-loop v2) | Planerat |
| UC07 Relationer | ✅ Live | Planerat |
| UC08 Delning | ⚠️ Delvis (rapporter, pedagog) | Planerat |
| UC09 Kris / bakslag | ⚠️ Implicit, ej designat | Planerat |
| UC10 Självständighet | ⚠️ Delvis (gradvis PIN, inställningar) | Planerat |
| UC11 Livsövergångar | ❌ Ej byggt | Kärnstrategi |
| UC12 Anpassningsprofil | ⚠️ Delvis (`child_view_config`) | Planerat |

---

## UC01 — Komma igång

### Mål

Användaren ska förstå hur appen fungerar och känna sig trygg inom de första minuterna.

### Primär användare

Den som ska **använda** planeringen dagligen (barn, ungdom eller vuxen).

### Sekundära användare

Vårdnadshavare, pedagog, mentor, partner — den som stödjer uppstarten.

### Förutsättningar

- Konto eller inbjudan finns  
- Minst en grupp/relation kan skapas eller kopplas  
- Device och nätverk tillgängligt  

### Normalflöde

```
1. Konto skapas eller accepteras
2. Första kontext sätts (barn / mål / livsområde)
3. Första plan eller rutin skapas (mall eller coach-guidad)
4. Användaren landar i Execution (Idag)
5. Första uppgiften är synlig och begriplig
```

### Alternativa flöden

| Variant | Flöde |
|---------|-------|
| A1 Inbjuden vuxen | Accepterar invite → ser endast tilldelade medlemmar |
| A2 Befintlig familj, nytt barn | Onboarding-wizard → ny member |
| A3 Återkommande användare, ny enhet | Login → välj profil → Idag |

### Undantag / fel

| Situation | Beteende |
|-----------|----------|
| Tomt standardbibliotek | Coach erbjuder manuell aktivitet — inte tekniskt dödläge |
| Barn utan PIN | Förälder guidas att sätta PIN före barn-login |
| Avbruten onboarding | Hem visar "Nästa steg" (readiness) vid återkomst |

### Affärsregler

- **Framgång UC01** = första planerade dagen är på plats **och** (om execution-användare) första aktiviteten är synlig  
- Gen 1: framgång för barn = **första aktivitet genomförd** (första stjärnan)  
- Onboarding får inte kräva expertkunskap om schema-editor  

### Mätetal (KPI)

| KPI | Gen 1-baslinje | Mål |
|-----|----------------|-----|
| Tid till första synliga uppgift | — | < 5 min efter registrering |
| Onboarding completion rate | — | ↑ |
| Första completion (barn) | 17 % familjer | ↑ (North Star-funnel) |

### Presentation

| | **Barn (4–12)** | **Ungdom (13–17)** | **Vuxen (18+)** |
|--|-----------------|---------------------|-----------------|
| **Vem startar** | Förälder skapar konto, lägger till barn, väljer schema | Ungdom skapar själv eller med vuxen | Vuxen väljer livsområde själv |
| **Exempel mål** | Förskola/skola-mall | "Komma ivåg till skolan", "Plugga 30 min" | Morgon, Arbete, Hem, Hälsa, ADHD-stöd |
| **Inloggning** | PIN, visuell barnväljare | Eget konto | E-post / Apple |
| **Landning** | Idag — ett steg i taget | Idag — kort plan | Idag — prioriterad lista |
| **Framgång** | Första aktivitet genomförd | Första dagen planerad | Första rutinen skapad |
| **Ton** | Lekfull, trygg, få val | Personlig, inte barnslig | Effektiv, respektfull |

---

## UC02 — Planera dagen

### Mål

Användaren (eller stödperson) har en tydlig bild av vad dagen innehåller — utan kognitiv överbelastning.

### Primär användare

Den som **ska utföra** — eller i Gen 1 barn: den som **ska förstå** planen.

### Sekundära användare

Förälder, partner, pedagog — planerar åt eller tillsammans med.

### Förutsättningar

- Minst en aktivitet eller mall finns  
- Execution Engine har tillgång till dagens `daily_log`  

### Normalflöde

```
1. Öppna planeringsyta (förälder) eller Idag (executor)
2. Se dagens uppgifter i ordning (Timeline: NU / NÄSTA / SEN)
3. Vid behov: justera, pausa, lägg till
4. Executor ser uppdaterad plan utan att navigera "schema"
```

### Alternativa flöden

| Variant | Flöde |
|---------|-------|
| A1 Förälder planerar, barn tittar | Planering hub → barn ser Idag |
| A2 Specialdag / ledig dag | Override utan att radera veckoschema |
| A3 Coach-förslag | "Vill du lägga till kvällsrutin?" → ett klick |

### Undantag / fel

| Situation | Beteende |
|-----------|----------|
| Tom dag | Coach: "Vill du kopiera igår?" — inte tom canvas |
| För många uppgifter | Visa max 5 i Execution; resten dold men planerad |

### Affärsregler

- Planering äger **Task + Timeline** engines — inte Execution UI  
- Barn ska inte behöva förstå veckoschema för att använda dagen  
- Ändringar i plan ska synas på barns Idag inom samma session (eller vid refresh)  

### Mätetal (KPI)

| KPI | Mål |
|-----|-----|
| Andel dagar med ≥1 planerad uppgift | ↑ |
| Tid från öppna app → förstå "vad nu" | < 10 s (barn) |

### Presentation

| | **Barn** | **Ungdom** | **Vuxen** |
|--|----------|------------|-----------|
| **Planerar** | Förälder | Tillsammans med coach | Själv (+ coach) |
| **Ser plan** | Barn (Idag) | Ungdom (Idag) | Vuxen (Idag/Tasks) |
| **Coach-fråga** | — | "Vad vill du hinna idag?" | "Du har tre viktiga uppgifter. Vilken börjar du med?" |
| **UI** | Bilder, sektioner FM/EM | Tidslinje, mörkt läge | Prioriterad lista, block |

---

## UC03 — Utföra aktivitet

### Mål

Användaren genomför en uppgift från start till bekräftelse och vet vad som kommer härnäst.

**Det här är kärnan i plattformen.**

### Primär användare

Executor (member).

### Sekundära användare

Stödperson som kan bocka av åt (förälder), eller endast observera.

### Förutsättningar

- Uppgift finns i dagens logg  
- Användaren har åtkomst till Execution (Idag)  

### Normalflöde

```
Aktivitet → Start → Utför → Bekräfta → Nästa

1. NU-uppgift visas
2. (Valfritt) Delsteg (sub_steps) expanderas
3. Användaren markerar klar
4. Execution Engine: complete event
5. Coach: kort bekräftelse
6. NÄSTA uppgift blir NU
```

### Alternativa flöden

| Variant | Flöde |
|---------|-------|
| A1 Delsteg | Bocka delsteg → sedan huvudaktivitet |
| A2 Förälder bockar åt barn | Samma API, attribution `completed_by` |
| A3 Retroaktiv | Completion med `completed_date` ≠ idag |

### Undantag / fel

| Situation | Beteende |
|-----------|----------|
| Offline | Kö lokalt → synka vid uppkoppling |
| Dubbelklick | Idempotent completion |
| PIN-fel (barn) | Låsning enligt `pin_lockout` |

### Affärsregler

- **En motor** — samma `POST complete` oavsett presentation  
- Max synliga uppgifter i Execution: 5 (barn NPF-princip)  
- Bekräftelse ska leda till **nästa steg** — inte till meny  

### Mätetal (KPI)

| KPI | Mål |
|-----|-----|
| Completions per aktiv användare / dag | ↑ |
| Tid från login → första completion | < 60 s (barn) |
| Andel uppgifter med delsteg använda | Kvalitativ (NPF) |

### Presentation

| | **Barn** | **Ungdom** | **Vuxen** |
|--|----------|------------|-----------|
| **Exempel** | "Borsta tänder" | "Lägg mobilen i väskan" | "Skicka fakturan" |
| **UI** | Stort kort, emoji, +⭐ teaser | Kompakt, swipe/check | Checkbox, tidsestimat |
| **Bekräftelse** | "Bra jobbat! 🎉" | Kort, neutral | Minimal eller inget firande |
| **Motor** | Identisk | Identisk | Identisk |

---

## UC04 — Motivation

### Mål

Användaren upplever att ansträngning leder till meningsfull progression — på sitt sätt.

### Primär användare

Executor.

### Sekundära användare

Stödperson som sätter belöningar (Gen 1 förälder).

### Förutsättningar

- Reward Engine kopplad till completion  
- Progress-yta tillgänglig (andra fliken / världen)  

### Normalflöde

```
Completion → progress_delta → Progress-yta uppdateras → (valfritt) inlösen / unlock
```

### Alternativa flöden

| Variant | Flöde |
|---------|-------|
| A1 Långsiktigt mål | Teaser på Idag → full vy i Progress |
| A2 Familjeprojekt | Delad kista (Relationship + Progress) |
| A3 Ingen gamification (vuxen profil) | Endast progressbar / mål % |

### Undantag / fel

| Situation | Beteende |
|-----------|----------|
| Belöning slut | Coach föreslår ny — inte tom butik |
| Överbelöning (förälder) | Valfri mjuk varning — inte block |

### Affärsregler

- **Samma Reward Engine** — tre (eller fler) presentationer  
- Progress-yta får inte konkurrera med Execution som startpunkt  
- Gamification-nivå styrs av `PresentationProfile` + UC12  

### Mätetal (KPI)

| KPI | Mål |
|-----|-----|
| Andel completions följt av Progress-besök | Kvalitativ |
| Reward redemption rate | ↑ (barn) |
| Retention efter första belöning | ↑ |

### Presentation

| | **Barn** | **Ungdom** | **Vuxen** |
|--|----------|------------|-----------|
| **Enhet** | ⭐ Stjärnor | XP | Progress % |
| **Yta** | Skattkammaren / Min värld | Level, achievements | Mål, vanor |
| **Belöning** | Glass, utflykt (förälderset) | Privilegium, speltid | Månadsmål, vane-streak |
| **Kedja** | ⭐ → Skatt → Glass | XP → Level → Achievement | Progress → Mål → Vana |

---

## UC05 — Reflektion

### Mål

Användaren (eller stödperson) pausar och ser tillbaka — utan skam — för att lära av dagen.

### Primär användare

Executor; Gen 1 barn: ofta guidad av coach-text.

### Sekundära användare

Förälder (ser sammanfattning), pedagog (anteckningar).

### Förutsättningar

- Minst en completion eller avslutad sektion  
- Coach eller mood-UI tillgänglig  

### Normalflöde

```
1. Trigger: dag klar / sektion klar / kväll
2. Coach ställer reflektionsfråga
3. (Valfritt) Svar: mood, kort text, emoji
4. Data sparas för Progress / rapporter — inte straff
```

### Alternativa flöden

| Variant | Flöde |
|---------|-------|
| A1 Hoppa över | Alltid tillåtet — ingen skam-copy |
| A2 Förälder-initierad | Rapportvy → veckosammanfattning |

### Undantag / fel

| Situation | Beteende |
|-----------|----------|
| Barn vill inte svara | Frågan försvinner — ingen nagging |

### Affärsregler

- Reflektion är **opt-in**  
- Inga negativa poäng för "dålig dag"  
- Barndata: GDPR och föräldrainsyn enligt Permission Engine  

### Mätetal (KPI)

| KPI | Mål |
|-----|-----|
| Mood/reflection completion rate | Kvalitativ |
| Korrelation reflection → nästa dags completion | Analys |

### Presentation

| | **Barn** | **Ungdom** | **Vuxen** |
|--|----------|------------|-----------|
| **Coach** | "Vad gick bra idag?" + bilder | "Vad gjorde att du kom igång?" | "Vilka uppgifter gav dig mest energi?" |
| **Input** | Emoji, enkel skala | Kort text valfritt | Tagga uppgifter / energinivå |
| **Placering** | Efter sektion / dag | Idag eller kvällspush | Veckosammanfattning |

---

## UC06 — AI Coach

### Mål

Användaren får rätt stöd vid rätt tillfälle — inte en chatbot som konkurrerar med handling.

### Primär användare

Den som behöver guidning (varierar per UC12-profil).

### Sekundära användare

— (coach är system/agent).

### Förutsättningar

- Task, Progress, Timeline data tillgänglig  
- `PresentationProfile` sätter ton och längd  

### Normalflöde

```
1. Trigger: post-activity, planering, mönster detekterat, bakslag
2. Coach genererar kort förslag (1–3 meningar)
3. CTA: en primär handling ("Nästa steg", "Prova kortare start")
4. Användaren accepterar eller dismissar
```

### Alternativa flöden

| Variant | Flöde |
|---------|-------|
| A1 Förälder (Gen 1) | För dig — problemorienterade paket (levererat) |
| A2 Proaktiv | "Du skjuter ofta upp X" — endast med samtycke |

### Undantag / fel

| Situation | Beteende |
|-----------|----------|
| AI otillgänglig | Statiska coach-templates — inte tom UI |
| Fel förslag | Dismiss + ingen upprepning samma dag |

### Affärsregler

- Coach leder **alltid** tillbaka till Execution eller Planering — aldrig till meny |
- Ton ska matcha profil (UC12) — inte ålder ensam  
- Gen 1: För dig = förälder-coach; barn-coach-loop = v2  

### Mätetal (KPI)

| KPI | Mål |
|-----|-----|
| `readiness_action_click` / coach CTA rate | ↑ |
| Dismiss rate (skalad per trigger) | Balans |

### Presentation

| | **Barn** | **Ungdom** | **Vuxen** |
|--|----------|------------|-----------|
| **Exempel** | "Bra jobbat! Nu är det dags för nästa steg." | "Du verkar fastna innan plugget. Ska vi testa en kortare start?" | "Du skjuter ofta upp uppgifter efter lunch. Flytta till förmiddagen?" |
| **Längd** | Mycket kort | Medium | Konkret, datadriven |
| **Placering** | Efter aktivitet (Idag) | Idag + notis | Hem + veckovy |

---

## UC07 — Relationer

### Mål

Användaren vet vem som finns i sitt stödnätverk och vad varje person får se/göra.

### Primär användare

Member (executor) eller gruppskapare (förälder/vuxen).

### Sekundära användare

Alla inbjudna roller.

### Förutsättningar

- Relationship + Permission engines  
- `parent_child` / invite-modell (Gen 1)  

### Normalflöde

```
1. Skapa eller gå med i grupp
2. Bjud in med roll (guardian, shared, pedagog, mentor…)
3. Inbjuden accepterar → begränsad åtkomst enligt roll
4. Executor ser "Mina personer" / Network
```

### Alternativa flöden

| Variant | Flöde |
|---------|-------|
| A1 Pedagog | Endast tilldelade barn, `source=educator` data |
| A2 Separerad vårdnad | Olika vuxna ser olika barn |

### Undantag / fel

| Situation | Beteende |
|-----------|----------|
| Invite expired | Tydligt fel + ny inbjudan |
| Revoked access | Omedelbar 403 — ingen läcka |

### Affärsregler

- **Samma Permission Engine** — olika rollmatriser per generation  
- Executor ska inte se administrativ komplexitet  
- Integritet ökar med ålder (UC10)  

### Mätetal (KPI)

| KPI | Mål |
|-----|-----|
| Co-parent invite acceptance | ↑ |
| Pedagog-linked families active | Kvalitativ |

### Presentation

| | **Barn** | **Ungdom** | **Vuxen** |
|--|----------|------------|-----------|
| **Nätverk** | Föräldrar, pedagog, morföräldrar | Föräldrar, mentor, kurator | Partner, coach, psykolog, chef (valfritt) |
| **UI** | Mina personer — trygghet | Mina personer — integritet | Mitt nätverk — professionellt |
| **Barns syn** | Vem hjälper mig | Vem jag valt dela med | — |

---

## UC08 — Delning

### Mål

Rätt information delas med rätt person — med samtycke och tydliga gränser.

### Primär användare

Den som äger datan (executor eller guardian beroende på ålder).

### Sekundära användare

Mottagare (pedagog, terapeut, partner).

### Förutsättningar

- Permission Engine  
- Rapport/share-link eller inbyggd rollåtkomst  

### Normalflöde

```
1. Välj vad som delas (framsteg, period, fält)
2. Välj mottagare eller generera säker länk
3. Mottagare ser read-only vy
4. (Valfritt) Återkalla
```

### Alternativa flöden

| Variant | Flöde |
|---------|-------|
| A1 Pedagog | Inbyggd åtkomst via invite — inte export |
| A2 Professionell rapport | PIN-skyddad länk, 7 dagar |

### Undantag / fel

| Situation | Beteende |
|-----------|----------|
| Delning utan samtycke (teen+) | Blockerat |

### Affärsregler

- Barn: förälder kan dela inom rimliga gränser  
- Ungdom: **opt-in** per delning  
- Vuxen: delar mål/statistik — inte rå journal utan explicit val  

### Mätetal (KPI)

| KPI | Mål |
|-----|-----|
| Share link usage (pedagog/rapporter) | Kvalitativ |
| Teen opt-in rate | — (Gen 2) |

### Presentation

| | **Barn** | **Ungdom** | **Vuxen** |
|--|----------|------------|-----------|
| **Vem delar** | Förälder | Ungdomen själv | Vuxen själv |
| **Vad** | Framsteg, schema-sammanfattning | Valda mål | Mål, statistik — inte allt |
| **Gen 1** | Rapporter, pedagogvy | — | — |

---

## UC09 — Kris / bakslag

### Mål

När rutinen brister ska användaren kunna återuppta utan skam, bestraffning eller "nollställning" av identitet.

### Primär användare

Executor.

### Sekundära användare

Coach, stödperson.

### Förutsättningar

- Detekterat gap (missad dag/vecka) eller explicit "jag har tappat"  
- Coach Engine med **restorative** ton  

### Normalflöde

```
1. System eller användare markerar bakslag
2. Ingen negativ poäng / streak-straff som default
3. Coach: låg tröskel tillbaka
4. Ett litet steg idag → Execution
```

### Alternativa flöden

| Variant | Flöde |
|---------|-------|
| A1 Förälder orolig | Hem visar "börja om lugnt" — inte alarm |
| A2 Lång frånvaro | Historik bevaras; plan återställs utan radering |

### Undantag / fel

| Situation | Beteende |
|-----------|----------|
| Användare vill radera historik | GDPR-radering — separat flöde |

### Affärsregler

- **Aldrig** skambaserad copy ("Du misslyckades")  
- Streaks får pausas — inte alltid nollställas  
- Detta UC är ofta **underspecificerat** i Gen 1 — ska designas explicit  

### Mätetal (KPI)

| KPI | Mål |
|-----|-----|
| Return rate efter 7+ dagars inaktivitet | ↑ |
| Completion inom 24 h efter coach "börja om" | ↑ |

### Presentation

| | **Barn** | **Ungdom** | **Vuxen** |
|--|----------|------------|-----------|
| **Miss** | En dag | En vecka | Tappad rutin |
| **Coach** | "Vi börjar om." | "Ska vi börja med en enda uppgift idag?" | "Vi återställer planen utan att radera historiken." |
| **UI** | Samma Idag — inga röda varningar | Diskret | Fokus på nästa steg |

---

## UC10 — Självständighet

### Mål

Användaren behöver allt mindre stöd från appen och stödpersoner — appen är en stege, inte ett krycka.

> Målet är inte mer användning. Målet är att användaren ska behöva appen **mindre**.

### Primär användare

Executor (växer över tid).

### Sekundära användare

Guardian — gradvis minskad insyn.

### Förutsättningar

- Permission Engine med integritetsnivåer  
- UC12-profil kan skifta från Guidad → Självständig  

### Normalflöde

```
1. Börja med hög guidning (100 % hjälp)
2. Vid mognad / ålder / val: minska prompts, delning, föräldrakontroll
3. Mät "hjälpgrad" ner över tid — inte DAU upp
```

### Alternativa flöden

| Variant | Flöde |
|---------|-------|
| A1 NPF-vuxen | Kan stanna på Stöttad — inte "växa ut" som krav |
| A2 Tonåring tar över konto | Guardian → observer |

### Undantag / fel

| Situation | Beteende |
|-----------|----------|
| Förälder vill full insyn (teen) | Policy + produktbeslut — default integritet |

### Affärsregler

- Självständighet är **success metric** — inte churn  
- Gen 1: delvis via föräldrastyrda inställningar  
- Gen 2+: explicit integritetsnivå per relation  

### Mätetal (KPI)

| KPI | Mål |
|-----|-----|
| Hjälpgrad-index (intern) | ↓ över livscykel |
| Teen self-completion utan förälder | ↑ |
| NPS hos användare i "Självständig" profil | ↑ |

### Presentation

| | **Barn** | **Ungdom** | **Vuxen** |
|--|----------|------------|-----------|
| **Hjälp** | ~100 % (vuxen planerar) | ~50 % | ~10 % |
| **Insyn** | Förälder ser allt | Sammanfattning | Endast delat |
| **Coach** | Varje steg | Vid fastnar | Vid mönster |

---

## UC11 — Livsövergångar

### Mål

När användarens liv förändras ska plattformen **växa med** — inte tvinga omstart.

### Primär användare

Member genom hela livscykeln (strategiskt).

### Sekundära användare

Guardians som gradvis lämnar över.

### Förutsättningar

- Identity Engine med kontinuerlig historik  
- `PresentationProfile` kan bytas utan nytt konto  
- Data migreras — inte kastas  

### Normalflöde

```
Barn → mellanstadie → högstadiet → gymnasium → universitet → jobb → eget hushåll

Vid varje steg:
1. Erbjud uppdaterad profil / målmallar
2. Behåll historik (Progress)
3. Justera Relationer och Permission
4. Uppdatera nav-etiketter — inte engines
```

### Alternativa flöden

| Variant | Flöde |
|---------|-------|
| A1 Ny app-installation | Samma konto — all data kvar |
| A2 Parallellt barn + vuxen | Samma person, två roller över tid |

### Undantag / fel

| Situation | Beteende |
|-----------|----------|
| Användare vill "börja om" visuellt | Reset presentation — behåll valfri historik |

### Affärsregler

- **Kärnstrategi för plattformen** — differensiator mot engångs-barnappar  
- Profilbyte ska vara one-click + coach-förklaring  
- Marketing får inte lova "app för barn" utan "växer med dig" om UC11 är sant  

### Mätetal (KPI)

| KPI | Mål |
|-----|-----|
| Retention vid profilbyte (12→13 år) | ↑ vs benchmark churn |
| Multi-year account age | ↑ |

### Presentation

| Steg | Förändring |
|------|------------|
| 4–12 | CHILD — Idag, Min värld, Mina personer |
| 13–17 | TEEN — samma slots, ny ton + integritet |
| 18–30 | YOUNG_ADULT — mål, vanor |
| 30+ | ADULT — network, growth |

---

## UC12 — Anpassningsprofil (Adaptive Experience)

### Mål

Plattformen anpassar **mängd stöd** — inte bara ålder. En 30-åring med ADHD och en 12-åring kan behöva liknande guidning med olika presentation.

### Primär användare

Alla executors.

### Sekundära användare

Guardian, terapeut (kan rekommendera profil).

### Förutsättningar

- `adaptive_profile` (eller härledd) i member config  
- Styr: steg-visning, coach-frekvens, gamification, påminnelser  

### Profiler

| Profil | Typisk användare | Upplevelse |
|--------|------------------|------------|
| **Guidad** | Yngre barn, hög support | Mycket visuellt, ett steg i taget, tydliga belöningar |
| **Stöttad** | Tonåring eller vuxen med stort stödbehov | Coach, struktur, påminnelser, delmål |
| **Självständig** | Ung vuxen / vuxen | Mål, vanor, reflektion, minimal guidning |

### Normalflöde

```
1. Default profil vid onboarding (ålder + valfri "jag behöver extra stöd")
2. Profil styr UC03–UC06 presentation
3. (Valfritt) Profil ändras över tid (kopplat till UC10)
```

### Alternativa flöden

| Variant | Flöde |
|---------|-------|
| A1 Terapeut sätter Stöttad | Guardian-godkännande |
| A2 Auto-förslag | "Vill du prova färre påminnelser?" |

### Undantag / fel

| Situation | Beteende |
|-----------|----------|
| Profil för hög/svår | Användare kan alltid be om mer stöd |

### Affärsregler

- **Ålder ≠ profil** — 30-åring kan vara Guidad/Stöttad  
- Profil styr presentation — inte access till features (det är paket)  
- Gen 1: delvis `child_view_config`, TEACCH, `show_now_next`  

### Mätetal (KPI)

| KPI | Mål |
|-----|-----|
| Completion rate per profil | Balanserad — inte bara Självständig |
| Profil-switch satisfaction | Kvalitativ |

### Presentation

| Dimension | Guidad | Stöttad | Självständig |
|-----------|--------|---------|--------------|
| Steg i taget | Alltid | Vid behov | Sällan |
| Coach | Efter varje steg | Vid mönster | Veckovis |
| Belöning | Hög | Medium | Låg / progress |
| Nav komplexitet | Minimal | Medium | Full |

---

## Bilaga A — Use case → Platform v1 (Gen 1 leverans)

| UC | Platform v1 fokus |
|----|-------------------|
| UC01 | Onboarding + readiness på Hem |
| UC02 | Planeringshub + Idag |
| UC03 | Execution (Idag) + coach-loop |
| UC04 | Belöningshub + Min värld |
| UC05 | Mood + coach-loop (begränsat) |
| UC06 | För dig (förälder, klar); barn-coach v2 |
| UC07 | Familj-flik + pedagog |
| UC08 | Rapporter (delvis) |
| UC09 | **Designa** — ej live |
| UC10 | Inställningar — delvis |
| UC11 | Dokumentera — `PresentationProfile` i config |
| UC12 | `child_view_config` + TEACCH — utöka |

---

## Bilaga B — Testscenarier (kort)

Varje UC ska ha minst ett **röktest per generation** när den generationen lanseras.

| UC | Gen 1 röktest |
|----|---------------|
| UC01 | Registrera → onboarding → barn login → första completion |
| UC02 | Ändra schema → syns på barns Idag |
| UC03 | Bocka av med delsteg → nästa NU |
| UC04 | Stjärna → syns i Min värld |
| UC09 | Simulera 7 dagars gap → coach-copy (när implementerat) |

---

## Versionshistorik

| Version | Datum | Ändring |
|---------|-------|---------|
| 0.1 | 2026-06-26 | Första utkast. UC01–UC12 med universell struktur. |

========================================================================
KÄLLA: barnmeny-v2.md
========================================================================

# Barnmeny v2 — nuläge & informationsarkitektur

> **Syfte:** Teamreferens för barnsidans navigation. Del 1 dokumenterar **hur det ser ut idag**. Del 2 är **låst målarkitektur** och inkrementell migration — parallellt med [`vuxenmeny-v2.md`](./vuxenmeny-v2.md).
>
> **Status:** Del 1 = nuläge · Del 2 = låst arkitektur · implementation pågår inkrementellt  
> **Relaterat:** [`vuxenmeny-v2-operations-checklist.md`](./vuxenmeny-v2-operations-checklist.md) (KX-rader, acceptance) · [`informationsarkitektur-barnapp.md`](./informationsarkitektur-barnapp.md) · [`separation-contract-barnapp.md`](./separation-contract-barnapp.md) · [`engineering-architecture-barnapp.md`](./engineering-architecture-barnapp.md) · [`component-feature-map.js`](../config/component-feature-map.js)
>
> **Senast uppdaterad:** 2026-06-21 (Del 2 låst; nit-fix: paths, PG, a11y)

---

# Del 1 — Hur det ser ut idag

## 1. Översikt: en sida, många navigationslager

Barnupplevelsen är i praktiken **en SPA** på `/child-dashboard` med tab-state — inte separata routes per flik (utom hash-alias via `child-layer-router.js`).

```
Inloggning                    Huvudapp                         Publika sidor
─────────                    ────────                         ─────────────
/child-login  ──────────►  /child-dashboard                  /skattkammaren (demo, ej inloggad)
     │                            │
     │                            ├── Klassisk vy (default)
     │                            └── Magic / ny design (feature-flaggad)
     │
DeviceMode=child + session-gate blockerar föräldraroutes
```

**Kärnfil:** `public/child-dashboard.html` + `public/js/child-dashboard.js` (~2 700 rader logik).

---

## 2. Inloggningsflöde

| Steg | Route | Vad som händer |
|------|-------|----------------|
| 1 | `/child-login` | Barnväljare (kända barn från `localStorage` + ev. `/api/auth/login-picker-children`) |
| 2 | PIN | `POST /api/auth/child-login` |
| 3 | Redirect | `/child-dashboard` |

**Övriga ingångar:**

- Förälder på dashboard → "Barnet loggar in" → `/child-login` (`dashboard-child-handoff.js`)
- `DeviceMode.enterChild()` + `session-gate.js` → föräldrasidor redirectar till `/child-login`
- `Auth.redirectToDashboard()` → `type === 'child'` → `/child-dashboard`

**Filer:** `public/js/child-login.js`, `public/js/session-gate.js`, `public/js/device-mode.js`

---

## 3. Två helt olika nav-upplevelser (klassisk vs magic)

Barnets UI styrs av `AppViewMode` (`public/js/app-view-mode.js`) — samma vyväxlare som föräldrar, men med `initChild()` och per-barn `view_mode` i DB (`classic` | `new` → magic).

| | **Klassisk vy** (default) | **Magic / ny design** |
|--|---------------------------|------------------------|
| Aktivering | `magic_view_enabled` + förälder/barn valt "Ny design" | |
| Primärnav | **Toppflikar** (`#childLayerNav`) | **Bottenflikar** (`#childBottomNav`) |
| Startflik | ☀️ **Idag** (`schedule`) | 🏠 **Hem** (`home`) |
| Bottennav | Dolt | Synligt |
| Hem-hub | Finns inte som flik | `homeView` + `ChildSkattHouse.mountHome()` |

```js
// child-dashboard.js — applyChildViewMode()
if (childUiMagic) {
  showTab('home');
} else {
  showTab('schedule');  // klassisk start
}
```

**Konsekvens:** Dokumentation och test måste täcka **båda** lägen. De flesta nya mockup-komponenter (Hem-flik, bottennav, universum-hub) är **magic-only**.

---

## 4. Navigationslager idag (överlappande)

Barnappen har **flera parallella nav-system** som delvis duplicerar varandra:

| System | Fil | När aktiv |
|--------|-----|-----------|
| **Bottennav (4 flikar)** | `child-dashboard.html` `#childBottomNav` | Magic vy |
| **Legacy toppnav (3 flikar)** | `#childLayerNav` | Klassisk vy |
| **Package nav (2 flikar)** | `child-package-nav.js` | `rollout_mode !== 'off'` — döljer Hem/Mer, byter etiketter |
| **Layer router (hash)** | `child-layer-router.js` | `#home`, `#today`, `#universe`, `#family`, `#more` |
| **Idag-fokus** | `child-today-focus.js` | Döljer veckonav/progress i Idag-läge |

### 4.1 Bottennav — magic (4 flikar)

```
🏠 Hem          → showTab('home')      → #homeView
📅 Schema       → showTab('schedule')  → #scheduleView  (+ todayFocusMount)
💎 Skattkammaren → showTab('rewards')   → #rewardsView
⋯ Mer           → showTab('more')       → #moreView
```

**Familj** har ingen egen flik — nås via Mer eller (klassisk) egen toppflik.

### 4.2 Legacy toppnav — klassisk (3 flikar)

```
☀️ Idag              → schedule
💎 Skattkammaren     → rewards
🏡 Familj            → family
```

Ingen Hem-flik. Ingen Mer-flik (logout/dark mode i header istället).

### 4.3 Package nav — vid rollout (2 flikar)

När `fetchPackageAccess().rollout_mode !== 'off'`:

```js
// child-package-nav.js
// Döljer: tabHome, tabMore, tabFamilyLegacy
// tabSchedule → etikett "Idag" ☀️
// tabRewards  → etikett "Skatt"
```

TEACCH **NU**-overlay döljer nav helt: `ChildPackageNav.setNavHidden(true)`.

### 4.4 Mer-menyn (magic only)

```
#moreView
├── 🏡 Familj        → showTab('family')
├── 👤 Byt barn      → switchChildMember()
├── 🌙 Mörkt läge
└── 🚪 Logga ut
```

**"Mer"** är skräplåda för familj + system — samma anti-mönster som förälderns gamla nav.

---

## 5. Vyer inuti `/child-dashboard` (tab → DOM)

Allt är `display: none/block` via `showTab()` — inte egna URL:er (hash är kosmetiskt).

| Tab-nyckel | DOM-container | Produktlager | Syfte idag |
|------------|---------------|--------------|------------|
| `home` | `#homeView` | Hem-hub (magic) | Teaser till skatt/universum via `ChildSkattHouse.mountHome` |
| `schedule` | `#scheduleView` | **Idag / handling** | Dagens aktiviteter, bocka av, veckonav (klassisk) |
| `rewards` | `#rewardsView` | **Skattkammaren / mening** | Stjärnor, mål, belöningar, universum |
| `family` | `#familyView` | **Familj / relation** | Familjehallen V0 (`child-family-hall.js`) |
| `more` | `#moreView` | System | Genvägar + logout |

### 5.1 Idag / Schema (`scheduleView`)

**Mental modell i kod:** `schedule` = Idag (inte veckoplanering som föräldern).

Innehåll:

- Aktivitetslista per dag (`view_type`: `day_sections` | `week_columns` | …)
- Veckoflikar / `weekNavDetails` (klassisk — doldes delvis av `child-today-focus.js`)
- Progress-ring i header (`childHeaderRing`) — dold i today-focus-läge
- Mood-rating modal efter aktivitet (`show_mood_rating` per barn)
- TEACCH: `child-seven-questions.js` **NU**-kort med döljd nav

**Filer:** `child-dashboard.js`, `child-today-focus.js`, `child-today-tasks.js`, `child-seven-questions.js`

### 5.2 Hem (`homeView`) — endast magic

- Laddar samma reward/universe-data som Skattkammaren
- `ChildSkattHouse.mountHome(homeHubMount, …)` — förenklad hub/ingress till universum
- Default vid magic-login (`applyChildViewMode`)

**Otydlighet:** Hem och Skattkammaren delar data och känsla — risk för "två hem" (noterat i `informationsarkitektur-barnapp.md` §8).

### 5.3 Skattkammaren (`rewardsView`)

Två renderingsvägar:

1. **Universum (magic + `ChildSkattHouse`):** rum-hub med unlocks (`child-skatt-house.js`)
2. **Klassisk banner-layout:** `renderSkattkammaren()` i `child-dashboard.js` (önskelista, historik, butik)

#### Rum i universum-hubben (`BASE_ROOMS`)

| Rum | ID | Unlock (typiskt) |
|-----|-----|------------------|
| Stjärnkistan | `chest` | Alltid |
| Drömvägg | `dreams` | Alltid |
| Troférum | `trophy` | 10⭐ livstid |
| Belöningshylla | `shelf` | 10⭐ |
| Samlingar | `collections` | 30⭐ |
| Historiebok | `story` | 30⭐ |
| Min avatar | `avatar` | 15⭐ |
| Husdjur | `pet` | 50⭐ |
| Museum | `museum` | 100⭐ |
| Butiken | `shop` | Alltid |

Navigation inuti skatt: **hub → rum → tillbaka** (`showRoom` / `showHub`) — ingen bottennav-ändring.

**Teman:** 🏰 Slott · 🌳 Trädkoja · 🚀 Rymden

**Filer:** `child-skatt-house.js`, `child-universe-client.js`, `child-avatar.js`, `child-collections.js`, `child-achievements.js`, `child-pet.js`, `child-museum.js`, `child-dashboard-warmth.js`

### 5.4 Familj (`familyView`) — Familjehallen V0

```
🏡 Familjehallen
├── ⭐ Familjeskista (aggregerade stjärnor)
├── 🎯 Familjeprojekt (tom om inga)
└── 📖 Familjens berättelse (event-feed)
```

Read-only från `GET /api/me/family`. Ingen checklista här (separation contract).

**Tillgång:**

- Klassisk: egen toppflik **Familj**
- Magic: via **Mer → Familj** (ingen bottenflik)

**Filer:** `child-family-hall.js`, `child-family-client.js`

---

## 6. Hash-routing (kosmetisk)

`child-layer-router.js` mappar hash → tab:

| Hash | Tab | Layer-namn |
|------|-----|------------|
| `#home` / `#hem` | `home` | home |
| `#today` / `#idag` / `#schedule` | `schedule` | today |
| `#universe` / `#skattkammaren` / `#rewards` | `rewards` | universe |
| `#family` / `#familj` | `family` | family |
| `#more` / `#mer` | `more` | more |

Sätter `data-child-layer` på `<html>`. **Ingen** server-side route per flik.

---

## 7. Header & system (utanför flikar)

I `#childHeader` (klassisk, alltid synlig):

| Element | Funktion |
|---------|----------|
| Barnnamn + datum | Identitet |
| Progress-ring | Dagens % (dold i today-focus) |
| Vyväxling | Dagsvy ↔ veckovy (`toggleViewType`) |
| Utskrift | `printBtn` |
| Mörkt läge | `toggleChildDarkMode` |
| Logga ut | `childLogout()` → `/child-login` eller förälder |

I **magic** ligger logout/dark mode även under **Mer**.

**Minimal UI** (`minimal_ui` / TEACCH): döljer print/dark/logout; Skattkammaren kan heta "Be om hjälp".

---

## 8. Feature-flaggor & paket (basic idag)

Barnens grundloop (`basic_app`) inkluderar:

- Idag/schema, stjärnor, belöningar, skattkammaruniversum, barninloggning

**Inte live för de flesta användare** (men kod finns):

| Paket | Barnsynlig kod | Nav-påverkan |
|-------|----------------|--------------|
| `teacch` | `child-seven-questions.js`, `child-read-aloud.js` | NU-overlay, dölj nav |
| `rollout_mode` | `child-package-nav.js` | 2-fliksnav |
| `parent_home_magic` / magic view | `AppViewMode` | Bottennav vs toppnav |

---

## 9. Mental karta vs faktisk navigation

`informationsarkitektur-barnapp.md` beskriver **tre lager**:

```
Idag (handling) → Skattkammaren (mening) → Familj (relation)
```

**Faktisk navigation idag:**

```
                    KLASSISK                    MAGIC
                    ────────                    ─────
Primär            Idag | Skatt | Familj     Hem | Schema | Skatt | Mer
                         │                      │       │
Idag/Handling      scheduleView              scheduleView (+ today-focus)
Mening             rewardsView               homeView + rewardsView  ← dubbel ingress
Relation           familyView                familyView (via Mer)
System             header-knappar            moreView
```

---

## 10. Kända friktioner (varför v2 behövs)

| Problem | Manifestation |
|---------|----------------|
| **Två nav-paradigm** | Toppflikar vs bottenflikar beroende på vy-flagga |
| **"Schema" för barn** | Fliken heter Schema men meningen är Idag/uppdrag |
| **Mer-flik** | Familj, byt barn, tema, logout — samma anti-mönster som förälder |
| **Två "hem"** | `homeView` och `rewardsView` konkurrerar i magic |
| **Familj gömd** | I magic bara under Mer — relationlagret svårt att hitta |
| **Rollout 2-flik** | Tredje nav-variant när paket-intresse är på |
| **Ingen barnprofil-route** | Allt på en HTML-sida; svårt att deep-linka "Astrids framsteg" |
| **Produkt vs barn-intent** | Namn som Schema, Skattkammaren, Mer är system/språk — inte barnets fråga |

**Mognad (uppskattning, team 2026-06 — ingen automatisk mätning):**

| Lager | Mognad | Nav-tydlighet |
|-------|--------|----------------|
| Skattkammaren / Min värld | ~85% | Många rum — intern hub fungerar |
| Idag | ~60% | today-focus hjälper men veckonav/header kvar i klassisk |
| Familj / Mina personer | ~5% | Live men svår att hitta i magic |

---

## 11. Filer — snabbreferens

| Område | Filer |
|--------|-------|
| Huvudsida | `public/child-dashboard.html`, `public/js/child-dashboard.js` |
| Tab/hash | `public/js/child-layer-router.js` |
| Bottennav rollout | `public/js/child-package-nav.js` |
| Idag-fokus | `public/js/child-today-focus.js` |
| Skatt/universum | `public/js/child-skatt-house.js`, `child-universe-client.js` |
| Familj | `public/js/child-family-hall.js` |
| Inloggning | `public/child-login.html`, `public/js/child-login.js` |
| Vyväxlare | `public/js/app-view-mode.js` |
| Mockup (ej prod) | `public/v2/child.html` |
| IA vision | `docs/informationsarkitektur-barnapp.md` |
| Separation | `docs/separation-contract-barnapp.md` |

---

## 12. Jämförelse med föräldarsidan (nuläge)

| | Förälder idag | Barn idag |
|--|---------------|-----------|
| Huvud-URL | Många (`/dashboard`, `/schedule`, …) | En (`/child-dashboard`) |
| Nav-källor | Sidebar + native-tab-bar + magic + Mer/Extra | Toppnav ELLER bottennav + Mer |
| Settings | `/settings` | Mer / header |
| Hubbar | Saknas (direkt till routes) | Saknas (tab-state) |
| Paket i nav | Extra/Mer (rollout) | 2-flik (rollout) + TEACCH döljer nav |

---

# Del 2 — Barnmeny v2 (låst arkitektur)

> **Kärninsikt:** Barnets app ska **inte** ärva vuxenappens informationsarkitektur. Den ska inte vara *"en förenklad version av förälderns app"* — den ska vara *"ett visuellt stödverktyg för att lyckas med nästa sak"*.
>
> **Skillnaden mot idag:** Idag navigerar barnet i en app. I v2 **guidar appen barnet genom dagen**. Det är den största produktdifferentieringen.

---

## Barnregel (kontrakt — gäller före allt annat)

> **En ny funktion får aldrig skapa en ny primär värld.**

Varje förslag måste först besvara tre frågor:

1. **Vilken barnfråga hjälper detta?** — *Vad gör jag nu?* / *Det jag bygger* / *Vem hjälper mig?*
2. **Vilken värld äger detta?** — `today` · `world` · `family` (**exakt en** owner, se §5 ownership-kontraktet)
3. **Vilket placement passar?** — ett befintligt placement i den världen

Om det enda ärliga svaret är *"egen flik"* krävs ett **produktbeslut** — inte en PR. Tre världar är låsta.

Detta kontrakt skyddar modellen flera år framåt: barnappen blir stark genom **begränsning**, inte genom fler ytor. Det viktigaste i hela v2 är att **inte lägga till mer**.

---

## 0. Non-goals (låst)

> **V2 bygger inte om produktlogiken. Den flyttar ägarskap och presentation. Befintliga features, API:er och dataflöden återanvänds där möjligt.**

| Gör | Gör inte |
|-----|----------|
| Tre primärvärldar (`CHILD_WORLDS`) | Kopiera vuxenmodellen (jobb → domän → placement) rakt av |
| `child-worlds.js` som presentationslager | Ny backend för daily_log, rewards, family |
| Routes `/child/today`, `/child/world`, `/child/family` | Ta bort `/child-dashboard` innan redirects + analytics OK |
| Dela upp `child-dashboard.js` i moduler | Omskriva hela barn-SPA i ett svep |
| Hash som fallback under migration | Kräva att barn "navigerar funktioner" |

**Barnet är inte en användare som ska navigera funktioner** — barnet ska lyckas med en **vardagsloop**.

| Idag (7/10) | v2 (10/10) |
|-------------|------------|
| Barnet tänker: *"Vilken funktion behöver jag?"* | Barnet känner: *"Vad gör jag nu?"* |
| App-navigation | **Trygg väg** |
| Klassisk / magic / rollout-nav | **En modell** — tre världar, alltid samma |
| Komplexitet synlig i menyer | Komplexitet **bakom stöd** |

---

## 1. Produktprincip (en rad som styr allt)

### Vuxen vs barn — olika mentala modeller

| | Vuxen (v2) | Barn (v2) |
|--|------------|-----------|
| Navigerar efter | **Föräldrajobb** (*Parent Intent*) | **Vad jag ska göra nu** |
| Lager | jobb → domän → placement | situation → handling → mening → relation |
| Flikar | Fem jobb (Hem, Planering, …) | Tre världar (Idag, Min värld, Mina personer) |
| Paket | Utökar domän | Ger mer stöd i **samma flöde** |
| Feature | Läggs till på placement | Gör en del av världen rikare |
| Ny flik? | Endast nytt föräldrajobb | **Endast ny barnfråga** |

| Fråga | Svar i v2 |
|-------|-----------|
| Vad navigerar barnet efter? | **Vad jag ska göra nu** |
| Vad gör en feature? | Gör en del av världen rikare |
| Vad gör paket? | Ger mer stöd i samma flöde |
| Vad får skapa en flik? | **Endast en ny barnfråga** |

**Designregel:** Flikar = barnets världar. Paket = kapabiliteter i befintliga världar.

Fel: `feature → skapa barnflik`  
Rätt: `feature → lägg till innehåll i rätt placement`

Fel: *"Var ska TEACCH-fliken ligga?"*  
Rätt: *"Vilken barnfråga hjälper den?"* → Idag (NU-overlay, aktivitetsstöd).

### Barnets fyra lager (inte nav — produktlogik)

```
situation     →  Vad händer nu?
trygg handling →  Idag (☀️)        →  Handling + Stöd
mening        →  Min värld (🏰)   →  Motivation
relation      →  Mina personer (❤️) →  Trygghet
```

### Slutarkitektur (låst)

```
CHILD APP

             ☀️ Idag
                |
        ----------------
        |              |
     Handling       Stöd


             🏰 Min värld
                |
        ----------------
        |
     Motivation


             ❤️ Mina personer
                |
        ----------------
        |
     Trygghet
```

### Tio principer för NPF 3–12 (låsta)

| # | Princip | Konsekvens |
|---|---------|------------|
| 1 | **Trygg väg**, inte app-navigation | Tre världar. Ingen mode-switch. Ingen classic/magic. Ingen rollout-nav. |
| 2 | **Idag = operativsystem** | ~80 % av användningen. Barnet ska alltid kunna svara: *"Vad ska jag göra?"* |
| 3 | **Komplexitet bakom stöd** | Samma data (`activity → sub_steps → completion`), adaptiv rendering per barn. **Stöd ändrar upplevelsen, aldrig informationsarkitekturen** (§6) |
| 4 | **Skattkammaren borta från nav** | Implementation/internt namn. Barn-UI: *"Jag bygger min värld"* |
| 5 | **Relation, inte funktion** | Flik = *Mina personer* — vem hjälper mig? vilka finns nära? |
| 6 | **Coach-loop** | Idag → liten trygg guide efter aktivitet (inte chat-bot) |
| 7 | **Personlig navigation** | Samma `id`, olika etiketter per ålder/stödnivå (`Uppdrag` vs `Idag`) |
| 8 | **En enda sann källa** | `child-worlds.js` → mobil, surfplatta, native — `presentationMode` styr utseende, inte antal flikar |
| 9 | **Dela monoliten** | `child-shell.js` + världsmoduler + engines — utveckla utan regressioner |
| 10 | **Minsta möjliga val** | Undvik menyer med Schema/Belöningar/Profil/Inställningar — *"Vad händer nu? [Starta]"* |

### Vad skapar **inte** flik

| ❌ | Varför |
|----|--------|
| Schema | Barnet frågar inte "var är schemat?" — barnet frågar "vad händer nu?" |
| Mer | System (byt barn, tema, logout) konkurrerar inte med barnets värld |
| Inställningar | Förälder styr eller liten vuxenikon i header |
| Funktioner | Paket/feature = placement, inte menyitem |

---

## 2. Primärvärldar (basic)

**Tre världar. Inte fyra. Inte fem.**

För många barn 3–12 med NPF är navigation i sig en belastning.

> **Internt språk (låst):** vi säger **världar**, inte "nav" eller "flikar", i barnkod och produktsamtal. Konstanten heter `CHILD_WORLDS`, inte `CHILD_PRIMARY_NAV`. Annars frågar framtida utvecklare *"vi behöver en ny nav-item för X"* — fel fråga. Rätt fråga: *"vilken värld gör X barnet tryggare i?"*

| # | Värld (default) | Route | `id` | Barnets fråga |
|---|----------------|-------|------|---------------|
| 1 | ☀️ **Idag** | `/child/today` | `today` | *Vad gör jag nu?* |
| 2 | 🏰 **Min värld** | `/child/world` | `world` | *Det jag bygger upp* |
| 3 | ❤️ **Mina personer** | `/child/family` | `family` | *Vem hjälper mig?* |

**Tre världar. Alltid samma.** Ingen Mer-flik. Ingen Hem-flik. Ingen Schema-flik.

### Startflöde (låst) — Idag är alltid landningsplatsen

`Idag` är inte en av tre likvärdiga ytor. Det är **operativsystemet** (~80 % av tiden), och hela produkten ska peka dit.

```
Barn väljs
  ↓
Trygg animation (MAX 2 sek)
  ↓
☀️ Idag
  ↓
"Vad händer nu?"
```

**Alltid.** Aldrig "Hem" först, aldrig Min värld först. Animationen efter login är en *övergång till Idag* — inte en egen startsida. Två startsidor (Hem + Skattkammaren) är just det problem v2 tar bort (§4).

**Min värld får aldrig kännas som huvudsidan** även om den är visuellt rikast. Den ska kännas som:

> *"När jag är klar kan jag bygga vidare."*

inte:

> *"Här är appens coolaste del."*

Konkret: rewards/universum är en **belöning för handling**, inte en utforskningsdestination som konkurrerar med Idag. Visuell tyngd, default-flik, login-mål och coach-loop pekar alla mot Idag.

### Personliga etiketter (samma ID, olika språk)

Världs-`id` är stabilt. Etikett kan anpassas per barn (ålder, stödnivå, föräldraval):

```js
{
  id: 'today',
  icon: '☀️',
  href: '/child/today',
  labels: {
    young: 'Uppdrag',           // yngre barn
    default: 'Idag',            // standard
    personal: '{name}s dag',    // t.ex. "Astrids dag"
  },
}
```

**Regel:** personalisering ändrar **språk**, inte struktur. Tre världar förblir tre världar.

### Terminologi (låst)

| Vuxenspråk / kod (internt) | Barnspråk (UI) |
|----------------------------|----------------|
| Skattkammaren, `rewards`, `child-skatt-house` | **Min värld** — aldrig i nav |
| Schema, `schedule`-tab | **Idag** |
| Familjehallen, `family`-domän | **Mina personer** (❤️) |
| Hem-hub, `homeView` | **Inte nav** — intro → Idag |
| classic / magic / rollout-nav | **Bort** som produktbegrepp |
| `CHILD_PRIMARY_NAV` / "nav" / "flik" (kod) | `CHILD_WORLDS` / **"värld"** — undvik "nav" i barnkod |

### `presentationMode` — inte två appar

v2 **avskaffar** classic/magic/rollout som separata nav-modeller.

| Bort | Kvar |
|------|------|
| Toppnav vs bottennav som olika IA | `presentationMode`: `mobile` · `tablet` · `desktop` · `native` |
| `child-package-nav.js` 2-flik | Samma `CHILD_WORLDS` överallt |
| `AppViewMode` styr antal flikar | `AppViewMode` / tema styr **utseende** (färger, animation, botten vs topp *placering*) |

```
child-worlds.js
        |
        +-- mobile (bottennav)
        +-- tablet
        +-- native-tab-bar
        +-- desktop (om barn på stor skärm)
```

**Inte:** två appar. **Utan:** en IA, flera presentationslägen.

---

## 3. De tre världarna

### 3.1 ☀️ Idag — `/child/today` (barnets operativsystem)

**~80 % av användningen.** Inte en sida med schema — barnets **OS**.

**Mental modell:** Barnet ska alltid kunna svara *"Vad ska jag göra?"* utan att välja funktion.

```
Astrid ❤️

NU
🪥 Borsta tänder
[Visa steg]  eller  [✓]

NÄSTA
🥣 Frukost

SEN
🎒 Skola
```

| Kapabilitet | Befintlig kod / data |
|-------------|----------------------|
| `daily_log_item` | `child-dashboard.js`, `/api/me/daily-log` |
| NU / NÄSTA / SEN | `child-today-focus.js`, `child-seven-questions.js` (TEACCH) |
| Underaktiviteter (delsteg) | `daily_log_item_sub_step`, `toggleItem()` |
| Mood | `show_mood_rating` per barn |
| TEACCH-overlay | `child-seven-questions.js` — placement `today_overlay` |
| Coach-loop | **Ny** — se §3.2 |
| Veckonav (klassisk) | Dolt i default NPF-läge |

**Tab-nyckel idag:** `schedule` → **mappas till** `today` i v2.

**Undvik (NPF):**

```
❌ Vad vill du göra?
   Schema · Belöningar · Familj · Profil · Inställningar · Hjälp
```

**Bättre:**

```
✅ Vad händer nu?
   [Starta]
```

### 3.2 Coach-loop (barnets "För dig")

Vuxen har Hem → För dig. Barn behöver **Idag → liten coach**.

Inte chat-bot. En **trygg guide** som bekräftar och pekar framåt.

```
Efter avklarad aktivitet eller delmål:

🎉 Bra jobbat!

Du klarade morgonen.

Vill du se vad som händer sen?
[Nästa: Frukost →]
```

| Placering | `placement` | Trigger |
|-----------|-------------|---------|
| Efter aktivitet | `today_coach_post_activity` | Huvudaktivitet eller alla delsteg klara |
| Efter sektion | `today_coach_post_section` | FM/EM/kväll klar |
| Dagsavslut | `today_coach_day_done` | Alla dagens uppdrag klara |

**Regel:** coach är **kort**, **valfritt att expandera**, och leder alltid tillbaka till NU/NÄSTA — aldrig till en meny.

### 3.3 Adaptivt stöd — samma data, olika rendering

Datamodellen behålls:

```
activity
 └── sub_steps
       └── completion
```

Rendering är **adaptiv** per barn (`child_view_config`, stödnivå, ålder):

**Barn med mindre stöd:**

```
🪥 Borsta tänder
[✓]
```

**Barn med mer stöd:**

```
🪥 Borsta tänder
1/4

🚰 Hämta tandborste  ⬜
🪥 Borsta            ⬜
💧 Skölj             ⬜
✨ Klar
```

| Lager | Ansvar |
|-------|--------|
| `child-activity-engine.js` | Laddar `daily_log_item` + sub_steps |
| `child-support-layer.js` | Väljer renderingsläge (kompakt / expanderad / steg-för-steg) |
| `child-today.js` | Monterar vy, coach-loop, NU/NÄSTA/SEN |

**Oförändrat:** stjärna på **huvudaktivitet**; delsteg = stöd, inte prestation. `PUT …/sub-steps` + huvud-`toggleItem` auto-kompletterar delsteg.

**Detta är en stor del av 10/10** — samma backend, olika trygghetsnivå i UI.

### 3.4 🏰 Min värld — `/child/world`

**Skattkammaren är implementation** — barnets mentalmodell är *"Jag bygger min värld"*, inte *"Jag går till skattkammaren"*.

Gamification behålls. Den blir **begripligare**.

```
🏰 Min värld

⭐ Mina stjärnor
🎯 Mitt mål
🐾 Mitt husdjur
🏆 Mina saker
📖 Min historia
```

| Sektion | Befintlig kod |
|---------|---------------|
| Universum / rum | `child-skatt-house.js`, `universe-engine.js` |
| Stjärnor, mål, butik | `renderSkattkammaren()`, `/api/me/goal`, rewards API |
| Avatar, husdjur, museum, teman | `child-avatar.js`, `child-pet.js`, `child-museum.js` |
| Historik / reporting | `world_history` placement |

**Tab-nyckel idag:** `rewards` (+ `homeView` i magic) → **sammanslaget** till `world`.

`ChildSkattHouse.mountHome()` → **intro/animation efter login** → landar på Idag. Inte egen nav-flik.

### 3.5 ❤️ Mina personer — `/child/family`

**Relation, inte funktion.** Inte ett socialt nätverk, inte en family-graph — **trygghet**. Det här är idag den svagaste världen (~5 %), så var försiktig: led med **människor**, inte mekanik.

Den enda känsla barnet ska bära härifrån:

> **"Jag är inte ensam."**

Världens underrubrik är barnets fråga, inte en systemetikett:

```
❤️ Mina personer
   "De som hjälper mig"

👩 Mamma
👨 Pappa
🧑‍🏫 Min lärare
🧒 Min kompis
```

Barnet möter **personkort** — namn, ansikte/emoji, en varm rad ("Vi klarade kvällsrutinen"). Inte siffror, inte en feed.

**Tona ned (inte bort):** "Familjeskista", "Familjeprojekt" och "event-feed" är vuxen-/systemspråk. De får finnas *bakom* personerna som en lugn "Vi tillsammans ⭐"-rad — men barnet ska **aldrig behöva förstå en social graph** för att känna trygghet.

| Innehåll | Befintlig kod | Roll i barn-UI |
|----------|---------------|----------------|
| Personer (vuxna/syskon/pedagog) | `GET /api/me/family` | **Primärt** — personkort |
| Familjehallen V0 (skista/projekt/berättelse) | `child-family-hall.js` | **Sekundärt** — tyst "Vi tillsammans" |
| Pedagog (paket) | `family_hall` placement | Person bland personer — **inte** egen flik |

**Domän-id:** `family` (stabilt i kod). **Barnetikett:** *Mina personer* (❤️) — aldrig "Familj".

**Tab-nyckel idag:** `family` (klassisk / Mer i magic) → **primärvärld** i v2.

---

## 4. Vad händer med Hem och Mer?

### Hem — inte nav

| Roll idag (magic) | Roll i v2 |
|-------------------|-----------|
| Bottenflik `home` | **Bort** som flik |
| `homeView` + `mountHome()` | Intro efter login, dagens startsida, animation/ingång → landar på **Idag** |
| Dubbel ingress till skatt | **En** ingress: Min värld |

**Problem v2 löser:** *"Var är jag?"* när Hem och Skattkammaren båda känns som start.

### Mer — bort 100%

| Funktion idag | Placering i v2 |
|---------------|----------------|
| 🏡 Familj | Primärflik **Mina personer** |
| 👤 Byt barn | Header vuxenikon → **Parental Gate** (§4.2) |
| 🌙 Mörkt läge | Header vuxenikon → **Parental Gate** (§4.2) |
| 🚪 Logga ut | Header vuxenikon → **Parental Gate** (§4.2) |

Systemgrejer ska **inte konkurrera** med barnets tre världar.

### Gränsen barn ↔ vuxen (låst — escape hatch bara för vuxen)

Två separata universum. Ingen funktion får korsa gränsen utan **Parental Gate** (jfr `app2.md` §5).

| Barnvärlden (utan gate) | Vuxenvärlden (kräver gate) |
|-------------------------|----------------------------|
| ☀️ Idag | Inställningar |
| 🏰 Min värld | Byt barn |
| ❤️ Mina personer | Rapportering / utveckling |
| | Konfiguration, logga ut, mörkt läge |

**Regel:** `CHILD_SYSTEM_ACTIONS` (byt barn, mörkt läge, logga ut) bor bakom en liten **vuxenikon i header** — aldrig som en fjärde barnvärld. Nya vuxenfunktioner hamnar i vuxenvärlden, inte i barnmenyn.

### 4.2 System-ikon & Parental Gate (låst)

`CHILD_SYSTEM_ACTIONS` ligger i header — **inte** i primärvärldarna. På **delad barnenhet** (iPad, familjedator) får barnet **inte** nå dem utan föräldra-PIN.

| Åtgärd | Krav |
|--------|------|
| Visa vuxenikon | Diskret ikon i header (inte textmeny) |
| Öppna systemmeny | `ParentalGate.requireParentMode()` när `DeviceMode.isChildMode()` |
| Efter godkänd PIN | `DeviceMode.enterParent()` → visa `CHILD_SYSTEM_ACTIONS` |
| Feature flag | Respektera `parental_gate_enabled` från `/api/app-config` (`parental-gate.js`) |

```js
// child-shell.js — pseudokod
function onSystemIconClick() {
  ParentalGate.requireParentMode(() => openSystemMenu());
}
```

**Utan gate (endast om flagga av + medveten risk):** systemåtgärder dolda helt i barnläge — säkrare default än exponerad logout.

**Befintlig kod:** `public/js/parental-gate.js`, `device-mode.js`, `child-login.js` (PG vid nytt barn). v2 **utökar** PG till header-systemmenyn.

**Inte PG:** barnets tre världar, coach-loop, aktivitetsbockning — barnets egna flöden.


---

## 5. Domänmodell (barn)

Samma **fyra begrepp** som vuxen — men **andra domäner**:

| Begrepp | Betydelse | Barn-exempel |
|---------|-----------|--------------|
| **`feature`** | Paket-slug som styr åtkomst | `teacch`, `reporting` |
| **`domain`** | Barnfråga — *vilken värld?* (**obligatoriskt**) | `today`, `world`, `family` |
| **`placement`** | Var i UI innehållet **kan** renderas | `today_overlay`, `world_history`, `family_hall` |
| **`visibility`** | Ska det visas nu? | TEACCH köpt men ej aktiverat → dölj |

### Domäner (låsta)

| Domän | Barnfråga | Route |
|-------|-----------|-------|
| `today` | Vad händer nu? | `/child/today` |
| `world` | Det jag bygger upp | `/child/world` |
| `family` | Mina personer | `/child/family` |

**Ingen** `settings`-domän i barnnav. **Ingen** `more`-domän.

### Placements-register (`child-placements.js`)

Central lista över var innehåll **kan** renderas — separat från capabilities så nya placements inte kräver nav-ändring:

```js
// public/js/child-placements.js

export const CHILD_PLACEMENTS = {
  // Idag
  today_overlay:        { domain: 'today',  description: 'TEACCH NU-kort, fullskärmsstöd' },
  today_coach_post_activity: { domain: 'today', description: 'Coach efter aktivitet' },
  today_coach_post_section:  { domain: 'today', description: 'Coach efter FM/EM/kväll' },
  today_coach_day_done:      { domain: 'today', description: 'Coach när dagen är klar' },
  activity_support:     { domain: 'today',  description: 'Adaptiv delsteg-rendering' },
  // Min värld
  world_history:        { domain: 'world',  description: 'Min historia / reporting' },
  world_tools:          { domain: 'world',  description: 'TEACCH-verktyg i världen' },
  // Mina personer
  family_hall:          { domain: 'family', description: 'Familjehallen' },
  family_persons:       { domain: 'family', description: 'Personkort med relationstext' },
};
```

### Obligatoriska fält i `CHILD_CAPABILITIES` (ownership-kontrakt)

> **Varje capability bor i exakt EN värld.** Den får *synas* på flera platser, men *ägs* av en värld via `primaryPlacement`. Annars börjar funktioner flyta överallt igen — precis det vuxen- och barn-v2 är till för att stoppa.

```js
{
  id: 'teacch_now',                  // required — stabil nyckel
  feature: 'teacch',                 // required — access gate (null = basic)
  domain: 'today',                   // required — barnvärld (owner)
  primaryPlacement: 'today_overlay', // required — EN owner-placement
  secondaryPlacements: ['activity_support'], // valfritt — får synas, ägs ej
  label: 'NU-kort',
}
```

**Förbjudet:**

```js
// ❌ ingen owner — funktionen flyter över flera världar
{ id: 'x', domain: 'today', placements: ['today_overlay', 'family_hall', 'world_history'] }

// ❌ saknar domain + owner helt
{ label: 'TEACCH', href: '/teacch' }
```

**Regel:** `primaryPlacement` **måste** tillhöra capabilityns `domain`. `secondaryPlacements` får peka in i en annan värld endast för innehåll en användare *redan* ser där — de skapar aldrig en ny ägare. Code review / lint avvisar capabilities som saknar `primaryPlacement` eller som använder en platt `placements`-array.

---

## 6. Paket → placering (ingen navändring)

| Paket | Feature | Owner-värld (`domain`) | `primaryPlacement` | Får även synas (`secondary`) | Synligt som |
|-------|---------|------------------------|--------------------|------------------------------|-------------|
| **Basic** | — | `today` · `world` · `family` | tre världar | — | Tre världar |
| **TEACCH** | `teacch` | `today` | `today_overlay` | `activity_support` | NU-kort, adaptivt stöd — **inte** ny värld |
| **Pedagog** | `pedagog` | `family` | `family_hall` | `family_persons` | Extra innehåll i Mina personer |
| **Reporting** | `reporting` | `world` | `world_history` | — | Min historia — **inte** barnvärld |
| **Coach** | — (basic) | `today` | `today_coach_post_activity` | `today_coach_post_section`, `today_coach_day_done` | Trygg guide efter aktivitet/sektion/dag |

Varje rad har **exakt en** owner-värld. Ett paket kan fördjupa en värld — det får aldrig bli en fjärde värld.

### Reporting — dubbel entré (samma princip som vuxen Framsteg)

| Roll | Placering |
|------|-----------|
| Förälder | Barnprofil → Framsteg (`vuxenmeny-v2.md` §3) |
| Barn | Min värld → Historik |

Barn ser **inte** rapporter som egen flik.

### Stöd ändrar upplevelsen, aldrig informationsarkitekturen

> **Generell regel (större än TEACCH):** Stöd får ändra *hur* en värld känns och renderas — aldrig *vilka* världar som finns eller var något bor.

Samma värld, samma aktivitet, olika stöd:

```
Barn A                     Barn B
🪥 Borsta tänder           🪥 Borsta tänder
[✓]                        1. Hämta tandborste
                           2. Ta tandkräm
                           3. Borsta
                           4. Klar
```

Tre världar, samma routes, samma `daily_log_item` — bara olika trygghetsnivå i UI (`child-support-layer.js`, §3.3). Det är en av modellens starkaste idéer och gäller allt stöd, inte bara TEACCH.

**TEACCH som specialfall:** idag döljer `ChildPackageNav.setNavHidden(true)` nav under NU-overlay. v2 behåller principen — världarna döljs visuellt vid fullskärms-stöd, men **grundstrukturen är fortfarande tre världar** när overlay stängs. Overlayn ändrar upplevelsen, inte IA:n.

---

## 7. Teknisk källa — tre filer, en IA

```
child-worlds.js      ← tre världar, etiketter, routes
        |
child-capabilities.js    ← feature + domain + access/visibility
        |
child-placements.js      ← var innehåll kan renderas
```

**Mål:** en källa för all barnnavigation — ersätter duplicering i `child-dashboard.html`, `child-package-nav.js`, `child-layer-router.js`, classic/magic-split.

### Modularkitektur (mål efter Fas 2)

```
Nu (monolit):
child-dashboard.js
  ├── login
  ├── nav
  ├── rewards
  ├── family
  ├── schedule
  ├── mood
  └── TEACCH

V2:
child-shell.js              ← login, nav, routing, system (vuxenikon)
child-today.js              ← Idag-vy, coach-loop
child-world.js              ← Min värld
child-family.js             ← Mina personer
child-support-layer.js      ← adaptiv rendering (steg/kompakt)
child-activity-engine.js    ← daily_log + sub_steps
child-rewards-engine.js     ← stjärnor, mål, inlösen
```

**Mål:** utveckla utan regressioner. `child-dashboard.js` blir tunn orchestrator → ersätts av `child-shell.js` **så snabbt som möjligt**.

> **Risk att undvika — två arkitekturer samtidigt:**
>
> ```
> v2-UI
>   └── child-dashboard.js   ← gammal orchestrator
>         └── gamla showTab()
>               └── gammal hash-router
> ```
>
> Om `child-dashboard.js` lever kvar länge under det nya UI:t får ni i praktiken **två navigationsmodeller** som måste hållas i synk — samma fälla som classic/magic-spliten. Regel: `child-shell.js` ska ersätta orchestrator-rollen redan i Sprint 2 (inte Sprint 5), och `/child-dashboard` redirectas i Sprint 3. Gamla `showTab()`/hash får bara leva som **tunn shim som mappar till de nya routes:arna**, aldrig som en parallell källa.

### Konsumenter (ska läsa samma config)

| Fil | Idag | v2 |
|-----|------|-----|
| `child-dashboard.html` `#childBottomNav` / `#childLayerNav` | Hårdkodad HTML | Genererad från config |
| `child-package-nav.js` | 2-fliks rollout | **Avvecklas** |
| `AppViewMode` classic/magic nav | Olika antal flikar | **`presentationMode`** — samma tre flikar |
| `child-layer-router.js` | Hash → tab | Hash → route + tab fallback |
| `native-tab-bar.js` (barnläge) | Om separat | `child-worlds` → `worlds` |
| `session-gate.js` | `CHILD_PATHS` | Lägg till `/child/today`, `/child/world`, `/child/family` |

### Config-struktur (koncept)

```js
// public/js/child-worlds.js

export const CHILD_WORLDS = [
  {
    id: 'today',
    icon: '☀️',
    href: '/child/today',
    labels: { young: 'Uppdrag', default: 'Idag', personal: '{name}s dag' },
    paths: ['/child/today', '/child-dashboard'], // hash → today under migration
  },
  {
    id: 'world',
    icon: '🏰',
    href: '/child/world',
    labels: { default: 'Min värld' },
    paths: ['/child/world'],
  },
  {
    id: 'family',
    icon: '❤️',
    href: '/child/family',
    labels: { default: 'Mina personer' },
    paths: ['/child/family'],
  },
];

/** Aktiv värld — samma mönster som vuxen `activeNavItem()` (nav-config.js §6) */
export function activeChildNavItem(pathname, hash, nav = CHILD_WORLDS) {
  const p = (pathname || '/').replace(/\/$/, '') || '/';
  const h = (hash || '').replace(/^#/, '');
  // Hash-fallback under migration (child-layer-router.js)
  const hashToId = {
    today: 'today', idag: 'today', schedule: 'today', home: 'today', hem: 'today',
    universe: 'world', rewards: 'world', skattkammaren: 'world',
    family: 'family', familj: 'family',
  };
  if (p === '/child-dashboard' && h && hashToId[h]) {
    return nav.find((tab) => tab.id === hashToId[h]);
  }
  return nav.find((tab) =>
    tab.paths.some((tp) => {
      if (p === tp) return true;
      if (tp !== '/' && p.startsWith(tp + '/')) return true;
      return false;
    })
  );
}

// child-capabilities.js — se §5
// child-placements.js — se §5
```

`CHILD_CAPABILITIES` och `CHILD_SYSTEM_ACTIONS` lever i `child-capabilities.js`:

```js
export const CHILD_CAPABILITIES = [
  {
    id: 'today_coach',
    feature: null,  // basic
    domain: 'today',
    primaryPlacement: 'today_coach_post_activity',
    secondaryPlacements: ['today_coach_post_section', 'today_coach_day_done'],
    label: 'Coach',
  },
  {
    id: 'teacch_now',
    feature: 'teacch',
    domain: 'today',
    primaryPlacement: 'today_overlay',
    secondaryPlacements: ['activity_support'],
    label: 'NU-kort',
  },
  {
    id: 'adaptive_substeps',
    feature: null,  // basic — driven by child_view_config
    domain: 'today',
    primaryPlacement: 'activity_support',
    secondaryPlacements: [],
    label: 'Adaptivt stöd',
  },
  {
    id: 'reporting',
    feature: 'reporting',
    domain: 'world',
    primaryPlacement: 'world_history',
    secondaryPlacements: [],
    label: 'Min historia',
  },
  // … pedagog (domain: 'family', primaryPlacement: 'family_hall')
];

export const CHILD_SYSTEM_ACTIONS = [
  // Kräver ParentalGate i barnläge (§4.2) — aldrig en värld
  { id: 'switch_child', label: 'Byt barn',    action: 'switchChild', requiresParentalGate: true },
  { id: 'dark_mode',    label: 'Mörkt läge',  action: 'toggleDark', requiresParentalGate: true },
  { id: 'logout',       label: 'Logga ut',    action: 'logout', requiresParentalGate: true },
];
```

### Tillgänglighet (a11y) — krav på nav-render

| Krav | Detalj |
|------|--------|
| Aktiv värld | `aria-current="page"` på aktiv primärnav-länk |
| Bottennav | `role="navigation"` + `aria-label="Barnnavigering"` |
| NU/NÄSTA/SEN | Tydliga rubriker (`h2`/`h3`), inte bara färg |
| Delsteg | Varje steg fokuserbart; progress (`1 av 4`) läsbar för skärmläsare |
| Coach-loop | `aria-live="polite"` på bekräftelsetext |
| System-ikon | `aria-label="Förälder"` / `aria-haspopup="menu"`; meny med fokusfälla |
| TEACCH-overlay | Fokusfång i overlay; Escape → tillbaka till Idag |

**Referens:** samma nivå som `vuxenmeny-v2.md` §6 a11y; `mobile-nav.js` `role="dialog"` ska föras vidare till barn-header-meny.

### Filer att **inte** omskriva (initialt)

| Fil | Strategi |
|-----|----------|
| `src/routes/daily-logs.js` | Orörd |
| `src/routes/rewards.js` | Orörd |
| `src/routes/goals.js` | Orörd |
| `child-skatt-house.js` | Behåll; mountas från `child-world.js` |
| `child-family-hall.js` | Behåll; mountas från `child-family.js` |

---

## 8. Inkrementell migration

**Princip:** Ny mental modell snabbt. Monolit delas upp. Gamla entry points lever tills redirects + analytics OK.

### Fas 0 — Config (ingen UI-förändring)

| Leverans | Detalj |
|----------|--------|
| `public/js/child-worlds.js` | `CHILD_WORLDS` med personliga `labels` |
| `public/js/child-capabilities.js` | `CHILD_CAPABILITIES`, `CHILD_SYSTEM_ACTIONS`, access/visibility |
| `public/js/child-placements.js` | `CHILD_PLACEMENTS` register |
| Inga synliga ändringar | Config importeras men UI oförändrat |

### Fas 1 — Lås tre världar

| Från (magic) | Från (klassisk) | Till (alla) |
|--------------|-----------------|-------------|
| Hem · Schema · Skatt · Mer | Idag · Skatt · Familj | **Idag · Min värld · Mina personer** |

- Gamla `showTab()`-nycklar fungerar internt (`schedule` → `today`, `rewards` → `world`)
- `child-package-nav.js` och rollout 2-flik: **avvecklas**
- classic/magic nav-split: **bort** — endast `presentationMode`
- `public/sw.js` CACHE_NAME-bump

### Fas 2 — Separera komponenter

| Ny modul | Ansvar | Källa idag |
|----------|--------|------------|
| `child-shell.js` | Login, nav, routing, system | `child-dashboard.js` (orchestrator) |
| `child-today.js` | Idag-vy, NU/NÄSTA/SEN, coach-loop | `child-dashboard.js` |
| `child-world.js` | Min värld, universum | `child-dashboard.js` + `child-skatt-house.js` |
| `child-family.js` | Mina personer | `child-family-hall.js` |
| `child-activity-engine.js` | daily_log + sub_steps | `child-dashboard.js` |
| `child-support-layer.js` | Adaptiv rendering | Ny (extrahera från delsteg-UI) |
| `child-rewards-engine.js` | Stjärnor, mål, inlösen | `child-dashboard.js` rewards-del |

**Mål:** inte ~2 700 rader i en fil. Utveckla utan regressioner.

### Fas 3 — Route-riktig struktur

| Route | Innehåll |
|-------|----------|
| `/child/today` | Idag |
| `/child/world` | Min värld |
| `/child/family` | Mina personer |

- Server: tunna HTML eller Express-routes som servar samma shell
- Hash (`#today`, `#universe`, …) lever som **fallback** under migration
- `child-layer-router.js` mappar gamla hash → nya routes

### Fas 4 — NPF & coach (10/10-polish)

| Leverans | Detalj |
|----------|--------|
| Adaptivt stöd | `child-support-layer.js` — kompakt vs steg-för-steg (§3.3) |
| Coach-loop | `today_coach_*` placements (§3.2) |
| Minsta val | Dölj veckonav, print, funktionsmenyer |
| Personliga etiketter | `labels.young` / `labels.personal` i nav |
| Login-intro | Animation → Idag, inte Hem-flik |

---

## 9. Sprint-plan (låst ordning)

### Sprint 0 — Config
- [ ] `child-worlds.js` (världar + personliga labels + **paths** + `activeChildNavItem()`)
- [ ] `child-capabilities.js` (access + visibility)
- [ ] `child-placements.js` (placement-register)
- [ ] Inga UI-ändringar

### Sprint 1 — Synlig v2 (trygg väg)
- [ ] Ersätt magic 4-flik + klassisk 3-flik + rollout 2-flik med **en** tre-världsmodell
- [ ] Etiketter: Idag · Min värld · Mina personer (❤️)
- [ ] Mina personer upp från Mer
- [ ] Hem bort som flik; Mer bort; rollout-nav bort
- [ ] `presentationMode` — samma IA på mobil/tablet/native
- [ ] System i header (vuxenikon) + **Parental Gate** i barnläge
- [ ] `session-gate.js` uppdaterad
- [ ] `public/sw.js` bump

*Leverans:* barn ser tre världar. Appen guidar — barnet navigerar inte funktioner.

### Sprint 2 — Moduluppdelning
- [ ] `child-shell.js` (ersätter orchestrator-delen)
- [ ] `child-today.js` + `child-activity-engine.js`
- [ ] `child-world.js` + `child-rewards-engine.js`
- [ ] `child-family.js` wired
- [ ] `child-support-layer.js` (skelett)

### Sprint 3 — Routes
- [ ] `/child/today`, `/child/world`, `/child/family`
- [ ] Redirect `/child-dashboard` → `/child/today`
- [ ] Hash-fallback
- [ ] `page_view` analytics per värld

### Sprint 4 — Adaptivt stöd & coach
- [ ] Adaptiv delsteg-rendering (§3.3)
- [ ] Coach-loop efter aktivitet (§3.2)
- [ ] Personliga nav-etiketter
- [ ] TEACCH via placements (inte `child-package-nav.js`)

### Sprint 5+ — Städning
- [ ] Avveckla `child-package-nav.js`, classic/magic nav-split
- [ ] `CHILD_CAPABILITIES` för teacch, reporting, pedagog
- [ ] `child-dashboard.js` bort eller minimal legacy-shim

---

## 10. Mätning — rätt saker

Mät om barnet **lyckas**, inte hur mycket det klickar. Vanity-metrics (klick, tid-i-skatt) lurar oss att tro att utforskning = värde.

| ❌ Mät inte | ✅ Mät i stället |
|------------|------------------|
| Antal klick till feature | Kom barnet igång idag? |
| Tid i Skattkammaren / Min värld | Klarades första aktiviteten? |
| Sidvisningar per flik | Behövdes stöd — och hjälpte det? |

### Per värld

| Värld | Vad vi mäter |
|-------|--------------|
| ☀️ **Idag** | Kom barnet igång? Klarades första aktiviteten? Behövdes stöd? |
| **Coach** | Hjälpte nästa-steg-loopen — ledde den vidare till NU/NÄSTA? |
| ❤️ **Mina personer** | Sker faktisk interaktion med relationer (inte bara visning)? |
| 🏰 **Min värld** | Finns motivation **efter** handling — inte i stället för? |

Använd befintlig `analytics_events` (`event_type` + `metadata`, ingen PII). Lägg events vid route-migration (Sprint 3) och vid coach/stöd-trigger (Sprint 4). Inga nya tabeller krävs.

---

## 11. Redirects (sammanfattning)

| Gammal | Ny |
|--------|-----|
| `/child-dashboard` | `/child/today` |
| `/child-dashboard#schedule` / `#today` / `#idag` | `/child/today` |
| `/child-dashboard#rewards` / `#universe` / `#skattkammaren` | `/child/world` |
| `/child-dashboard#family` / `#familj` | `/child/family` |
| `/child-dashboard#home` / `#hem` | `/child/today` (efter intro) |
| `/child-dashboard#more` / `#mer` | `/child/today` + system i header |

Befintliga API:er (`/api/me/daily-log`, `/api/me/goal`, …) **oförändrade**.

---

## 12. Relation till vuxenmeny v2

| Vuxen | Barn | Gemensam princip |
|-------|------|------------------|
| Parent Intent (jobb) | Barnfråga (värld) | Flik = mental modell, inte feature |
| `nav-config.js` | `child-worlds.js` | En källa (vuxen: "nav" · barn: "världar") |
| `CAPABILITIES` + placements | `CHILD_CAPABILITIES` | Paket utökar djup, inte bredd |
| Barnprofil → Framsteg | Min värld → Historik | Reporting dubbel entré |
| Avatar → inställningar | Vuxenikon + gate / förälder | System utanför världarna/flikarna |
| `informationsarkitektur-barnapp.md` tre lager | Tre världar | Idag → Min värld → Mina personer |
| Hem → För dig (vuxen) | Idag → coach-loop (barn) | Coach-lager per målgrupp |
| Förälder **Familj** (personer) | Barn **Mina personer** (relation) | Samma domän-id `family` i kod — **olika** barnspråk |
| `/skattkammaren` → `/rewards` (inloggad **förälder**) | Barn: `/child/world`; publik demo kvar | Redirect **aldrig** för barn eller `?demo=1` |

**Slutsats:** För att nå 10/10 behöver ni inte lägga till mer — ni behöver göra barnmenyn **mer konsekvent med barnets faktiska behov**. Appen guidar barnet genom dagen; barnet navigerar inte funktioner.

---

## 13. Checklista innan merge (per sprint)

- [ ] Barnregeln respekterad: ingen ny funktion skapar en ny primärvärld (§Barnregel)
- [ ] `CHILD_WORLDS` har `paths` + `activeChildNavItem()` (inkl. hash-fallback)
- [ ] Alla barnvärld-konsumenter läser `child-worlds.js` (källan heter `CHILD_WORLDS`, inte `*_NAV`)
- [ ] Systemåtgärder bakom **Parental Gate** i barnläge (`parental-gate.js`, §4.2)
- [ ] a11y: `aria-current` på aktiv värld, coach `aria-live`, overlay-fokus
- [ ] `child-placements.js` + `child-capabilities.js` på plats
- [ ] Varje `CHILD_CAPABILITY` har `id`, `feature`, `domain`, `primaryPlacement` (**exakt en owner**) — inga platta `placements`-arrayer
- [ ] Exakt **tre** primärvärldar — inga Hem/Mer/Schema/Skattkammaren-flikar
- [ ] Startflöde: login → trygg animation (max 2 s) → **Idag**; aldrig Hem/Min värld som start (§Startflöde)
- [ ] Barnetikett *Mina personer* (❤️) = "De som hjälper mig" — personer först, ingen synlig social graph
- [ ] Ingen classic/magic/rollout **nav-split** — endast `presentationMode`
- [ ] Coach-loop testad (ej chat-bot, leder till NU/NÄSTA)
- [ ] Adaptivt stöd: samma data, två renderingslägen — stöd ändrar upplevelse, aldrig IA (§6)
- [ ] System (byt barn, logga ut) bakom vuxenikon + **Parental Gate** (§4); barn kan inte korsa gränsen
- [ ] `session-gate.js` inkluderar `/child/*` paths
- [ ] Deep links / push uppdaterade vid behov
- [ ] Mätning enligt §10 (lyckas-metrics, inte klick/tid-i-skatt) vid route-/coach-migration
- [ ] `CACHE_NAME` i `public/sw.js` bumpad
- [ ] Smoke: klassisk vy, magic vy, TEACCH overlay, native shell
- [ ] Ingen omskrivning av rewards/daily-log API (non-goal §0)

---

## 14. Ägarskap efter migration

| Barnfråga | Äger |
|-----------|------|
| Vad ska jag göra nu? | **Idag** (~80 % av tiden) |
| Det jag bygger upp | **Min värld** |
| Mina personer / trygghet | **Mina personer** |
| Coach efter handling | **Idag** → coach-loop |
| Adaptivt stöd | **Idag** → `child-support-layer` |
| System (byt barn, tema, logout) | Header vuxenikon + **Parental Gate** / förälder — **inte** värld (§4.2) |
| Intro efter login | Animation → landar på Idag |
| Paket (TEACCH, reporting, …) | Placements i befintliga världar |

**Slutsats:** Navigationen växer inte när paket kommer — **djupet** i varje värld växer. Idag är operativsystemet. Min värld är motivation. Mina personer är trygghet. Appen guidar — barnet lyckas med nästa sak.

### Slutbild (10/10)

```
LOGIN
   ↓
☀️ IDAG
"Vad händer nu?"
        |
        + stöd
        + coach
        + nästa steg


🏰 MIN VÄRLD
"Det jag bygger"
        |
        + stjärnor
        + mål
        + avatar
        + historia


❤️ MINA PERSONER
"De som hjälper mig"
        |
        + relation
        + trygghet


SYSTEM
(vuxenikon + gate)
```

**Det viktigaste: lägg inte till mer.** Arkitekturen blir stark genom begränsning. Tre förändringar lyfter den från "snyggare meny" till **barnplattform med tydlig produktfilosofi**: (1) mentalt skifte nav → världar, (2) hårt capability-owner-kontrakt, (3) Idag ännu mer dominant visuellt och tekniskt.

---

# Bilaga A — Schema & delsteg (teknisk kedja)

> Djupdykning för implementatörer. Produktbeteende oförändrat i v2 — bara UX och placering.

### Datakedja

```
activity_template
  └── activity_sub_step
weekly_schedule_item
  └── daily_log_item          ← stjärna här (star_value, vanligtvis 1⭐)
        └── daily_log_item_sub_step   ← checklista, ingen egen stjärna
```

Generator: `src/lib/daily-log-generator.js`

### Barn-API

| Endpoint | Syfte |
|----------|-------|
| `GET /api/me/daily-log` | Dagens items |
| `PUT /api/me/daily-log-items/:id` | Bocka av huvudaktivitet |
| `GET/PUT …/sub-steps` | Delsteg |

Huvud-`toggleItem` i `child-dashboard.js` auto-kompletterar alla delsteg när huvudaktiviteten bockas.

---

# Bilaga B — Min värld / stjärnekonomi

### Saldo

`getStarBalance()` i `src/routes/rewards.js`:

```
intjänade (completed daily_log_items)
+ manuella tilldelningar
− spenderade (godkända/auto redemptioner)
```

### Inlösen

Barn → `pending` → förälder godkänner.

### Mål

`child_reward_goal` / `GET /api/me/goal`

### Universum

`child-skatt-house.js` + `universe-engine.js` — rum, unlocks, teman (🏰 🌳 🚀). I v2: allt under **Min värld**, inte Skattkammaren i barn-UI.

---

*Uppdatera Del 1 när nav ändras. Del 2 ändras endast via teambeslut — samma process som `vuxenmeny-v2.md`.*

========================================================================
KÄLLA: vuxenmeny-v2.md
========================================================================

# Vuxenmeny v2 — informationsarkitektur & inkrementell migration

> **Syfte:** Teamreferens för design, frontend och test. Styr var föräldrfunktioner *bor* i navigationen — inte bara var routes *finns*.
>
> **Status:** Låst arkitektur · implementation pågår inkrementellt  
> **Relaterat:** [`vuxenmeny-v2-operations-checklist.md`](./vuxenmeny-v2-operations-checklist.md) (operations + acceptance) · [`for-dig-spec.md`](./for-dig-spec.md) · [`paket-v1.2-spec.md`](./paket-v1.2-spec.md) §6 · [`informationsarkitektur-barnapp.md`](./informationsarkitektur-barnapp.md) · [`component-feature-map.js`](../config/component-feature-map.js)
>
> **Senast uppdaterad:** 2026-06-21 (granskningsrunda: kodbasavstämning)

---

## 0. Non-goals (låst)

> **V2 bygger inte om produktlogiken. Den flyttar ägarskap och presentation. Befintliga features, routes och dataflöden återanvänds där möjligt.**

Detta innebär konkret:

| Gör | Gör inte |
|-----|----------|
| Nya hub-sidor som länkar till befintliga routes | Flytta eller omskriva `/schedule`, `/library`, `/reports` |
| Ny barnprofil-sida som samlar befintlig UI | Duplicera affärslogik i nya filer |
| Redirects från gamla entry points | Ta bort gamla routes innan analytics visar adoption |
| `nav-config.js` som presentationslager | Ny backend för befintliga flows |

Om någon föreslår "vi flyttar hela schedule-modulen till planning" — det är **utanför scope** för v2.

---

## 1. Produktprincip (en rad som styr allt)

| Fråga | Svar i v2 |
|-------|-----------|
| Vad navigerar föräldern efter? | **Föräldrajobb** (*Parent Intent*) — inte features eller paket |
| Vad gör ett paket? | **Utökar innehåll** i en befintlig domän |
| Vad gör en feature? | **Läggs till** på rätt `placement` — skapar inte menyitem |

**Designregel:** Flikar = förälderns jobb. Paket = kapabiliteter.

Fel: `feature → skapa menyitem`  
Rätt: `feature → lägg till innehåll i rätt domän`

Fel: *"Var ska den nya TEACCH-sidan ligga?"*  
Rätt: *"Vilket parent intent hjälper den?"* → Planering.

Om en ny funktion kräver ny bottenflik har den troligen fel hemvist.

**Terminologi:** *Föräldrajobb* internt · *Parent Intent* i produktteam och vid feature-review.

---

## 2. Primärnav (basic, idag)

Fem flikar. Ingen **Mer**. Ingen **Extra**. Inställningar i avatar — inte i bottennav.

| # | Flik | Route (hub) | Förälderns jobb |
|---|------|-------------|-----------------|
| 1 | 🏠 **Hem** | `/dashboard` | *Här är läget* — status, nästa steg, daglig överblick |
| 2 | 📅 **Planering** | `/planning` | *Jag vill planera* — schema, kalender, aktiviteter, bibliotek |
| 3 | 🎁 **Belöningar** | `/rewards` | *Stjärnor och belöningar* — kista, museum, historik |
| 4 | ✨ **För dig** | `/for-dig` | *Här är vad jag rekommenderar* — mål, tips, nästa bästa steg |
| 5 | 👨‍👩‍👧 **Familj** | `/family` | *Vilka är med?* — barn, vuxna, pedagoger |

### Hem vs För dig (produktprincip, inte bara routes)

| | Hem | För dig |
|--|-----|---------|
| Roll | *Här är läget* | *Här är vad jag rekommenderar* |
| Ton | Status, varningar, överblick | Guidning, mål, handlingar |
| Exempel | Astrid ⭐⭐⭐☆☆ · PIN saknas | Testa kvällsrutin → [Skapa schema] |
| Data | Samma readiness-/intelligenslager | Samma lager, mer coachande presentation |

`/for-dig` ska **inte** degenerera till en glömd tips-sida. Den är appens **coach-lager** och ingår i basic (`for_dig` → `basic_app` i `component-feature-map.js`).

### Desktop-sidebar

Samma fem som primärnav. Inställningar under avdelare — konkurrerar inte med kärnflöden.

```
Hem
Planering
Belöningar
För dig
Familj
────────
Inställningar
```

Framtida paketinnehåll syns i **hubbar** och **barnprofil** — inte som nya toppnivålänkar (se §5).

**Ikonkonvention:** 🎁 = Belöningar-fliken i nav. ⭐ = stjärnsaldo i innehåll (Hem-kort, barnprofil) — **inte** nav-ikon.

### Notis-inkorg (header, ej flik)

`/notifications` (kopplad till `notification_log`) har **ingen** bottenflik. Entré:

| Placering | `placement` | Implementation idag |
|-----------|-------------|---------------------|
| Header-klocka på alla förälderytor | `header_notifications` | `dashboard-home-hub.js` → `/notifications` |

Kräv synlig 🔔 på **desktop, mobil webb och native** — samma mönster som avatar-menyn (§4).

---

## 3. Domänmodell

Fyra begrepp styr synlighet och placering:

| Begrepp | Betydelse | Exempel |
|---------|-----------|---------|
| **`feature`** | Paket-/feature-slug som styr **åtkomst** | `reporting`, `pedagog`, `teacch`, `for_dig` |
| **`domain`** | Parent intent — *vilket jobb hjälper funktionen?* (**obligatoriskt**) | `child_progress`, `planning`, `rewards`, `family` |
| **`placement`** | Var i UI innehållet **kan** renderas | `planning_hub`, `child_profile`, `home_card` |
| **`visibility`** | Om innehållet **ska** visas just nu på en placement | Per placement, oberoende av köp |

**Viktigt:** Navigationen *äger inte* funktionen. Samma feature kan ha flera placements.

### Obligatoriska fält i `CAPABILITIES`

Varje capability **måste** ha alla fyra — inga undantag:

```js
{
  id: 'reports',           // required — stabil nyckel
  feature: 'reporting',    // required — access gate (null = basic, alltid tillgänglig)
  domain: 'child_progress', // required — parent intent
  placements: ['child_profile', 'rewards_hub', 'home_card'], // required — minst en
  label: 'Rapporter',
  href: '/reports',
}
```

**Förbjudet** (återinför gamla problemet):

```js
{ label: 'Ny grej', href: '/new-feature' }  // ❌ saknar id, feature, domain, placements
```

Code review / lint: avvisa capabilities utan `domain`.

### Access vs visibility (separata lager)

| Lager | Fråga | Källa |
|-------|-------|-------|
| **Access** | Har familjen rätt att använda funktionen? | `/api/subscription/access` → `components`, `features` |
| **Visibility** | Ska vi visa den på denna placement nu? | `nav-config` + ev. rollout / aktiveringsstatus |

Exempel: TEACCH kan vara **köpt** (`access.teacch: true`) men **inte aktiverat** av föräldern → dölj i `planning_hub` tills aktivering.

```js
function shouldShow(capability, access, visibility) {
  if (!hasFeatureAccess(access, capability.feature)) return false;
  return capability.placements.every((p) => visibility[p] !== false);
}
```

Detta förhindrar att feature-flaggning och UI-beslut blandas i samma boolean.

### Domäner (låsta)

| Domän | Beskrivning |
|-------|-------------|
| `home` | Daglig överblick, readiness, snabbstatus |
| `for_you` | Coach, rekommendationer, mål, personliga tips |
| `planning` | Schema, kalender, aktiviteter, bibliotek |
| `rewards` | Stjärnor, belöningar, kista, museum |
| `child_progress` | **Framsteg** — stjärnor över tid, historik, rapporter, mål |
| `family` | Barn, vuxna, pedagoger, inbjudan |
| `child_profile` | En barns hela värld (per barn) |
| `settings` | Konto, säkerhet, notiser, app, data, **prenumeration** |
| `billing` | Paket, trial, köp, betalningsstatus |
| `pedagog_view` | Separat UI-universum (ej föräldraflik) |

### Framsteg som gemensam domän

Rapporter är **inte** en belöningssak — det är uppföljning/utveckling.

```
/family/child/astrid
└── Framsteg
    ├── Stjärnor
    ├── Historik
    ├── Rapporter      ← feature: reporting
    └── Mål
```

Belöningar kan **länka** dit utan att äga innehållet:

```
⭐ Belöningar
500 stjärnor totalt
Se Astrids utveckling →
```

---

## 4. Hubbar & undersidor

### `/planning` — Planeringshub

| Ingång | Befintlig route | Feature (basic) |
|--------|-----------------|-----------------|
| Schema | `/schedule` | `basic_app` |
| Kalender | `/calendar` | `basic_app` |
| Aktiviteter | `/activities` eller `/library` (aktiviteter) | `basic_app` |
| Bibliotek | `/library` | `basic_app` |
| Kopiera schema | `/assign-schedule` | `basic_app` |
| Stöd & verktyg | `/barn-stod` | `teacch` (framtida) |

### `/rewards` — Belöningshub

| Ingång | Befintlig route | Feature |
|--------|-----------------|---------|
| Stjärnor | `/rewards#stars` eller inbäddat | `basic_app` |
| Hantera belöningar | `/library` (flik Belöningar) | `basic_app` |
| Familjekista | `/rewards#chest` | `basic_app` |
| Familjemuseum | `/rewards#museum` | `basic_app` |
| Utveckling | länk → barnprofil → Framsteg | `basic_app` (basic-statistik) / `reporting` (rapporter) |

> **⚠️ Hub-regel:** Länka **aldrig** till `/skattkammaren` från hubben. Den URL:en är idag antingen publik demo eller (v2) redirect för inloggad förälder → loop om hubben pekar dit.

**Tomt state (basic):** Raden *Utveckling* pekar på barnprofil → Framsteg → **Stjärnor/Historik** (basic). Länk till `/reports` döljs tills `feature: reporting`. Ingen disabled-rad — dölj eller visa basic-alternativ.

**Redirect (v2, inloggad förälder):** gamla bokmärken `/skattkammaren` → `/rewards`. Publik demo oförändrad: `GET /skattkammaren` utan session eller `?demo=1` (`public-pages.js`).

**Barn:** inloggat barn på `/skattkammaren` redirectas redan till `/child-dashboard#rewards` — påverkas av barnmeny v2 (`/child/world`).

### `/family` — Familjehub (ren)

```
Familj

Barn
──────
🌟 Astrid
👶 Olle

Vuxna
──────
Pontus
Anna

Pedagoger          ← feature: pedagog (dold tills live)
──────
Lisa
```

**Flytta bort från `/family`:** push, PWA-installation, föräldralås, GDPR, dataexport, radera konto → `/settings` eller avatar.

**`/samarbete` (pedagogsamarbete):** idag i Extra/Mer (`native-tab-bar.js` ROLLOUT). v2-placering:

| Placering | `placement` | Route |
|-----------|-------------|-------|
| Familj-hub → Pedagoger (intresse/info) | `family_pedagog_interest` | `/samarbete` |
| För dig (paketcoach) | `for_you_card` | `/samarbete` eller `/pricing-info#pedagog` |

Inte egen flik. Capability med `feature: pedagog` när live; intresse-läge via `rollout_mode` som idag.

### `/family/child/:slug` — Barnprofil (navets viktigaste objekt)

Största UX-lyftet. Ersätter drawer + `/child-settings`.

> **Regel:** Alla barnrelaterade funktioner ska kunna nås via barnprofilen — även om de också finns i andra domäner (hubbar, Hem, För dig).

Samma funktion, olika entréer:

| Funktion | Barnprofil | Annan entré |
|----------|------------|-------------|
| Rapporter | Framsteg → Rapporter | Hem: "Se utveckling →" |
| Schema | Schema | Planering-hub |
| Kvällsrutin | (via rekommendation) | För dig: "Bygg kvällsrutin för Astrid" |
| PIN | PIN-kod | Hem: readiness-kort |

```
🌟 Astrid · 7 år

Idag
⭐⭐⭐☆☆

Översikt
Schema
Belöningar
Framsteg
Barnvy
PIN-kod
```

**Redirect:** `/child-settings?id=…` → `/family/child/:slug`

#### Slug-strategi (låst)

| Regel | Detalj |
|-------|--------|
| **Kanonisk URL** | `/family/child/:slug` där `slug` = normaliserat barnnamn |
| **Normalisering** | Unicode NFC → gemener → å/ä/ö → `a`/`a`/`o` → mellanslag/emoji bort → `[a-z0-9-]` → max 40 tecken |
| **Kollision** | suffix `-2`, `-3`, … eller fallback till kort `child_id` (8 tecken) |
| **Namnbyte** | Slug **ändras inte** automatiskt — stabilitet för bokmärken, push och analytics. Ny slug endast via förälder "Uppdatera länk" i barnprofil (valfritt) eller alltid `child_id` om teamet prioriterar enkelhet |
| **API** | `GET /api/children/:id` returnerar `slug`; `GET /api/children/by-slug/:slug` för uppslag |
| **Analytics** | `page_view` ska logga **både** `slug` och `child_id` i metadata — kontinuitet vid ev. slug-byte |

> **Rekommendation:** använd **stabilt `child_id` i URL** (`/family/child/:id`) om slug-byten blir för komplexa i v1; `slug` som visningsalias i UI. Team väljer en strategi i Sprint 3 — men **blanda inte** id- och slug-URL:er utan explicit redirect-tabell.

#### Deep links & push (`child_id` → kanonisk URL)

Idag: push/deep links kan bära `child_id` (t.ex. `stjarndag://child/{id}`). `deep-link-router.js` känner inte barnprofil-routes ännu.

| Inkommande | v2-mål |
|------------|--------|
| `/child-settings?id=:uuid` | 302 → `/family/child/:canonical` |
| push `metadata.child_id` | resolve via API → `/family/child/:canonical` |
| gammal drawer-deep-link | samma resolve |

**Sprint 3-krav:** uppdatera `deep-link-router.js` `mapDeepPath` + push-handler med id→canonical-resolve — inte bara "vid behov".

### `/settings` — Minimal

```
⚙️ Inställningar

👤 Konto              (profil, e-post)
📦 Prenumeration      (trial, paket, köp — se §4 billing)
🔒 Säkerhet           (PIN-kod — inte "föräldralås" i föräldratext)
🔔 Notiser            (vad som skickas: påminnelser, veckosammanfattning, nyhetsbrev)
📱 App                (push-aktivering, PWA-installation, enhetsbehörigheter)
📦 Data & integritet  (GDPR, export, radering)
```

**Notiser vs App (ägarskap):**

| Sektion | Äger |
|---------|------|
| 🔔 **Notiser** | *Vilka händelser* ska meddelas (preferenser per typ) |
| 📱 **App** | *Hur* enheten tar emot (push-token, PWA, native-behörigheter) |

Undvik dubbel push-UI — en toggle per kanal under Notiser, enhetsaktivering under App.

#### Billing / prenumeration (`billing`-domän)

Var trialande/köpande förälder ser status och kan uppgradera — **ersätter** Extra-fliken (`/upgrade`) i nav.

| Ingång | Route | Syfte |
|--------|-------|-------|
| Min prenumeration | `/settings#prenumeration` | Status: `lifetime_free` · `trial` · `paid` · `grace_period` (från `family_subscriptions` / `subscription_status`) |
| Välj paket | `/upgrade` → redirect `/settings#prenumeration` eller inbäddat | Ersätter dagens Extra-flik |
| Prisinfo | `/pricing-info` | Länk från settings (info, inte nav) |
| Efter köp | `/payment-success` | Redirect till `/settings#prenumeration` |

**Placements (inte flikar):**

| Placering | Innehåll |
|-----------|----------|
| `settings_subscription` | Huvudentré — status + hantera |
| `home_card` | Trial-banner: "X dagar kvar" → settings |
| `for_you_card` | Paketcoach / intresse (kopplat till `rollout_mode`) |
| `avatar_action` | "Prenumeration" när trial < 7 dagar |

Befintliga sidor behålls; v2 **flyttar ägarskap** från Extra/Mer till settings + coach-kort.

### Avatar-meny (sekundärnav)

```
[Pontus ▾]
──────────────
Byt till pedagogvy    ← dual eller educator (se §4.1)
Prenumeration         ← vid trial / grace (billing placement)
Inställningar
Logga ut
```

**Native-krav:** Inställningar och Logga ut finns **inte** i bottennav. Header-avataren **måste** öppna denna meny på **alla** ytor (native tab bar, magic shell, desktop). Smoke-test: native utan sidebar → kan logga ut.

Pedagogvy = byte av **hela UI** (`pedagog-nav.js`), inte sjätte föräldraflik.

### 4.1 Roller — ren pedagog (`account_type = 'educator'`)

| Roll | Default efter login | Ser fem föräldraflikar? |
|------|---------------------|-------------------------|
| `family` | `/dashboard` | Ja |
| `dual` | `/dashboard` (eller senast vald vy) | Ja — avatar → pedagogvy |
| `educator` | **`/pedagog-oversikt`** (`dashboard.js` redirect) | **Nej** — pedagog-nav: Översikt · Idag · Historik · Inställningar |

v2 föräldranav (`PRIMARY_NAV`) gäller **inte** ren pedagog. `nav-config.js` ska exportera separat `PEDAGOG_PRIMARY_NAV` eller pedagogläget läser befintlig `pedagog-nav.js` — **ingen** merge av de två universen.

`switch_pedagog` i avatar: `role: 'dual_or_educator'` — dold för ren `family` utan pedagog-länk.

---

## 5. Paket → placering (framtida, ingen navändring)

| Paket | Feature-slug | Domän | Placements | Synligt som |
|-------|--------------|-------|------------|-------------|
| **Basic** | `for_dig`, m.fl. | diverse | `primary`, hubbar | Fem flikar idag |
| **Billing** | — | `billing` | `settings_subscription`, `home_card`, `avatar_action` | Prenumeration under Inställningar |
| **Reporting** | `reporting` | `child_progress` | `child_profile`, `rewards_hub`, `home_card` | Framsteg → Rapporter |
| **Pedagog** | `pedagog` | `family` | `family` (Pedagoger), `avatar` (vyväxling) | Sektion + pedagog-UI |
| **TEACCH** | `teacch` | `planning` | `planning_hub` | Stöd & verktyg |

**Regel vid lansering:** lägg till rader i `nav-config.js` — refaktorera inte bottennav.

### Pedagogläge (separat universum)

När `pedagog` är live för dual-roll:

- **Inte** ny föräldraflik
- Familj → Pedagoger-sektion
- Avatar → Byt till pedagogvy
- Befintligt pedagog-nav: Översikt · Idag · Historik · Inställningar

---

## 6. Teknisk källa: `nav-config.js`

**Mål:** en källa för all föräldranavigation.

### Nuläge idag — två osynkade källor (måste förenas)

Det finns **två** nav-implementationer med varsin LEGACY + ROLLOUT:

| Källa | LEGACY (default) | ROLLOUT (`rollout_mode !== 'off'`) |
|-------|------------------|-------------------------------------|
| `native-tab-bar.js` | Hem · Schema · För dig · Skatt · **Mer** (5) | + **Extra** (`/upgrade`, `/samarbete`, …) · Mer (6) |
| `parent-magic-shell.js` | Hem · Schema · För dig · **Familj** · Inställn. (5) | Hem · Schema · För dig · Skatt · **Extra** · Mer (6) |

**Problem idag:** LEGACY skiljer redan (Skatt+Mer vs Familj+Inställn.). Fas 1 i v2 måste **förena båda** till samma `PRIMARY_NAV` — inte bara byta namn på en av dem.

`/samarbete`, `/upgrade`, `/notifications` ligger idag under Mer/Extra-paths i `native-tab-bar.js` — v2 flyttar dem till placements (§4).

### Konsumenter (ska läsa samma config)

| Fil | Idag | v2 |
|-----|------|-----|
| `public/js/native-tab-bar.js` | `LEGACY_TABS` / `ROLLOUT_TABS` | `nav-config` → `primary` |
| `public/js/parent-magic-shell.js` | `LEGACY_NAV` / `ROLLOUT_NAV` | `nav-config` → `primary` |
| `public/js/mobile-nav.js` | Parsar sidebar DOM | Sidebar genererad från config |
| Sidebar i `*.html` | Duplicerad per sida | Config eller delad partial |
| Hub-sidor | — | `planning_hub`, `rewards_hub` placements |
| `public/js/session-gate.js` | `PARENT_ONLY_PATHS` | Lägg till `/planning`, `/rewards`, `/family/child/*` |

### Config-struktur (koncept)

```js
// public/js/nav-config.js

/** Primärnav: INTE feature-gatat. Fail-closed på access får inte ta bort kärnflikar. */
export const PRIMARY_NAV = [
  {
    id: 'home',
    href: '/dashboard',
    label: 'Hem',
    icon: '🏠',
    paths: ['/dashboard', '/daily-log', '/'],
  },
  {
    id: 'planning',
    href: '/planning',
    label: 'Planering',
    icon: '📅',
    paths: ['/planning', '/schedule', '/calendar', '/activities', '/library', '/assign-schedule', '/barn-stod'],
  },
  {
    id: 'rewards',
    href: '/rewards',
    label: 'Belöningar',
    icon: '🎁',
    paths: ['/rewards', '/library'], // library belöningsflik — inte /skattkammaren
  },
  {
    id: 'for_you',
    href: '/for-dig',
    label: 'För dig',
    icon: '✨',
    paths: ['/for-dig'],
    // feature: null — basic_app, alltid synlig (§1: feature skapar inte menyitem)
  },
  {
    id: 'family',
    href: '/family',
    label: 'Familj',
    icon: '👨‍👩‍👧',
    paths: ['/family', '/family/child'],
  },
];

/** Aktiv flik — samma logik som native-tab-bar.js isActive() */
export function activeNavItem(pathname, nav = PRIMARY_NAV) {
  const p = (pathname || '/').replace(/\/$/, '') || '/';
  return nav.find((tab) =>
    tab.paths.some((tp) => {
      if (p === tp) return true;
      if (tp === '/dashboard' && p.startsWith('/daily')) return true;
      if (tp !== '/' && p.startsWith(tp + '/')) return true;
      return false;
    })
  );
}

export const CAPABILITIES = [
  {
    id: 'subscription',
    label: 'Prenumeration',
    feature: null,
    domain: 'billing',
    href: '/settings#prenumeration',
    placements: ['settings_subscription', 'home_card', 'avatar_action'],
  },
  {
    id: 'reports',
    label: 'Rapporter',
    feature: 'reporting',
    domain: 'child_progress',
    href: '/reports',
    placements: ['child_profile', 'rewards_hub', 'home_card'],
  },
  {
    id: 'samarbete',
    label: 'Pedagogsamarbete',
    feature: 'pedagog',
    domain: 'family',
    href: '/samarbete',
    placements: ['family_pedagog_interest', 'for_you_card'],
  },
  // … pedagog_invite, teacch_tools
];

export const HEADER_ACTIONS = [
  { id: 'notifications', href: '/notifications', icon: '🔔', placement: 'header_notifications' },
];

export const AVATAR_ACTIONS = [
  { id: 'switch_pedagog', label: 'Byt till pedagogvy', feature: 'pedagog', role: 'dual_or_educator' },
  { id: 'subscription',   label: 'Prenumeration', href: '/settings#prenumeration', placement: 'avatar_action' },
  { id: 'settings',       href: '/settings', label: 'Inställningar' },
  { id: 'logout',         action: 'logout', label: 'Logga ut' },
];
```

### Primärnav vs capabilities — feature-gating

| Lager | Feature-gating? | Vid access-fel |
|-------|-----------------|----------------|
| `PRIMARY_NAV` | **Nej** — alla fem alltid | Visa alla flikar; innehåll i hub kan vara tomt |
| `CAPABILITIES` | **Ja** — per `feature` | Dölj placement, inte flik |
| `HEADER_ACTIONS` | Nej (notiser) | Alltid synlig klocka |

**Motivering:** `for_dig` i `component-feature-map.js` mappar till `basic_app`, men dagens `native-tab-bar.js` feature-gatar För dig med fail-closed → flik försvinner vid nätverksfel. v2 korrigerar detta.

### Filtrering (access + visibility)

```js
function visibleAtPlacement(capability, access, visibility, placement) {
  if (!capability.placements.includes(placement)) return false;
  if (!hasFeatureAccess(access, capability.feature)) return false;
  if (visibility[placement] === false) return false;
  return true;
}

function capabilitiesForPlacement(access, visibility, placement) {
  return CAPABILITIES.filter((c) => visibleAtPlacement(c, access, visibility, placement));
}
```

`access` från befintlig `/api/subscription/access`. `visibility` kan börja som `{}` (allt synligt om access finns) och utökas vid behov (t.ex. TEACCH aktivering).

### Tillgänglighet (a11y) — krav på nav-render

Befintlig `mobile-nav.js` har `role="dialog"` / `aria-expanded`. v2 ska föra vidare:

| Krav | Detalj |
|------|--------|
| Aktiv flik | `aria-current="page"` på aktiv primärnav-länk |
| Bottennav | `role="navigation"` + `aria-label="Huvudnavigering"` |
| Avatar-meny | `aria-haspopup="menu"`, fokusfälla, Escape stänger |
| Hubbar | Rubrik = `h1`, kort = fokuserbara länkar med beskrivande text |
| Tangentbord | Tab-ordning: header (notis, avatar) → innehåll → bottennav |

### Filer att **inte** omskriva

| Fil | Strategi |
|-----|----------|
| `public/js/dashboard.js` | Behåll; lägg readiness i ny `home-readiness.js` |
| `public/js/family.js` | Behåll; barnprofil i ny `child-profile.js` |
| `public/js/schedule.js` | Orörd; hub länkar in |
| `src/routes/*` | Orörd; nya sidor är tunna HTML + hub-JS |

---

## 7. Readiness / Home cards (fas 5)

Delat intelligenslager för Hem, För dig och barnprofil.

### Exempel-kort på Hem

```
⚠️ Astrid saknar PIN
[Sätt PIN]                    → /family/child/astrid#pin

⭐ 2 dagar kvar till belöning
[Visa]                        → /rewards

✨ Rekommenderat: Kvällsrutin
[Skapa]                       → /for-dig eller /planning
```

### Data (klient eller ny endpoint)

```js
// Per barn — pseudostruktur
{
  child_id,
  slug,
  stars_today: 3,
  stars_possible: 5,
  pin_set: false,
  schema_ok: true,
  rewards_ok: true,
  next_action: { label: 'Sätt PIN', href: '/family/child/astrid#pin' },
  for_you_tip: { label: 'Kvällsrutin', href: '/for-dig?intent=evening' },
}
```

Aggregering kan ske i `GET /api/family/readiness` (ny) eller via befintliga endpoints på dashboard-init.

---

## 8. Inkrementell migration

**Princip:** Ny mental modell snabbt. Gamla routes lever tills de fasas ut (redirects).

### Fas 0 — Lås arkitekturen (1–2 dagar)

| Leverans | Detalj |
|----------|--------|
| `public/js/nav-config.js` | `PRIMARY_NAV`, `CAPABILITIES`, `AVATAR_ACTIONS`, hub-definitioner |
| Koppla konsumenter | `native-tab-bar`, `parent-magic-shell`, `mobile-nav` läser config |
| **Inte** bygga om UI ännu | Bara en källa — beteende kan vara oförändrat tills fas 1 |

### Fas 1 — Nytt nav (snabb vinst)

**Från (två källor, båda måste uppdateras):**

| Källa | LEGACY idag | ROLLOUT idag |
|-------|-------------|--------------|
| `native-tab-bar.js` | Hem · Schema · För dig · Skatt · Mer | + Extra · Mer |
| `parent-magic-shell.js` | Hem · Schema · För dig · Familj · Inställn. | + Skatt · Extra · Mer |

**Till (en `PRIMARY_NAV` för alla):**

Hem · Planering · Belöningar · För dig · Familj

Gamla routes fungerar: `/schedule`, `/library`, `/upgrade`, `/samarbete`, `/notifications`.

### Fas 2 — Hubbar

| Route | Innehåll | Strategi |
|-------|----------|----------|
| `/planning` | Tunn hub-sida | Länkar till befintliga sidor |
| `/rewards` | Tunn hub-sida | Redirect `/skattkammaren` → `/rewards` |

Ingen affärslogik flyttas.

### Fas 3 — Familj + barnprofil (största UX-lyftet)

| Leverans | Detalj |
|----------|--------|
| `/family/child/:slug` | Ny barnprofil-sida |
| Rensa `/family` | Endast barn, vuxna, pedagoger |
| Redirect | `/child-settings` → barnprofil |
| Drawer | Avvecklas till förmån för barnprofil (behåll fallback tills analytics OK) |

#### Analytics (krav i fas 3)

Stor UX-förändring — mät adoption, inte bara känsla.

**Baseline före (2 veckor eller retrospektivt):**

| Event | Syfte |
|-------|-------|
| `page_view` `/child-settings` | Gammal barninställningsväg |
| `page_view` `/skattkammaren` | Gammal belöningsväg |
| `family_drawer_open` | Drawer-användning |

**Efter lansering:**

| Event | Syfte |
|-------|-------|
| `page_view` `/family/child/:slug` | Barnprofil-adoption |
| `nav_hub_click` `planning` / `rewards` | Hub-användning vs direktlänkar |
| `readiness_action_click` | Hem-kort leder till handling |
| `child_profile_section` `schema` / `framsteg` / `pin` | Vilka sektioner används |

**Beslutskriterium:** drawer och `/child-settings` kan tas bort när barnprofil ≥ 80% av barnrelaterade sessioner i 14 dagar.

Använd befintlig `analytics_events` (`event_type` + `metadata`) — inga nya tabeller krävs för v1-mätning.

### Fas 4 — Settings-sanering

| Flytta från `/family` | Till |
|-----------------------|------|
| PIN, notiser, GDPR, data, radering | `/settings` |
| Prenumeration / köp (idag `/upgrade` Extra-flik) | `/settings#prenumeration` |
| Pedagog-växling | Avatar-meny |

### Fas 5 — Hem som coach

| Leverans | Detalj |
|----------|--------|
| `home-readiness.js` | Kort på Hem |
| Delad data | Hem + För dig + barnprofil |

### Fas 6 — Paket-placements

Lägg till `CAPABILITIES`-rader när paket går live. Ingen nav-refaktor.

### Fas 7 — Städa gammalt

| Route / mönster | Åtgärd |
|-----------------|--------|
| Extra / Mer-flikar | Ta bort från nav-config |
| `/upgrade` (direktnav) | Redirect → `/settings#prenumeration` |
| `/child-settings` | Permanent redirect |
| `/skattkammaren` (inloggad förälder) | Permanent redirect → `/rewards` (publik demo kvar) |
| Preview-shells i huvudnav | Behåll endast som intresse-banner om `rollout_mode !== off` |

---

## 9. Sprint-plan (låst ordning)

Varje sprint ska lämna appen **användbar** — inte halvfärdig nav med gamla sidor under.

### Sprint 1 — Synlig v2
- [ ] `nav-config.js` med `paths` + `activeNavItem()` + obligatoriska capability-fält
- [ ] **Båda** konsumenter förenade: `native-tab-bar` + `parent-magic-shell` + `mobile-nav` + sidebar
- [ ] Fem flikar live: Hem · Planering · Belöningar · För dig · Familj
- [ ] Header 🔔 → `/notifications` på alla ytor
- [ ] `session-gate.js` uppdaterad
- [ ] `public/sw.js` CACHE_NAME-bump

*Leverans:* användaren ser ny mental modell direkt. Gamla routes fungerar fortfarande.

### Sprint 2 — Hubbar
- [ ] `/planning` tunn hub
- [ ] `/rewards` tunn hub
- [ ] Redirect `/skattkammaren` → `/rewards`
- [ ] `nav_hub_click` analytics

*Leverans:* slut på route-navigation som huvudmodell.

### Sprint 3 — Barnprofil (största kvalitetslyftet)
- [ ] `/family/child/:slug`
- [ ] `/family` rensad (barn, vuxna, pedagoger only)
- [ ] Redirect `/child-settings` → barnprofil
- [ ] Analytics baseline + post-launch events (§8 Fas 3)
- [ ] Drawer kvar som fallback tills mätvärden OK

### Sprint 4 — Settings & avatar
- [ ] `/settings` minimal inkl. **Prenumeration** (`billing`)
- [ ] Flytta operativt från `/family`; `/upgrade` → settings-redirect
- [ ] Avatar-meny (inställningar, logout, pedagog, prenumeration) — **native smoke**
- [ ] Språk: "PIN-kod" / "Säkerhet" — inte "föräldralås" i föräldratext
- [ ] Notiser vs App ägarskap tydliggjort (§4)

### Sprint 5 — Readiness-lager
- [ ] `home-readiness.js` (eller `/api/family/readiness`)
- [ ] Hem-kort: saknas-status, nästa steg
- [ ] För dig kopplat till samma intelligenslager
- [ ] Entréer till barnprofil från Hem och För dig

### Sprint 6+ — Paket-placements
- [ ] `CAPABILITIES` för reporting, pedagog, teacch (dolda tills live)
- [ ] Access + visibility separerat i nav-render
- [ ] Fas 7-städning (Extra/Mer borta, permanenta redirects)

---

## 10. Redirects (sammanfattning)

| Gammal | Ny |
|--------|-----|
| `/skattkammaren` (inloggad förälder) | `/rewards` |
| `/skattkammaren` (utloggad / `?demo=1`) | **Oförändrad** publik demo |
| `/upgrade` | `/settings#prenumeration` |
| `/payment-success` | `/settings#prenumeration` |
| `/child-settings?id=:id` | `/family/child/:canonical` |
| `/home` (om skapad) | `/dashboard` |

Befintliga sidor (`/schedule`, `/library`, `/calendar`, `/assign-schedule`, `/for-dig`, `/reports`, `/samarbete`, `/notifications`, `/pricing-info`) behålls som **mål** för hub-länkar och capabilities.

---

## 11. Relation till befintliga specs

| Dokument | Relation |
|----------|----------|
| `paket-v1.2-spec.md` §6 | v2 **ersätter** fem-fliks-förslaget Idag/Rutiner/Utveckling/Samarbete med domänmodell + placements; pedagog-nav oförändrat |
| `for-dig-spec.md` | För dig förblir `/for-dig` men rollen utökas till coach-lager (§2) |
| `informationsarkitektur-barnapp.md` | Parallell doc för barnsidan; vuxenmeny v2 är föräldrarnas spegel |

---

## 12. Checklista innan merge (per sprint)

- [ ] Alla nav-konsumenter läser `nav-config.js` (inkl. **båda** native + magic)
- [ ] `PRIMARY_NAV` har `paths`; `activeNavItem()` testad på undersidor
- [ ] Inga kärnflikar feature-gatade (`for_dig` utan `feature` på primärnav)
- [ ] Varje `CAPABILITY` har `id`, `feature`, `domain`, `placements`
- [ ] Billing: `/settings#prenumeration` + redirect `/upgrade`
- [ ] `/notifications` via header; `/samarbete` via capability — inte Mer/Extra
- [ ] Rewards-hub: **ingen** länk till `/skattkammaren`; basic tom-state definierad
- [ ] Barnprofil: slug/id-strategi beslutad; `deep-link-router.js` id→canonical
- [ ] Ren `educator` ser inte föräldraflikar; `PEDAGOG_PRIMARY_NAV` separat
- [ ] Avatar-meny nåbar på **native** (logout/settings)
- [ ] a11y: `aria-current` på aktiv flik, avatar-meny tangentbord
- [ ] Access och visibility inte sammanslagna i en boolean
- [ ] Inga tomma hub-ytor för basic-användare (gated items dolda, inte disabled)
- [ ] Barnrelaterade flows nåbara via barnprofil
- [ ] `session-gate.js` inkluderar nya parent-only paths
- [ ] Analytics-events tillagda vid UX-förändring (Sprint 3+)
- [ ] `CACHE_NAME` i `public/sw.js` bumpad
- [ ] Manuell smoke: desktop sidebar, mobil webb, native tab bar, magic view
- [ ] Ingen omskrivning av `/schedule`, `/library`, `/reports` (non-goal §0)

---

## 13. Ägarskap efter migration

| Parent intent | Äger |
|---------------|------|
| Daglig överblick | Hem |
| Planera vardag | Planering |
| Stjärnor & belöningar | Belöningar |
| Coach & rekommendationer | För dig |
| Personer i hushållet | Familj |
| **Ett barns hela värld** | **Barnprofil** (kanonisk väg för allt barnrelaterat) |
| Utveckling över tid | Framsteg (domän under barnprofil) |
| Konto & säkerhet | Inställningar / avatar |
| Prenumeration & köp | Inställningar → Prenumeration (`billing`) |
| Notis-inkorg | Header 🔔 → `/notifications` |
| Pedagogsamarbete (info) | Familj / För dig capability → `/samarbete` |

**Slutsats:** Navigationen växer inte när paket kommer — **djupet** i varje värld växer. Barnprofilen är navets viktigaste objekt; hubbar och Hem är entréer, inte ägare.

---

## 14. Granskningslogg (2026-06-21)

Kodbasavstämning mot `origin/main`. Åtgärdade brister:

| # | Brist | Åtgärd i detta doc |
|---|-------|-------------------|
| A1 | Ingen billing-hemvist | `billing`-domän, `/settings#prenumeration`, redirects `/upgrade` |
| A2 | `/samarbete`, `/notifications` utan placering | Capabilities + header 🔔 |
| A3 | Rewards-hub loop via `/skattkammaren` | Hub pekar på `/library`; redirect endast för gamla bokmärken |
| B4 | `PRIMARY_NAV` saknar `paths` | `paths` + `activeNavItem()` i §6 |
| B5 | `for_dig` feature-gatad på primärnav | `feature: null` på kärnflikar |
| B6 | Felaktig "Från"-beskrivning i Fas 1 | Två källor LEGACY/ROLLOUT tabell |
| C7–8 | Slug + deep links underspecificerade | §4 barnprofil + Sprint 3-krav |
| D9 | Ren educator ospecificerad | §4.1 — `/pedagog-oversikt`, separat nav |
| E10–14 | Avatar native, push-dubbel, a11y, ikon, tomma states | §4, §6, §12 |
