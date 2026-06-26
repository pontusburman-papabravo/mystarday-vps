# 4.7 UC009 — Hoppa över aktivitet

**Product Behavior Specification — Use Case**  
**Status:** Se katalog i [README.md](README.md)  
**Mall:** [UC-TEMPLATE.md](UC-TEMPLATE.md)

---


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
