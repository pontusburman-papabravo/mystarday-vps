# ADR — Journey event-first onboarding (signup vs vana)

**Datum:** 2026-07-02  
**Status:** Accepted (produktlåsning)  
**Beslut:** Dela signup (schema klart) och Journey (vana i verkligheten); Journey är **event-first, day-second**  
**POS:** Constitution §1 (one next step), §5 (complete signup), 00A (lugn morgon), P-02 (barnet agerar)

**Ersätter delvis:** ACT-1 UX i `docs/act-1-ai-startschema-spec.md` §5 (allt-i-ett-flöde med handoff + first star i signup). Instrumentering, flags och mallmotor i ACT-1 PR 1–4 **behålls**.

---

## Kontext

ACT-1 PR 1–4 live löste “tom canvas” men packade för mycket i signup: 7 frågor, preview, barnkod, first-star-guide i samma session. Det stämmer dåligt med produktlöftet på landningssidan — *bygg första schemat på några minuter* och *mindre tjat* — och med varumärket (lugn, inte stressad app).

Rotfrågan flyttas från *“få användaren genom onboarding”* till *“hjälp familjen lyckas i verkligheten”*.

---

## Låsta beslut

### 1. Signup har ett jobb

> **“Din rutin är klar.”**

Signup ska **inte**:

- lära ut appen
- visa alla funktioner
- kräva barninloggning
- förklara stjärnsystemet
- visa statistik

När föräldern landar på Hem ska känslan vara:

> **“Vi kan testa detta ikväll.”**

### 2. Signup-flöde (låst)

```
3 frågor (namn, ålder, rutintyp)
    ↓
Automatiskt schema (3–5 aktiviteter, template-first)
    ↓
“Er rutin är redo”
    ↓
Hem
```

- Preview/redigering: **valfritt**, inte blockerande
- AI-personalisering: **valfritt**, fallback till mall (befintlig PR 4-regel)
- Schema **måste** sparas i signup (undvik “registrerad men tom”)

**Power-user (låst):** Slim är **standard**, men föräldern ska alltid kunna gå snabbare/mer kontrollerat utan att lämna signup:

| Väg | UI | Efter schema |
|-----|-----|--------------|
| **Standard (slim)** | 3 frågor → auto-schema | “Er rutin är redo” → Hem (eller anpassa schema) |
| **Välj färdigt schema** | Legacy steg 1 (mallväljare) | Full legacy/ACT-1-handoff om flaggad |
| **Bygg och anpassa** | 7 frågor + preview | Handoff / first-star som idag |

Journey-coach gäller endast **slim standardväg**; handoff och first-star i signup är **på** för power-user-vägar.

### 3. Journey — kadens 1, 2, 3, 7, 14 (day-second)

| Dag | Coach-jobb | Inte |
|-----|------------|------|
| **1** | Visa barnets vy (inline preview) | Redirect till child-login som primär path |
| **2** | Påminn om att testa rutinen i vardagen | Ny funktion, statistik, belöningar |
| **3** | Se §4 (händelsestyrd, inte bunden till “barnkod + stjärna” i ett steg) | Skuldbeläggning |
| **4–6** | **Tyst** — produkten backar | “Du har inte…”, “Nu är dag fem!” |
| **7** | Varm reflektion (värde-kvitto) | Produktivitetsstatistik |
| **14** | Intern retention-mätning (North Star) | Nytt föräldrasteg i UI |

### 4. Dag 3 är händelsestyrd (inte ett kombinerat coachsteg)

**Fel modell:** Dag 3 → “Barnkod + första stjärnan” (ett kalendersteg).

**Rätt modell:** Dag 3 är ett **fönster** med villkorlig copy:

| Tillstånd | Coach |
|-----------|--------|
| Barnet har **inte** loggat in | “Nu är det dags att låta [barn] prova.” → PIN / hur barnvy fungerar |
| Barnet **har** loggat in | “Fira första stjärnan” (om completion finns) |

