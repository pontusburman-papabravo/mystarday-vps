# 04 — Domain Model

**Product Bible — Kapitel 4**

---

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
