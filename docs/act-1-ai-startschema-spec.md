# ACT-1 — Starter plan onboarding (template-first + AI-assist)

**Skapad:** 2026-06-24  
**Status:** Implementation-ready spec för Cursor (v1.1)  
**Projekt:** ACT-1  
**Relaterat:** [`aktivering-exekveringsplan.md`](./aktivering-exekveringsplan.md), [`act-1-cursor-tasklist.md`](./act-1-cursor-tasklist.md)

---

## 1. Syfte

Minska “tom canvas”-friktionen i onboarding och öka **`activation_rate_48h`**.

**Produktmål:** Ny förälder ska inom samma session kunna:

1. Beskriva barnets situation (kort)
2. Få ett **färdigt startschema** (template-first)
3. Skapa **barnåtkomst** (PIN / barnvy)
4. Genomföra **första completion** (första stjärnan)

**P0 är inte “bygg AI”.** P0 är **guided activation**. AI anpassar mallen i Fas A3 — det är en accelerator, inte produkten.

---

## 2. P0 Activation Event (referens)

En familj är **P0-aktiverad** inom **48 timmar** från signup när:

1. Minst ett schema/rutin sparat (`weekly_schedule`)
2. **`child_access_completed`** — PIN satt *eller* barnvy öppnad via handoff
3. Minst en completion/stjärna registrerad

**Primär metric:** `activation_rate_48h`

### `child_access_completed` (LÅST)

Triggas server-side när **minst ett** är sant:

- PIN satt (`child_pin_created`)
- Barnvy öppnad via handoff-flöde (`child_view_opened` med `source: handoff`)
- Förälder markerar explicit “barnet kan logga in nu” (om sådan CTA finns)

`child_profile_created` loggas separat men **räknas inte** som P0 handoff-steg i huvudtratten.

---

## 3. Scope

### Ingår i ACT-1 v1

| # | Leverans |
|---|----------|
| 1 | Ny onboardingsektion “Skapa ert första schema” (flag `activation_onboarding_v1`) |
| 2 | Strukturerad insamling: ålder, rutintyp, utmaningar, stödnivå, längd |
| 3 | **Template-first:** välj basmall från `default_schedule` via metadata |
| 4 | Preview / edit / save av schema |
| 5 | Child handoff (soft gate PIN) |
| 6 | First star guide |
| 7 | Event tracking (full funnel) |
| 8 | Feature flags + A/B (legacy / template-only / template+AI) |
| 9 | **Fallback utan AI** — mall fungerar alltid |

### Ingår inte i ACT-1 v1

- AI-bildgenerering
- Fri chatt-onboarding
- Veckopeng, solo-läge
- Varannan vecka, pedagog/rapporter i onboarding
- Ny `starter_templates`-tabell (v1 använder `config/starter-plan-meta.js` + `default_schedule`)

### Hård regel — planstorlek (LÅST)

Första planen är byggd för **första stjärnan**, inte perfektion:

| Regel | Värde |
|-------|-------|
| Antal rutiner i onboarding-v1 | **Max 1** schema/rutin |
| Default antal aktiviteter | **3–5** |
| Max vid val “detaljerad” | **7** (AI får inte överskrida) |
| Mall med fler steg | Trunkera/komprimera i onboarding-läge |

Selector och `generateStarterPlan()` ska enforce:a detta **före** preview.

> **AI-fallback:** Om AI-anrop misslyckas, timeoutar eller `OPENAI_API_KEY` saknas: familjen får **färdigt schema från mall** och fortsätter utan blockerande fel. AI får **aldrig** vara hårt beroende.

---

## 4. Byggsekvens (kopplad till PR)

| Fas | PR | Innehåll |
|-----|-----|----------|
| — | PR 1 | Events, flags, `config/starter-plan-meta.js` |
| **A1** | PR 2 | Child handoff + first star guide + admin funnel |
| **A2** | PR 3 | Template-first UI (frågor, selector, preview, save) — **utan AI** |
| **A3** | PR 4 | `generateStarterPlan()` + fallback |
| — | PR 5 | Non-activated nudges + experiment |

