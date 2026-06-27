# First Success v2 — product spec

> **Vi bygger inte en app för att skapa rutiner. Vi bygger en produkt som hjälper en familj att lyckas med nästa lilla steg. Varje designbeslut ska göra det steget enklare, tydligare eller mer motiverande. Om en förändring inte bidrar till det hör den inte hemma i version 2.**

Internt projektnamn: **First Success** (inte "Instant Activation").  
Instant activation är en taktik. First Success är målet.

---

## 1. Bakgrund

Produktdata visar att de flesta familjer aldrig når produktens kärnvärde.

Nuvarande funnel:

```
Registrering → Onboarding → Skapa schema → Barn använder → Första stjärnan
```

Över 80 % faller bort innan första stjärnan. Produkten misslyckas innan användaren hunnit uppleva värdet.

Problemet är inte att produkten saknar funktioner. Problemet är att **första värdet kommer för sent**.

Landningssidan och produkten berättar två olika historier:

| Landning / copy idag | Vad föräldern köpte |
|----------------------|---------------------|
| "Bygg rutiner" | "Hjälp mig få morgonen att fungera" |
| Du planerar, konfigurerar, skapar | Barnet ska förstå vad som händer nu |

Vi har ~200 familjer. Vi behöver inte gissa lika mycket längre. Varje steg ska behandlas som ett experiment mot First Success.

---

## 2. Mission

### Det vi faktiskt bygger mot

> **First Success = första gången familjen upplever att appen hjälpte dem i vardagen.**

Det går inte att mäta "lättnad" direkt. Därför använder vi **proxies** — men proxyn är aldrig produkten.

| Nivå | Metric | Roll |
|------|--------|------|
| **Mission** | Familjen kände att vardagen blev lite enklare | Det vi optimerar för (kvalitativt) |
| **Primär proxy** | Första stjärnan inom 48 timmar | Ledande indikator — loopen startade |
| **Sekundär proxy** | Första komplett genomförda rutin (alla steg en dag) | Närmare verklig nytta |
| **Retention** | Återkomst dag 2 och dag 7 | Lättnad som återkommer |
| **Kvalitativ (senare)** | "Kändes morgonen lättare?" i enkät/veckomejl | Validerar proxyn |

**Skriv aldrig i dokumentation eller copy som om stjärnan är produkten.** Stjärnan är bevis — inte målet.

### Produktprincip

> **Användaren ska uppleva värde innan de behöver fatta beslut.**

Om användaren måste tänka innan barnet fått sin första framgång har vi gjort onboarding för tidigt.

### Produktfilosofi (skiftet)

| Från | Till |
|------|------|
| En app där föräldrar bygger rutiner | En app som leder familjen mot nästa lilla framgång |
| Verktyg som reagerar på användaren | Guide som leder användaren |
| Tomma tillstånd + konfiguration | Färdigt + nästa steg |
| Föräldern är huvudpersonen | **Barnet är huvudpersonen. Föräldern är hjälparen.** |

Det här är större än en ny registreringsprocess. Det påverkar onboarding, Hem, push, mejl, landning, rapporter, pedagogläge och framtida AI.

---

## 3. Produktlagar

Använd vid osäkerhet i design, copy och code review.

**Lag 1** — Användaren ska aldrig mötas av en tom sida.

**Lag 2** — Användaren ska aldrig behöva fundera på nästa steg.

**Lag 3** — Varje nytt beslut måste motiveras av att användaren redan upplevt värde.

**Lag 4** — Barnet är huvudpersonen. Föräldern är hjälparen. Inte tvärtom.

**Lag 5** — Appen ska kännas mer färdig efter registrering än före registrering.

**Lag 6** — Varje knapp ska föra användaren närmare First Success — inte närmare fler inställningar.

**Lag 0** — Framgång mäts vid barnets (familjens) handling i vardagen, inte vid förälderns konfiguration.

---

## 4. Definition of Done

En förändring är **inte klar** när den fungerar tekniskt.

Den är klar när:

- En ny användare kan förstå den utan instruktion.
- Den kräver noll beslut om den inte absolut måste.
- Den leder vidare till nästa steg.
- Den känns färdig första gången den visas.
- Den ökar sannolikheten att familjen upplever **första lättnaden** (proxy: första stjärnan / komplett rutin).

---

## 5. Ny kärnloop

