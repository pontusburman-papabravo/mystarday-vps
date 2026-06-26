# 4.8 UC014 — Coach interagerar

**Product Behavior Specification — Use Case**  
**Status:** Se katalog i [README.md](README.md)  
**Mall:** [UC-TEMPLATE.md](UC-TEMPLATE.md)

---


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
