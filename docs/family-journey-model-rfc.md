# Family Journey Model — RFC

**Status:** Godkänd domänmodell (arkitektur-RFC)  
**Version:** 1.0  
**Relaterat:** [Implementation contract](./family-journey-implementation-contract.md)

---

## Kärnan i en mening

> **Produkten ska inte organisera sig kring skärmar, flöden eller program — den ska organisera sig kring var familjen befinner sig i sin resa och vilket nästa meningsfulla steg som hjälper dem framåt.**

Om den principen accepteras blir onboarding, handoff, dashboard, notiser, experiment och analytics konsekvenser av samma modell — inte separata system som var och en försöker avgöra *vad händer härnäst?*

---

# 1. Problemet

Produkten behöver inte *ännu ett system*. Den består idag av **flera parallella modeller av samma verklighet**.

```
Onboarding tror...        → onboarding_completed = true betyder "klar"
Dashboard tror...           → readiness, CTAs och handoff-banner avgör "nästa steg"
7-dagarsprogrammet tror...  → dag 1–7, aha-modal, cohort
Analytics tror...           → skärmflöden och funnel-events
Notiser tror...             → egna schedulers med egna trösklar
Product Engine tror...      → coreState, needs, policy (parallell sanning)
```

Alla försöker besvara samma fråga:

> **Vad behöver familjen just nu?**

Det är grundproblemet. Inte att onboarding är fel, utan att **ingen delad domän** finns om var familjen befinner sig och vad som är meningsfullt härnäst.

Konsekvensen är att varje ny funktion lägger till ännu ett beslutssystem — och att produkten känns fragmenterad för familjen även när varje del fungerar tekniskt.

---

# 2. Observationerna

Konkreta symptom i dagens kodbas och produktbeteende:

| Symptom | Var det syns | Varför det skadar |
|---------|--------------|-------------------|
| Onboarding avslutas innan barnet använt produkten | `onboarding.js` sätter `onboarding_completed = true` → redirect till `/dashboard` | Familjen "är klar" utan att North Star inträffat |
| Handoff ligger utanför onboardingens klimax | `dashboard-child-handoff.js` på Hem; `onboarding-activation.js` flag-gated på steg 5 | Barnet ska logga in *efter* onboarding, inte som sidospår på dashboard |
| Dashboard innehåller specialfall | `home-readiness.js`, `dashboard-cta.js`, `dashboard-home-hub.js` `encouragementCopy()` | Tre parallella beslut på samma skärm |
| 7-dagarsprogrammet är ett separat system | `parent_activation_program`, `/api/me/activation-program/*` | Egen enrollment, daglogik, aha — kopplat till program, inte familjens resa |
| Analytics mäter skärmflöden | `funnel_onboarding_completed`, `activation_program_*` | Svårt att se familjens utveckling över tid |
| `onboarding_completed` ≠ värde | JWT-fält vs `child_first_completion` + `parent_first_completion_seen` | Fel KPI som "framgång" |
| Firande kopplat till program, inte till familjen | `activation-program-aha-card.js` kräver aktivt program | Aha-moment missas utanför experiment |
| Flera "sanningar" om aktivering | `family_activation_state`, Product Engine facts, activation-program analytics | Samma familj, olika svar |

**North Star (låst):** `first_success` = barnet har slutfört minst en aktivitet **och** föräldern har sett resultatet. Det är inte `onboarding_completed`.

---

# 3. Designprinciper

## 1. En domän, många kanaler

Webb, native, push, e-post och admin ska läsa **samma Journey Context** — inte var sin tabell, flagga eller if-sats.

## 2. Klienter frågar, domänen svarar

Alla klienter frågar samma sak: *vad bör vi göra nu?* De läser inte rå DB och fattar inte egna produktbeslut.

## 3. Livsfas beskriver var familjen befinner sig

En familj har exakt **en** livsfas (Phase) åt gången. Fasen är grov — den strukturerar hela produktupplevelsen.