```
Registrering
    ↓
Barn finns redan
    ↓
Första rutin finns redan
    ↓
Barn får första stjärnan
    ↓
Föräldern ser att det fungerar  ← First Success (proxy)
    ↓
Föräldern vill anpassa
```

Inte tvärtom.

**Designmål:** Barnet ska kunna få sin första stjärna inom två minuter efter registrering.  
**Experiment-KPI:** Andel familjer med första stjärna inom 48 timmar.

---

## 6. Dag 0

### Registrering

Behåll endast:

- Förälderns namn
- E-post
- Lösenord
- Barnets namn

Inga fler frågor.

### Direkt efter registrering (backend)

Skapa automatiskt i samma flöde:

- Ett barn
- PIN
- Standardavatar (emoji)
- Morgon- eller kvällsrutin (se tid-på-dygn nedan)
- Standardbelöningar (redan seedade vid register idag)
- Första skattkammaren ifylld

Ingen wizard. Ingen konfiguration. Ingen AI. Ingen mallväljare.

### Standardrutin (exempel morgon)

- Vakna
- Toalett
- Klä på dig
- Frukost
- Borsta tänderna

Ska gå att använda direkt — inte vara en tom mall.

### Tid på dygn (landning vs produkt)

Landningen kan säga "ikväll". Standardrutin måste matcha förväntan:

| Registrering | Default-rutin | Copy |
|--------------|---------------|------|
| Före kl. 15 | Morgon | "Imorgon bitti är [barnets] rutin redo" |
| Efter kl. 15 | Kväll | "Ikväll kan [barnet] följa sin första rutin" |

### Success screen (endast detta)

```
# Ella är redo ⭐

Första rutinen är skapad.

[ Visa barnet ]          ← primär CTA, alltid

Ändra rutinen            ← sekundär, inte blockerande
```

### Barnets första upplevelse

Barnet ska direkt se (ingen tom vy):

```
NU        Vakna
NÄSTA     Klä på dig
SENARE    Frukost
```

Ingen onboarding för barnet. Barnet ska kunna trycka klart första aktiviteten direkt.

### Undantag (inte dag 0 instant)

| Flöde | Beteende |
|-------|----------|
| Ny familj (v2) | First Success dag 0 |
| Lägg till barn | Befintligt add-child-flöde |
| Pedagog | Utanför scope |
| Befintliga fastnade familjer | Coach "fortsätt där ni slutade" |

### Experiment

```
feature_flag: first_success_v2
A/B: legacy wizard vs first success dag 0
Primär proxy: first_star_within_48h
```

---

## 7. Progression (intern modell)

Appen är en resa. Efter varje steg visas **exakt ett** nytt steg. I UI: säg **"Nästa steg"** — aldrig "Mission".

| Ordning | Internt | Användaren ser |
|---------|---------|----------------|
| 1 | SHOW_CHILD | Visa barnet första rutinen |
| 2 | FIRST_STAR | Första stjärnan (tillsammans) |
| 3 | COMPLETE_FIRST_DAY | Första morgonen/kvällen klar |
| 4 | ADD_EVENING | Lägg till kvällsrutin |
| 5 | INVITE_PARENT | Bjud in andra föräldern |
| 6 | ADD_REWARD | Lägg till / anpassa belöning |
| 7 | CUSTOMIZE_ROUTINE | Anpassa rutiner (full "Anpassa familjen") |

Användaren ska aldrig behöva fundera på vad som är viktigast.

---

## 8. Coach & API

Hem och förälderns startsida visar **aldrig mer än EN** rekommenderad handling. Inga parallella kort, inga checklistor med lika viktiga CTAs.

### API-form (bygg riktigt från dag ett)

Inte en statisk sträng. Ett rikt objekt så copy, prioritet och A/B kan ändras server-side:

```json
{
  "moment": "FIRST_STAR",
  "voice": {
    "headline": "Fantastiskt! Ella klarade första steget.",
    "body": "Imorgon fortsätter vi."
  },
  "nextAction": {
    "id": "ADD_EVENING",
    "priority": 91,
    "reason": "family_completed_three_mornings",
    "headline": "Lägg till kvällsrutinen",
    "body": "Då blir läggningen lika tydlig som morgonen.",
    "cta": "Lägg till kväll",
    "route": "/planning?focus=evening",
    "experiment": null
  },
  "milestone": {
    "id": "first_star",
    "celebrate": true,
    "title": "Ella klarade sin första aktivitet!",
    "body": "Bra början. Fortsätt så."
  }
}
```

Klienten renderar. Den beslutar inte.

