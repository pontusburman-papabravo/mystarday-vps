# First Success v2 — produktfilosofi

> **Vi bygger inte en app för att skapa rutiner. Vi bygger en produkt som hjälper en familj att lyckas med nästa lilla steg. Varje designbeslut ska göra det steget enklare, tydligare eller mer motiverande. Om en förändring inte bidrar till det hör den inte hemma i version 2.**

Internt projektnamn: **First Success** (inte "Instant Activation").  
Instant activation är en taktik. First Success är målet.

**Detaljdokument:**

| Dokument | Innehåll |
|----------|----------|
| [first-success/brain.md](first-success/brain.md) | State machine, facts, API (utan UI) |
| [first-success/day0.md](first-success/day0.md) | Registrering, auto-rutin, success screen |
| [first-success/coach.md](first-success/coach.md) | Coach, intent, voice-katalog |
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

**Stjärnan är en proxy — inte helig.** Product Brain ska inte hårdkoda att endast `first_completion_at` räknas som First Success om andra bevis finns. Implementationen kan variera; målet är lättnad.

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

---

## 4. Definition of Done

En förändring är klar när:

- En ny användare förstår den utan instruktion.
- Den kräver noll onödiga beslut.
- Den leder vidare till nästa steg.
- Den känns färdig första gången.
- Den ökar sannolikheten för **första lättnaden** (inte bara en teknisk proxy).
- Den minskar osäkerhet ("jag gör rätt").

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
Family facts (DB)
        ↓
Product Brain (state machine)
        ↓
Outputs: moment + reason + recommendedAction + milestone?
        ↓
Kanaler: coach, voice-katalog, push, email, celebration
```

**Brain känner inte UI.** Ingen headline/cta/route i Brain-API. Se [brain.md](first-success/brain.md) och [coach.md](first-success/coach.md).

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

Kort celebration när First Success-bevis inträffar (ofta första aktiviteten). Konfetti. Sedan coach. Det är där föräldern känner: *"Det här kanske faktiskt fungerar."*

---

## 8. Anpassa familjen

Wizard + ACT-1 flyttas hit. Blockerar inte dag 0. Triggas av coach eller Planering.

---

## 9. Copyprinciper

Undvik: konfigurera, skapa schema, sätt upp, bygg.  
Använd: börja, visa barnet, första rutin, nästa steg, klart, fortsätt.

---

## 10. Byggordning

```
1. Dokumentation (denna mapp)
2. Facts + Product Brain state machine + API
3. Dag 0 backend (se day0.md)
4. Success screen + handoff
5. Coach + voice-katalog (se coach.md)
6. Celebration vid First Success
7. Push/nudge kopplade till moment (samma brain)
8. Landning (se landing.md — parallellt spår)
9. Flytta wizard → Anpassa familjen
10. A/B first_success_v2
```

---

## 11. Mappning mot befintlig kod

| Befintligt | First Success |
|------------|---------------|
| `family_activation_state` | Del av facts |
| `GET /api/family/readiness` | Ersätts av `first-success` |
| `onboarding.js` + wizard | Bypass dag 0 |
| Schedulers (nudge, push, win-back) | Konsumera `moment` från Brain |

---

## 12. Vad vi inte gör i v2

Leaderboards, föräldra-XP, fler beslut vid registrering, optimera för stjärnor utan verklig rutin, optimera för "onboarding klar" utan First Success.

---

## 13. Sammanfattning

**Vi bygger en produkt som hjälper en familj att lyckas med nästa lilla steg — mäter framgång genom om vardagen blev lättare, med tydliga proxies tills vi kan fråga dem direkt.**