## 4. Milstolpar är historik

Milstolpar (Milestones) är **append-only**: vad som hänt. De försvinner inte när fasen ändras. De är bevis, inte navigation.

## 5. Journey Context är det tunna kontraktet

Context säger **vad** produkten bör göra — inte **hur** det ska se ut. Copy, rubriker och CTA-text hämtas från **Experience Registry** (versionerbar innehållskatalog).

## 6. Kanaler renderar, domänen avgör

Dashboard, onboarding, push och modaler **projicerar** Context. De ska inte härleda fas, prioritera upplevelser eller välja firande själva.

## 7. Experiment är innehåll, inte parallella motorer

Tidsbegränsade program (t.ex. dagligt stöd vecka 1) ska uttryckas som **innehållsregler** kopplade till en livsfas — inte som separat programmotor med egen livscykel.

## 8. Livscykeln beskriver vad familjen behöver härnäst — inte bara vad de gjort

Historik: *skapat barn, lagt schema, loggat in.*

Rekommendation: *nästa viktigaste sak är att barnet provar.*

Produkten ska uttrycka **nästa meningsfulla steg**, inte bara summera klick. Det skiljer Journey Context från en ren eventlogg.

---

# 4. Domänmodellen

## 4.1 Översikt

Tre begrepp — inget fjärde "state"-lager:

```
┌─────────────────────────────────────────────────────────────┐
│                    Journey Context                          │
│  (vad produkten bör göra nu — tunt API-kontrakt)            │
│                                                             │
│  phase + milestones + recommended_experiences +             │
│  blocking_experience + celebration + priority               │
└─────────────────────────────────────────────────────────────┘
         ▲                              │
         │ härleds från                  │ copy via
         │                              ▼
┌─────────────────┐            ┌──────────────────────┐
│  Livsfas        │            │ Experience Registry   │
│  (var de är)    │            │ (hur det ska kännas)  │
└─────────────────┘            └──────────────────────┘
         ▲
         │ påverkas av
         │
┌─────────────────┐
│  Milstolpe      │
│  (vad hänt)     │
└─────────────────┘
```

**Terminologi (låst i domändokument):**

| Använd | Inte i domändokument |
|--------|----------------------|
| Livsfas (Phase) | state, status, coreState |
| Milstolpe (Milestone) | event (som domänbegrepp), achievement |
| Journey Context | readiness, activation state |
| Family Journey Model | Journey Engine, activation program (som domän) |

Internt i kod får moduler heta `journey-context.js`, `JourneyEvaluator` osv. — RFC:n beskriver **domänen**.

---

## 4.2 Livsfaser (Phase)

Var familjen befinner sig i sin relation till produkten. **Exakt en** fas åt gången.

| Fas | Betydelse | Typisk familj |
|-----|-----------|---------------|
| `DISCOVERING` | Känner till produkten, inget konto | Landning, väntelista |
| `SETTING_UP` | Konto + konfiguration pågår | Onboarding-wizard, schema/belöningar |
| `FIRST_USE` | Rutin finns; barnet ska börja använda | Efter setup, före first_success |
| `BUILDING_ROUTINE` | first_success uppnått; vanor etableras | Vecka 1–2, daglig användning |
| `ESTABLISHED_ROUTINE` | Stabil vardagsloop | Streak, regelbunden completion |
| `EXPANDING` | Utökar (syskon, kväll, medförälder, pedagog) | Tillväxt inom familjen |
| `INDEPENDENCE` | Barnet driver själv; förälder följer lätt | Låg friktion, sällan coach |

Fasövergångar är **deterministiska** — samma milstolpar + regler → samma fas. Ingen slump i domänlagret.

### Fas 1 i implementation (scope)

Första kodleveransen täcker endast:

```
SETTING_UP  →  FIRST_USE  →  (first_success milstolpe)  →  BUILDING_ROUTINE
```

Övriga faser definieras här för helhetsbild; de implementeras i senare faser.

---

