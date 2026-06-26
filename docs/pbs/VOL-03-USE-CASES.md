# Volym 3 — Use cases

**PBS Version 1.0**  
**Målstorlek:** 150–200 sidor · 80–120 use cases à 4–8 sidor  
**Status:** v1.0 — mall + katalog + 8 fulla UC; övriga i 3.1–3.x  

> **Målgrupp:** UX, utvecklare, QA/test, produkt.

### Utbyggnadsplan

| Batch | UC | Status |
|-------|-----|--------|
| 3.0 | UC001–UC008 (8 st) | ✅ Full spec i detta dokument |
| 3.1 | UC009–UC020 | Planerat |
| 3.2 | UC021–UC050 | Planerat |
| 3.3 | UC051–UC080 | Planerat |
| 3.4 | UC081–UC120 | Horisont |

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

### Horisont (UC061–UC120) — planerad i PBS 2.0

| ID | Namn | Generation |
|----|------|------------|
| UC061 | Byt PresentationProfile (barn → tonåring) | Gen 2 |
| UC062 | Självregistrering ung vuxen | Gen 3 |
| UC063 | Integritetsnivå (stödperson ser sammanfattning) | Gen 2 |
| UC064 | Eget konto ungdom 13+ | Gen 2 |
| UC065 | AI föreslår veckoplan (vuxen) | Gen 3 |
| UC066 | Vanespårning utan gamification | Gen 3 |
| UC067 | Energinivå-justerad dag | Gen 3 |
| UC068 | Medicin/rutin-påminnelse (vuxen, valfritt) | Horisont |
| UC069 | Hushållsprojekt (par/roommates) | Gen 4 |
| UC070 | Terapeut read-only dashboard | Horisont |
| UC071–UC080 | *Reserverade: coach & AI utökning* | 2.0 |
| UC081–UC090 | *Reserverade: delning & professionellt stöd* | 2.0 |
| UC091–UC100 | *Reserverade: livsövergångar* | 2.0 |
| UC101–UC110 | *Reserverade: organisation/skola* | Horisont |
| UC111–UC120 | *Reserverade: plattform & compliance* | Horisont |

> Varje UC i 061–120 ska skrivas i **full mall** (4–8 sidor) innan den markeras live.

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