Bygg **inte** AI före template-first UI är live och mätbart.

---

## 5. UX-flöde

Flag: `activation_onboarding_v1 = true` (per familj eller cohort efter datum).

### Steg 1 — Minimal input (< 90 sek)

Komponent: `StarterPlanQuestionFlow`

| # | Fält | Alternativ |
|---|------|------------|
| 1 | Barnets namn | text |
| 2 | Ålder | 3–5 / 6–8 / 9–12 / 13+ |
| 3 | Rutintyp | morgon / kväll / efter skolan / läxor / göra sig klar |
| 4 | Svårast just nu | komma igång / fokus / konflikter / glömmer steg / övergångar / annat (max 200 tecken) |
| 5 | Extra tydligt stöd? | ja / lite / nej |
| 6 | Antal steg | kort 3–4 / normal 5 / detaljerad 6–7 |
| 7 | Valfritt | “Något viktigt vi ska ta hänsyn till?” |

### Steg 2 — Template selection (A2)

`selectStarterTemplate(input)` → läser `config/starter-plan-meta.js`, mappar till `default_schedule`-namn.

### Steg 3 — AI-personalisering (A3 only)

Flag: `activation_ai_starter_plan`

`generateStarterPlan(input)` → anpassar copy, ordning, delsteg. **Timeout 15 s.** Vid fel → ren mall + barnets namn.

### Steg 4 — Preview / edit

Komponent: `StarterPlanPreview`

- Titel + aktivitetslista
- Redigera: namn, ta bort, lägg till, ordning
- CTA: **Använd detta schema**

### Steg 5 — Child access (A1, soft gate)

Komponent: `ChildAccessStep`

- Skapa/välj barnprofil, sätt PIN
- “Visa barnet sin vy”
- Primär CTA: **Skapa barnkod**
- Sekundär: **Hoppa över för nu** → konsekvenscopy + påminnelse 24 h (`child_handoff_skipped`)

### Steg 6 — First star guide (A1)

Komponent: `FirstStarGuide`

1. Öppna barnvy (`/child-login` eller länk)
2. Markera första aktivitet klar
3. Celebration / stjärna

---

## 6. Generatorstrategi

```
Användarsvar
    → selectStarterTemplate()     [config/starter-plan-meta.js → default_schedule]
    → [A3 + activation_ai_starter_plan]
    → generateStarterPlan()       [OpenAI, max 15s]
    → [fel/timeout/saknad nyckel] → ren mall
    → StarterPlanPreview
    → saveStarterPlan()           [POST /api/onboarding/schedule eller ny endpoint]
    → ChildAccessStep
    → FirstStarGuide
```

### Promptregler (AI)

- Utgå från **befintlig mall** — skapa inte från tomt papper
- Enkel svenska; barnvänlig men inte infantil
- Varje steg konkret och görbart
- Max **7 aktiviteter** i v1 (5 default, 7 endast “detaljerad”)
- Inga medicinska/terapeutiska råd
- Tom fritext → hitta inte på känslig bakgrund
- Osäker → håll dig nära mallen

---

## 7. Datamodell — mallar (v1)

**Ingen ny DB-tabell.** Metadata i `config/starter-plan-meta.js`:

```javascript
{
  slug: 'morgon',
  scheduleName: 'Kort morgon',       // default_schedule.name
  routineType: 'morning',
  ageMin: 3,
  ageMax: 12,
  goalTags: ['getting_ready', 'school_morning'],
  difficultyTags: ['transitions', 'getting_started'],
  supportLevel: 'medium',            // low | medium | high
  defaultLength: 'normal'            // short | normal | detailed
}
```

**Initialt:** 6–10 paket mappade till befintliga scheman (`Kort morgon`, `Kvällsrutin`, `Förskola vardag`, etc.).