## 4.3 Milstolpar (Milestone)

**Append-only historik** — vad familjen har uppnått. Varje rad skrivs en gång.

| Milstolpe | Trigger (domän) | Fas 1 |
|-----------|-----------------|-------|
| `account_created` | Registrering klar | ✓ |
| `child_created` | Barnprofil skapad | ✓ |
| `routine_ready` | Schema sparat | ✓ |
| `rewards_ready` | Minst en belöning | ✓ |
| `handoff_started` | Förälder initierade barninloggning | ✓ ny |
| `handoff_deferred` | Förälder valde "senare" | ✓ ny |
| `child_logged_in` | Barn autentiserat (`child_login_success`) | ✓ ny |
| `child_first_completion` | Barn checkade av första aktivitet | ✓ befintlig event |
| `parent_saw_completion` | Förälder såg resultat (`parent_first_completion_seen`) | ✓ befintlig event |
| `first_success` | `child_first_completion` ∧ `parent_saw_completion` | ✓ **North Star** |
| `co_parent_invited` | Inbjudan skickad | Senare |
| `streak_3` | 3 dagars streak | Senare |

**Viktigt:** `first_success` är en **milstolpe**, inte en livsfas. När den inträffar flyttas familjen till `BUILDING_ROUTINE`.

`onboarding_completed` är **inte** en milstolpe i denna modell. Det är infrastruktur (auth/routing) — se implementation contract.

---

## 4.4 Journey Context — huvudidén

Journey Context är det **enda kontrakt** alla kanaler konsumerar.

> Alla klienter frågar samma sak.  
> Inte: alla klienter läser samma tabell.

### Kontrakt (tunt — ingen copy)

```ts
interface JourneyContext {
  phase: Phase;

  /** Milstolpar som inträffat (nycklar + timestamps) */
  milestones: Record<MilestoneKey, string /* ISO-8601 */>;

  /** Prioriterade upplevelser just nu (nycklar till Experience Registry) */
  recommended_experiences: ExperienceKey[];

  /** Om satt: inget annat får blockera denna upplevelse */
  blocking_experience: ExperienceKey | null;

  /** Firande att visa (nyckel till Registry), eller null */
  celebration: CelebrationKey | null;

  /** Ordning vid konkurrens mellan upplevelser */
  priority: 'handoff' | 'celebration' | 'coach' | 'none';
}
```

**Medvetet utelämnat från Context:**

- `headline`, `body`, `cta`, `coach_mark` — dessa kommer från Experience Registry
- `route`, `theme`, `intensity` — presentation adapters
- Experimentvarianter — Registry + feature flags på innehållsnivå

### Experience Registry

Versionerbar katalog som mappar nycklar → copy + presentation hints:

```ts
interface ExperienceEntry {
  key: ExperienceKey;
  tone: 'coach' | 'celebration' | 'calm' | 'encouragement';
  headline: string;
  body: string;
  cta: string;
  route?: string;
  /** Valfria UI-hints — inte produktbeslut */
  presentation?: { theme?: string; modal?: boolean };
}
```

Copy kan ändras **utan deploy av domänlager** — bara Registry-uppdatering.

### Exempel: FIRST_USE före handoff

```json
{
  "phase": "FIRST_USE",
  "milestones": {
    "routine_ready": "2026-06-28T10:00:00Z",
    "rewards_ready": "2026-06-28T10:05:00Z"
  },
  "recommended_experiences": ["handoff_to_child"],
  "blocking_experience": "handoff_to_child",
  "celebration": null,
  "priority": "handoff"
}
```

Klienten slår upp `handoff_to_child` i Registry och renderar onboarding steg 5–6 / handoff-CTA.

### Exempel: first_success

```json
{
  "phase": "BUILDING_ROUTINE",
  "milestones": {
    "child_first_completion": "2026-06-28T18:00:00Z",
    "parent_saw_completion": "2026-06-28T18:05:00Z",
    "first_success": "2026-06-28T18:05:00Z"
  },
  "recommended_experiences": ["celebrate_first_success"],
  "blocking_experience": null,
  "celebration": "celebrate_first_success",
  "priority": "celebration"
}
```

