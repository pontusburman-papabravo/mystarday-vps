# 4.2 UC001 — Skapa konto

**Product Behavior Specification — Use Case**  
**Status:** Se katalog i [README.md](README.md)  
**Mall:** [UC-TEMPLATE.md](UC-TEMPLATE.md)

---


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