**Befintlig kopiering:** `POST /api/onboarding/schedule` i [`src/routes/onboarding.js`](../src/routes/onboarding.js) — återanvänd eller wrappa i `saveStarterPlan()`.

---

## 8. AI-kontrakt

### Input (`StarterPlanInput`)

```typescript
type StarterPlanInput = {
  childName: string;
  ageBand: '3-5' | '6-8' | '9-12' | '13+';
  routineType: 'morning' | 'evening' | 'after_school' | 'homework' | 'getting_ready';
  mainChallenges: string[];
  supportLevel: 'low' | 'medium' | 'high';
  desiredLength: 'short' | 'normal' | 'detailed';
  freeText?: string;
  selectedTemplate: {
    id: string;
    title: string;
    tasks: Array<{
      title: string;
      description?: string;
      estimatedMinutes?: number;
    }>;
  };
  locale: 'sv-SE';
};
```

### Output (`StarterPlanOutput`)

```typescript
type StarterPlanOutput = {
  planTitle: string;
  introText?: string;
  tasks: Array<{
    title: string;
    description?: string;
    estimatedMinutes?: number;
    subtasks?: Array<{ title: string; description?: string }>;
  }>;
  reasoning?: {
    supportLevelApplied?: string;
    simplifications?: string[];
  };
};
```

### Backend-tjänster

| Tjänst | Fil | Ansvar |
|--------|-----|--------|
| `selectStarterTemplate` | `src/lib/starter-plan/select-template.js` | Välj basmall |
| `generateStarterPlan` | `src/lib/starter-plan/generate-plan.js` | AI + fallback |
| `saveStarterPlan` | `src/routes/onboarding.js` (utökad) | Spara weekly_schedule |
| LLM-abstraktion | `src/lib/starter-plan/llm.js` | OpenAI v1; bytbar senare |

**Env:** `OPENAI_API_KEY` (valfri).

---

## 9. Server-side activation state (source of truth)

Persisted snapshot per familj — **inte** enbart rekonstruerat från analytics-events.

### Fält (förslag: kolumner på `family` eller tabell `family_activation_state`)

```typescript
type FamilyActivationState = {
  familyId: string;
  signupAt: Date;
  schemaSavedAt: Date | null;
  childAccessCompletedAt: Date | null;
  firstCompletionAt: Date | null;
  p0ActivatedAt: Date | null;           // alla tre uppfyllda
  p0ActivatedWithin48h: boolean;
  variant: 'legacy' | 'template_only' | 'template_plus_ai';
};
```

### Uppdateringsregler

| Fält | Sätts när |
|------|-----------|
| `schemaSavedAt` | `starter_plan_saved` (eller befintlig schedule POST) |
| `childAccessCompletedAt` | `child_access_completed` |
| `firstCompletionAt` | `first_completion_recorded` |
| `p0ActivatedAt` | alla tre tidsstämplar satta inom 48h från `signupAt` |
| `p0ActivatedWithin48h` | `p0ActivatedAt` inom fönster |

`activation_achieved_48h` **emitteras server-side** när `p0ActivatedAt` sätts — används av nudges, admin funnel och cohort jobs.

**Modul:** `src/lib/activation-p0.js` — `updateActivationState()`, `isP0Activated()`, `getActivationFunnelStep()`.

---

## 10. Event tracking

Lägg till i [`src/routes/analytics.js`](../src/routes/analytics.js) `ALLOWED_CLIENT_EVENTS` + server-side i [`src/lib/analytics-tracker.js`](../src/lib/analytics-tracker.js).

### Onboarding

| Event | När |
|-------|-----|
| `activation_onboarding_started` | Flöde öppnas |
| `activation_question_answered` | Per fråga (`question_id`) |
| `starter_template_selected` | Mall vald |
| `starter_plan_generation_started` | AI start (A3) |
| `starter_plan_generation_succeeded` | AI OK |
| `starter_plan_generation_failed` | AI fel (`reason`) |
| `starter_plan_preview_viewed` | Preview visas |
| `starter_plan_saved` | Schema sparat |

