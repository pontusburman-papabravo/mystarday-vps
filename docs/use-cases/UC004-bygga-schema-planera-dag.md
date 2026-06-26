# 4.4 UC004 — Bygga schema / planera dag

**Product Behavior Specification — Use Case**  
**Status:** Se katalog i [README.md](README.md)  
**Mall:** [UC-TEMPLATE.md](UC-TEMPLATE.md)

---


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