Firandet är **klimax** — inte redirect till dashboard.

---

## 4.5 Family Journey Model (domänlager)

Domänlagret som härleder Context från fakta:

```
Fakta (DB + milstolpar + events)
        ↓
Family Journey Model
  · läs milstolpar
  · härled livsfas
  · välj recommended_experiences + priority
        ↓
Journey Context (tunt kontrakt)
        ↓
Experience Registry (copy)
        ↓
Kanaler (onboarding, dashboard, push, …)
```

**Regler:**

- Deterministiskt: samma fakta → samma Context
- Domänlagret läser inte UI, locale eller copy
- En enda skrivväg för milstolpar (event-ingestion)
- Kanaler får **inte** skriva fas eller milstolpar (utom via definierade events)

Relation till befintlig **Product Engine** (`/api/family/first-success`): parallell under övergång. Journey Model blir **primär sanning för livsfas och upplevelser**; Engine facts kan konsumeras som input tills de slås ihop.

---

## 4.6 Kanaler (konsekvenser, inte beslutsägare)

| Kanal | Roll |
|-------|------|
| Onboarding steg 5–6 | Renderar `blocking_experience` under `FIRST_USE` |
| Dashboard | Renderar Context; inga egna trösklar för handoff/coach |
| Barnvy | Data-driven rutin; firande triggas av server/milstolpe |
| Push / e-post | Registry-copy + `validityWindow` från Context-regler |
| 7-dagarsinnehåll | Innehållsregler i `BUILDING_ROUTINE` — inte separat motor (målbild) |
| Admin | Läser fas + milstolpar för rådgivning |

---

## 4.7 Avveckling av parallella modeller (målbild)

| Dagens system | Mål |
|---------------|-----|
| `onboarding_completed` som framgång | Infrastruktur kvar; produktframgång = `first_success` |
| `parent_activation_program` | Innehåll i `BUILDING_ROUTINE` via Registry |
| `home-readiness` coach-del | Ersätts av Context + Registry |
| `activation-program-aha-card` | Firande via `celebration` i Context |
| `family_activation_state` | Fakta källas in; milstolpar blir primär historik |
| Frontend `if (stars >= 5)` | Förbjudet för produktbeslut |

Avveckling sker **inkrementellt** — se implementation contract.

---

## 4.8 Metrics (familjens resa, inte skärmar)

| Metric | Definition |
|--------|------------|
| `first_success_within_48h` | `first_success` inom 48h från `account_created` |
| `handoff_completion_rate` | `handoff_started` → `child_logged_in` |
| `phase_distribution` | Andel familjer per livsfas |
| `milestone_funnel` | Sekvens account → routine → handoff → first_success |

Befintliga analytics-events (`child_login_success`, `child_first_completion`, `parent_first_completion_seen`) **behålls** och matar milstolpar.

---

# 5. Beslut som kräver teamets godkännande

| # | Beslut | Förslag |
|---|--------|---------|
| 1 | North Star | `first_success` = completion ∧ parent saw |
| 2 | Onboarding-klimax | "Låt barnet börja" — inte "Gå till dashboarden" |
| 3 | Context utan copy | Registry som separat lager |
| 4 | Fas 1 scope | SETTING_UP → FIRST_USE → first_success |
| 5 | 7-dagarsprogram | Avvecklas till BUILDING_ROUTINE-innehåll (ej i Fas 1) |
| 6 | `onboarding_completed` | Kvar för auth; inte produkt-KPI |

---

# 6. Nästa steg

1. Godkänn denna RFC
2. Implementera enligt [family-journey-implementation-contract.md](./family-journey-implementation-contract.md)
3. Fas 1 kod: onboarding 5–6, handoff-milstolpar, first_success-firande

**Ingen produktkod förrän RFC + contract är godkända.**
