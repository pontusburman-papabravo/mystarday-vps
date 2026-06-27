# First Success v2 — produktfilosofi

> **Vi bygger inte en app för att skapa rutiner. Vi bygger en produkt som hjälper en familj att lyckas med nästa lilla steg. Varje designbeslut ska göra det steget enklare, tydligare eller mer motiverande. Om en förändring inte bidrar till det hör den inte hemma i version 2.**

Internt projektnamn: **First Success** (inte "Instant Activation").  
Instant activation är en taktik. First Success är målet.

**Relaterade dokument:**

| Dokument | Innehåll |
|----------|----------|
| [PRODUCT-CONSTITUTION.md](PRODUCT-CONSTITUTION.md) | Fem regler alla PR:s testas mot |
| [first-success/ENGINE_SPEC.md](first-success/ENGINE_SPEC.md) | **Product Engine** — full teknisk spec + implementation |
| [first-success/brain.md](first-success/brain.md) | Domänöversikt (facts → needs) |
| [first-success/coach.md](first-success/coach.md) | Presentation + voice-katalog |
| [first-success/day0.md](first-success/day0.md) | Dag 0-flöde |
| [first-success/landing.md](first-success/landing.md) | Landningssida (eget spår) |

---

## 1. Bakgrund

Produktdata visar att de flesta familjer aldrig når produktens kärnvärde. Över 80 % faller bort innan de upplever att appen hjälpte dem i vardagen.

Problemet är inte att produkten saknar funktioner. Problemet är att **första värdet kommer för sent**.

Vi har ~200 familjer. Varje steg ska behandlas som ett experiment mot First Success.

---

## 2. Mission

### Det vi bygger mot

> **First Success = första gången familjen upplever att appen hjälpte dem i vardagen** — att vardagen blev lite enklare, lugnare eller tydligare.

Det går inte att mäta "lättnad" direkt. Vi använder **proxies**. Proxyn är aldrig produkten.

### First Success kan uppnås genom (minst en)

| Bevis | Betydelse |
|-------|-----------|
| Första stjärnan / första aktivitet klar | Loopen startade |
| Första kompletta rutinen (alla steg en dag) | Rutinen fungerade i praktiken |
| Första morgon/kväll utan avbrott (föräldrarapporterat eller infererat) | Lättnad i vardagen |

**Stjärnan är en proxy — inte helig.** Målet är lättnad, inte en specifik knapptryckning.

### Mätning

| Nivå | Metric |
|------|--------|
| Mission | Familjen kände att vardagen blev lite enklare (kvalitativt) |
| Primär proxy | `first_success_within_48h` (minst ett bevis ovan) |
| Sekundär proxy | `first_complete_routine` |
| Retention | Dag 2 + dag 7 |
| Kvalitativ (senare) | "Kändes morgonen lättare?" |

### Produktprincip

> **Användaren ska uppleva värde innan de behöver fatta beslut.**

### Psykologisk princip (förtroende)

> **Produkten ska hela tiden minska osäkerhet.**

Efter varje steg ska föräldern känna: *"Jag verkar göra rätt."*  
Om användaren undrar "gör jag rätt?" har produkten inte gjort sitt jobb. Det påverkar copy, milestones, coach och tomma tillstånd.

### Produktfilosofi (skiftet)

| Från | Till |
|------|------|
| En app där föräldrar bygger rutiner | En app som leder familjen mot nästa lilla framgång |
| Verktyg som reagerar | Guide som leder |
| Tomma tillstånd + konfiguration | Färdigt + nästa steg |
| Föräldern är huvudpersonen | **Barnet är huvudpersonen. Föräldern är hjälparen.** |

---

## 3. Produktlagar

**Lag 0** — Framgång mäts vid familjens handling i vardagen, inte vid förälderns konfiguration.

**Lag 1** — Användaren ska aldrig mötas av en tom sida.

**Lag 2** — Användaren ska aldrig behöva fundera på nästa steg.

**Lag 3** — Varje nytt beslut måste motiveras av att användaren redan upplevt värde.

**Lag 4** — Barnet är huvudpersonen. Föräldern är hjälparen.