### Prioritering (v1 regelbaserad)

```
1. SHOW_CHILD           barn aldrig öppnat barnvy
2. FIRST_STAR           0 completions någonsin
3. COMPLETE_FIRST_DAY   påbörjad men inte allt klart idag
4. ADD_EVENING          ≥1 dag med aktivitet, ingen kväll i schema
5. INVITE_PARENT        ≥2 dagar aktivitet, en vuxen
6. ADD_REWARD           stjärnor men belöningar ej använda/anpassade
7. CUSTOMIZE_ROUTINE    vecka 1+ eller ovan klart
8. null                 coachen tyst — appen "bara funkar"
```

v1 = regler. Senare: A/B på copy, omprioritering, ev. ML ovanpå samma struktur.

---

## 9. Product Brain

**Det viktigaste tekniska beslutet i v2.**

Idag är coach, milestones, empty states, product voice, push, nudge och landning **separata implementationer**. Det ger en splittrad produkt.

Bygg **ett lager**:

```
Family facts (DB + events)
        ↓
   Product Brain
   (moment + transitions + rules)
        ↓
   Outputs (samma moment, samma ögonblick)
   ├── coach.nextAction
   ├── voice.headline / body
   ├── milestone (celebration)
   ├── push (om tillämpligt)
   ├── email (om tillämpligt)
   └── (senare) landing personalization
```

### Exempel: familjen når FIRST_STAR

| Kanal | Samma budskap |
|-------|----------------|
| Coach | "Lägg till kvällsrutinen…" |
| Hem-röst | "Fantastisk början." |
| Push | "Ella klarade första steget ⭐" |
| Milestone-modal | 🎉 Första stjärnan + kort copy |
| Veckomejl (senare) | "Er första rutin fungerar." |

En `moment`. Inte sex `if (first_star)` i olika filer.

### Moments (v1 — få, stabila)

```
REGISTERED
ROUTINE_READY
CHILD_SHOWN
FIRST_STAR
FIRST_DAY_COMPLETE
STREAK_3
WEEK_1
EVENING_ADDED
CO_PARENT_INVITED
CUSTOMIZING
```

### Teknisk placering

```
src/lib/product-brain/
  index.js              computeOutputs(familyId)
  moments.js            enum + transitions
  rules-coach.js        nextAction candidates + priority
  rules-voice.js        headline/body per moment
  rules-milestones.js
  templates-push.js     (v1 optional)
```

API:

```
GET /api/family/first-success
```

Ersätter gradvis splittrad `readiness` + ad hoc copy i klienten för **förälderns primära upplevelse**.

Schedulers (nudge, win-back, push) ska **konsumera samma moment** — inte egna parallella regler för samma livshändelse.

---

## 10. Produkten ska kännas levande

Reagera inte bara — **led**. Små texter vid rätt tillfälle:

| Moment | Röst (exempel) |
|--------|----------------|
| Efter registrering | 🌟 Ellas första rutin är redo. |
| Efter första stjärnan | Fantastiskt! Ella klarade första steget. |
| Efter första dagen | Imorgon fortsätter vi. |
| Efter tre dagar | Nu verkar rutinen börja sätta sig. |
| Efter en vecka | Nu kan ni göra rutinen mer personlig. |

Drivs av Product Brain (`voice`), inte hårdkodad i varje vy.

---

## 11. Inga tomma tillstånd

Hårdkrav — inte designönskan.

| ❌ Arbete | ✅ Framsteg |
|----------|------------|
| Inga aktiviteter | Vi har gjort en första rutin åt er |
| Ingen belöning | Första belöningen väntar |
| Lägg till barn | Nu hjälper vi Ella |

Tomma tillstånd känns som arbete. Fyllda tillstånd känns som framsteg.

Backend returnerar inte tomma listor på dag 0 utan defaults.

---

## 12. Varje skärm har ett "hjärta"

Tre frågor varje skärm måste besvara:

1. **Vad** är det viktigaste jag ska göra?
2. **Varför** spelar det roll?
3. **Vad händer** när jag är klar?

Exempel:

- ❌ "Lägg till kvällsrutin"
- ✅ "Lägg till kvällsrutinen så blir läggningen lika tydlig som morgonen."

---

## 13. "Aha"-ögonblicket: första stjärnan

Hela produkten i två sekunder. Inte schemaeditorn. Inte AI.

```
🎉

Ella klarade sin första aktivitet!

Bra början. Fortsätt så.

[ Fortsätt ]
```