Barnkod och första stjärnan är **två separata händelser**, inte ett wizard-steg.

### 5. Journey är event-first, day-second

Kalenderdag är **timing-cap**, inte primär trigger. Evaluator ska först kolla events/facts, sedan dag.

| Trigger (event / fact) | Visa |
|------------------------|------|
| Schema sparat (`has_routine`) | Dag 1-preview (barnvy) |
| 48 h utan meningsfull öppning | “Behöver du hjälp att komma igång?” (mjuk, inte skuld) |
| Barn loggar in första gången | Fira / välkomna |
| Första aktivitet klar | Introducera stjärnor (inte före) |
| `effective_day === 7` | Reflektion |
| `effective_day === 14` | Retention (internt) |

**Guard:** Visa aldrig “första stjärnan” om familjen redan har completions — undvik absurd copy vid sen signup.

### 6. Coach-princip (global, framtida meddelanden)

> **Coachen introducerar aldrig ett nytt koncept innan familjen har nytta av det.**

| Ordning | Koncept |
|---------|---------|
| 1 | Schema |
| 2 | Titta på schema |
| 3 | Barnvy |
| 4 | Första stjärnan → därefter Skattkammaren |
| 5 | Dela med annan vuxen (efter några dagar) |
| 6 | Veckoschema (vecka 2+) |

Inte tvärtom.

### 7. Tystnad dag 4–6 (varumärke)

Ingen push/copy som:

- “Du har inte…”
- “Kom ihåg…”
- “Nu är det dag fem!”

Lugn produkt vågar vara tyst. Journey `silent: true` är avsikt, inte lucka.

---

## P0-metrics (justering)

| Milestone | Förväntad tidpunkt |
|-----------|-------------------|
| Schema sparat | Signup (dag 0) |
| `child_access_completed` | Event: barnvy öppnad / PIN — **inte** krav i signup |
| First completion | Event — ofta dag 1–3 i verkligheten |
| `activation_rate_48h` | Fortfarande primär metric; definierar **verklig** aktivering, inte wizard-completion |

---

## Implementation (teknisk karta)

| Område | Nu | Nästa |
|--------|-----|-------|
| Signup | `onboarding-starter-plan.js` (7 frågor + preview + handoff) | Slim 3-frågor + auto-save → Hem |
| Handoff / first star | `onboarding-activation.js`, `onboarding-first-star.js` i signup | Flytta till Journey experiences (event-triggers) |
| Dag-kadens | `activation-program` (7 dagar, UI borttagen) + `journey/first-week.js` (efter first_success) | En evaluator: event-first, day-cap 1/2/3/7/14 |
| Coach copy | `journey_experience_registry`, `config/journey-experience-registry.json` | Nya/uppdaterade keys per tabell ovan |
| Flags | `activation_onboarding_v1` m.fl. | Ny flag t.ex. `activation_signup_slim_v1` för gradvis rollout |

**Återanvänd:** `selectStarterTemplate`, `activation-p0`, analytics events, Journey ingest/evaluator, inline preview-mönster från 7-dagarsprogram §4.1.

---

## Konsekvens

- ACT-1 “allt i ett pass” avvecklas som **signup-UX**, inte som instrumentation
- PR 5 nudges ska följa samma coach-princip (inga nya koncept)
- Föräldrar på legacy signup tills flag rollout; A/B möjlig via feature flag

## Alternativ som avvisades

- **Behålla 7-frågor + handoff i signup:** Bryter mot “rutin klar → testa ikväll”
- **Ren kalender-Journey utan events:** Risk för felmeddelanden (t.ex. “första stjärnan” vid 40 stjärnor)
- **Daglig coach dag 4–6:** Bryter mot lugn-varumärke

---

## Nästa steg (implementation)

1. Slim signup (3 frågor) bakom flag
2. Journey evaluator: event-first regler + dag-cap
3. Avaktivera handoff/first-star i signup när slim flag på
4. `test:gate` + journey golden-path-tester för event triggers
5. Mät 48h-kohort före/efter
