# 4.6 UC008 — Slutföra aktivitet

**Product Behavior Specification — Use Case**  
**Status:** Se katalog i [README.md](README.md)  
**Mall:** [UC-TEMPLATE.md](UC-TEMPLATE.md)

---


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