Lite konfetti. Kort animation. Sedan coach visar nästa steg.

Samma upplevelse oavsett legacy / ACT-1 / first success. Triggas av `first_completion_at`. Visas för föräldern (och mild celebration i barnvy).

Det är där föräldern känner: *"Det här kanske faktiskt fungerar."*

---

## 14. Milestones

Firanden — inte spel. Inte XP. Inte leaderboards.

- ⭐ Första stjärnan
- 🎉 Första dagen
- 🏅 Tre dagar i rad
- 🌟 Första veckan
- 🎁 Första belöningen utdelad

**Vecka mot vecka** (en rad på Hem, inte tävling mot andra):

> Förra veckan: 8 stjärnor → Den här veckan: 14 ⭐

Milestones = vad vi åstadkommit. Coach = vad vi ska göra nu. Blanda inte ihop dem på samma skärm.

---

## 15. Anpassa familjen

Nuvarande onboarding (wizard, ACT-1 starter-plan, mallar, AI) flyttas hit. Byt namn. Blockera inte dag 0.

Innehåll:

- Kvällsrutiner
- Veckoschema
- Belöningar
- Mallar / AI-schema
- Medförälder
- Barnvy-inställningar
- Avancerat

Triggas av coach (`CUSTOMIZE_ROUTINE`) eller aktivt val i Planering — inte vid registrering.

---

## 16. Landningssida

Samma historia som appen.

| ❌ | ✅ |
|----|-----|
| Bygg rutiner | Ikväll kan ditt barn följa sin första rutin |
| Du bygger, planerar, konfigurerar | Ditt barn ser vad som händer nu |
| Tre steg: bygg → följ → stjärnor | Barnet följer → det fungerar → du anpassar senare |

**CTA:** Skapa konto gratis  
**Underrubrik:** Kom igång på mindre än två minuter.

Hero, citat från riktiga familjer, barnvy-exempel (NU/NÄSTA/SENARE) — upp. Veckoschema, push, pedagog, paket — ner eller egna sidor.

---

## 17. Copyprinciper

Undvik: konfigurera, skapa schema, sätt upp, bygg.

Använd: börja, visa barnet, första rutin, nästa steg, klart, fortsätt.

---

## 18. Produktregel (per skärm)

Varje skärm ska kunna besvara:

> **Vad är den viktigaste saken användaren ska göra just nu?**

Om skärmen visar fler än ett lika viktigt nästa steg — förenkla.

---

## 19. Byggordning

```
1. Detta dokument (sanning)
2. product-brain v0: moments + computeOutputs + GET /api/family/first-success
3. Dag 0 backend (barn + rutin + rewards atomiskt vid register)
4. Success screen + "Visa barnet"
5. Hem: voice + nextAction (en källa)
6. Första-stjärnan-celebration (milestone output)
7. Koppla push/nudge till samma moment
8. Landning copy
9. Flytta wizard → Anpassa familjen
10. A/B first_success_v2 mot legacy
```

**Bygg inte** coach, voice, milestones och push som fyra separata system.

---

## 20. Mappning mot befintlig kod (referens)

| Befintligt | First Success |
|------------|---------------|
| `family_activation_state` | Facts + moments |
| `GET /api/family/readiness` | Ersätts/omsluets av `first-success` |
| `onboarding.js` + wizard | Bypass dag 0; flytta till Anpassa |
| `onboarding-starter-plan.js` (ACT-1) | Valfritt verktyg under Anpassa |
| `activation-nudge-scheduler` | Konsumera Product Brain moment |
| `push-reminder-scheduler` | Konsumera Product Brain moment |
| `child-dashboard-celebrations.js` | Koppla till milestone output |
| `activation-advisor` (admin) | Behåll för ops; samma facts |

---

## 21. Vad vi inte gör i v2

- Leaderboards / tävla mot andra familjer
- XP eller levels för föräldern
- Fler beslut vid registrering
- Optimera för "onboarding klar" utan first success proxy
- Optimera för stjärnor utan verklig rutin-completition
- Tio markdown-filer som divergerar — **detta dokument är källan**

---

## 22. Sammanfattning i en mening

**Vi bygger inte en app för att skapa rutiner. Vi bygger en produkt som hjälper en familj att lyckas med nästa lilla steg — och mäter framgång genom om vardagen faktiskt blev lite enklare, med första stjärnan som vår viktigaste proxy tills vi kan fråga dem direkt.**
