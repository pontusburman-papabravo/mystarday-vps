# 4.5 UC007 — Starta aktivitet

**Product Behavior Specification — Use Case**  
**Status:** Se katalog i [README.md](README.md)  
**Mall:** [UC-TEMPLATE.md](UC-TEMPLATE.md)

---


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
