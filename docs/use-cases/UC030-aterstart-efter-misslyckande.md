# 4.9 UC030 — Återstart efter misslyckande

**Product Behavior Specification — Use Case**  
**Status:** Se katalog i [README.md](README.md)  
**Mall:** [UC-TEMPLATE.md](UC-TEMPLATE.md)

---


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