### Child access

| Event | När | Huvudtratt? |
|-------|-----|-------------|
| **`child_access_completed`** | PIN satt **eller** barnvy öppnad via handoff | **Ja (steg 5)** |
| `child_profile_created` | Barnobjekt skapat (kan ske tidigt) | Nej — sub-metric |
| `child_pin_created` | PIN satt | Nej — sub-metric |
| `child_view_opened` | Barnvy öppnad | Nej — sub-metric |
| `child_handoff_skipped` | Hoppa över | Nej — sub-metric |

### Activation

| Event | När | Huvudtratt? |
|-------|-----|-------------|
| `first_completion_recorded` | Första stjärnan | **Ja (steg 6)** |
| `activation_achieved_48h` | P0 state uppfyllt inom 48h (server) | **Ja (steg 7)** |

**Payload (minst):** `family_id`, `cohort_date`, `variant`, `routine_type`, `age_band`, `support_level`, `template_id`, `used_ai: boolean`

### Kvalitetsmetrics (admin)

- Andel scheman redigerade före save
- Genomsnitt antal aktiviteter
- Andel som raderar hela schemat vecka 1

---

## 11. Feature flags

| Flag | Syfte | Fas |
|------|-------|-----|
| `activation_onboarding_v1` | Nytt flöde | A2+ |
| `activation_child_handoff_v1` | Child access-steg | A1 |
| `activation_first_star_guide_v1` | First star guide | A1 |
| `activation_ai_starter_plan` | AI-personalisering | A3 |

**Experiment-varianter:** `legacy` | `template_only` | `template_plus_ai`

---

## 12. Experimentdesign

| Arm | Innehåll |
|-----|----------|
| Kontroll | Nuvarande onboarding (`public/js/onboarding.js`) |
| Variant A | Template-first + handoff + first star |
| Variant B | Variant A + AI |

**Primär:** `activation_rate_48h`  
**Sekundära:** schema saved, PIN created, first completion same day, D14 (aktiverade)

---

## 13. Acceptance criteria

### Funktionella

1. Familj med `activation_onboarding_v1` kan gå signup → sparat schema i samma flöde
2. Schema från mall även om AI misslyckas
3. Efter save → child handoff om barnprofil saknas
4. Efter handoff → first star guide
5. Alla events loggas
6. Admin särskiljer legacy / template-only / template+AI
7. Ingen blockeras vid AI-fel

### UX

1. Mobil utan horisontell scroll
2. Schema godkännbart på < 2 minuter
3. Minst ett CTA: “testa första stjärnan nu”

### Tekniska

1. AI timeout ≤ 15 s
2. Fel loggas med orsakskod
3. Mallar i versionerad config
4. AI avstängbar via flag utan deploy

### Regression

- Nuvarande onboarding completion får inte sjunka > 5 % under rollout

---

## 14. Befintlig kod att utgå från

| Område | Fil |
|--------|-----|
| Onboarding wizard | `public/js/onboarding.js`, `public/onboarding.html` |
| Onboarding API | `src/routes/onboarding.js` |
| Template groups | `TEMPLATE_GROUP_META`, `GROUP_TO_SCHEDULE` |
| Child handoff (dashboard) | `public/js/dashboard-child-handoff.js` |
| Aktiveringsprogram | `src/lib/activation-program-enroll.js` |
| Analytics whitelist | `src/routes/analytics.js` |
| Admin funnel | `public/admin/admin-analytics.js` |

**Kända gap idag:** `skipInvite()` hoppar över aktiveringsprogram; steg 3 är confirm-only; ingen guidad first star i wizard.

---

## 15. Dokumenthistorik

| Datum | Version | Ändring |
|-------|---------|---------|
| 2026-06-24 | 1.0 | Första implementationsspec |
| 2026-06-24 | 1.1 | `child_access_completed`, activation state, planstorlek, huvudtratt |