**Lag 5** — Appen ska kännas mer färdig efter registrering än före.

**Lag 6** — Varje knapp ska föra användaren närmare First Success — inte närmare fler inställningar.

**Lag 7** — Produkten ska alltid minska osäkerhet. Om användaren undrar "gör jag rätt?" har produkten inte gjort sitt jobb.

Se även [PRODUCT-CONSTITUTION.md](PRODUCT-CONSTITUTION.md) — fem övergripande regler för alla produktbeslut.

---

## 4. Definition of Done

En förändring är klar när:

- En ny användare förstår den utan instruktion.
- Den kräver noll onödiga beslut.
- Den leder vidare till nästa steg.
- Den känns färdig första gången.
- Den ökar sannolikheten för **första lättnaden** (inte bara en teknisk proxy).
- Den minskar osäkerhet ("jag gör rätt").
- Den kan motiveras mot minst en punkt i Product Constitution.

---

## 5. Ny kärnloop

```
Registrering → Barn + rutin finns redan → Barn/familj aktivitet → First Success → Anpassa
```

Se [day0.md](first-success/day0.md) för dag 0.

**Designmål:** Bevis på värde inom minuter.  
**Experiment-KPI:** `first_success_within_48h`.

---

## 6. Arkitektur (översikt)

```
Facts → Inference → State → Needs → Policy → Presentation
                              ↑
                    Outcome Feedback Loop
```

**Engine** (`src/core-engine/`) är den deterministiska beslutsmotorn. Se [ENGINE_SPEC.md](first-success/ENGINE_SPEC.md).

| Lager | Ansvar |
|-------|--------|
| Facts / Inference / State / Needs | Beskriver familjen (domän) |
| Policy | Strategi + experiment (need → action) |
| Presentation | Coach, push, UI, voice (dumma renderare) |
| Outcome | Vad som hände efter action (lärande) |

**Brain beskriver användaren. Policy beskriver produkten. UI projicerar.**

Golden contracts: `npm run test:engine`. Shadow-logic guard: `npm run check:engine-shadow`.

---

## 7. Tomma tillstånd, skärmens hjärta, milestones

### Inga tomma tillstånd

| ❌ Arbete | ✅ Framsteg |
|----------|------------|
| Inga aktiviteter | Vi har gjort en första rutin åt er |
| Ingen belöning | Första belöningen väntar |

### Varje skärm har ett hjärta

1. Vad ska jag göra?  
2. Varför spelar det roll?  
3. Vad händer när jag är klar?

### Milestones (firanden, inte spel)

Första aktiviteten, första dagen, tre dagar i rad, första veckan, första belöningen.  
Vecka-mot-vecka för familjen — inte leaderboard mot andra.

Milestones = vad vi åstadkommit. Coach = vad vi gör nu. Inte på samma skärm.

### Aha-ögonblicket

Kort celebration när First Success-bevis inträffar. Konfetti med `tone: celebration`. Sedan coach. Det är där föräldern känner: *"Det här kanske faktiskt fungerar."*

---

## 8. Anpassa familjen

Wizard + ACT-1 flyttas hit. Blockerar inte dag 0. Triggas av coach (`PERSONALIZE`) eller Planering.

---

## 9. Copyprinciper

Undvik: konfigurera, skapa schema, sätt upp, bygg.  
Använd: börja, visa barnet, första rutin, nästa steg, klart, fortsätt.

Voice-katalogen äger all användarcopy. Varje post har `tone` — se [coach.md](first-success/coach.md).

---

## 10. Vad vi inte gör i v2

Leaderboards, föräldra-XP, fler beslut vid registrering, optimera för stjärnor utan verklig rutin, optimera för "onboarding klar" utan First Success, produktstrategi i Brain-lagret.

---

## 11. Sammanfattning

**Vi bygger en produkt som hjälper en familj att lyckas med nästa lilla steg — mäter framgång genom om vardagen blev lättare, med tydliga proxies tills vi kan fråga dem direkt.**

Arkitekturen separerar domän (Brain) från strategi (Coach) från presentation (voice). Det gör systemet hållbart när produkten växer — och experiment kan köras utan att skriva om kärnlogiken.
