# Volym 2 — Roller & domänmodell

**PBS Version 1.0**  
**Målstorlek:** 50–70 sidor (vid full utbyggnad)  
**Status:** v1.0 grund  

> **Målgrupp:** UX, produkt, utvecklare (begreppsnivå), pedagoger, terapeuter.

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


---

## 3.11 Presentationsprofil per roll (översikt)

Utöver ansvar och ton styr varje roll **informationsnivå**, **färgton** och **animationsnivå** i Presentation Layer. Detaljer per `PresentationProfile` i domänmodellen.

| Roll | Informationsnivå | Färgton | Animationer |
|------|------------------|---------|-------------|
| **Barn** | Ett steg i taget; max 5 synliga uppgifter | Ljus, varm, hög kontrast; emojis tillåtna | Ja — kort, lagom; konfetti vid complete |
| **Ungdom** | NU + idag + veckoblick | Modern, dämpad; dark mode möjlig | Subtila; inga barnsliga effekter |
| **Ung vuxen** | Prioriterad lista + mål | Neutral, professionell | Minimal |
| **Vuxen** | Tasks + mål + insikter | Minimal, lugn | Nästan ingen |
| **Förälder** | Överblick + drill-down | Ljus, lugn; inte lekfull som barnvy | Låg — fokus på handling |
| **Pedagog** | Elevcentrerad, read-heavy | Professionell, tillgänglig | Ingen gamification i nav |
| **Terapeut** | Aggregerat + samtyckt detalj | Diskret, kliniskt rent | Ingen |

### Tillåtet / inte tillåtet (alla executor-roller)

| Tillåtet | Inte tillåtet |
|----------|---------------|
| Hoppa över, pausa, flytta aktivitet | Skuldbeläggande copy |
| Be om hjälp via stödperson | Offentlig jämförelse mellan syskon |
| Dölja progress temporärt (teen+) | Radera historik som straff |

