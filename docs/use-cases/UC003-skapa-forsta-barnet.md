# 4.3 UC003 — Skapa första barnet

**Product Behavior Specification — Use Case**  
**Status:** Se katalog i [README.md](README.md)  
**Mall:** [UC-TEMPLATE.md](UC-TEMPLATE.md)

---


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
