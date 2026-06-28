# Family Journey Model — RFC

**Status:** Utkast — workshop-underlag  
**Version:** 1.0-rc  
**Appendix (efter godkännande):** [Implementation contract](./family-journey-implementation-contract.md) · [Fas 2–5 roadmap](./family-journey-fas2-5-roadmap.md)

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
Produktlogik (Engine) tror... → parallella behov, policy och milstolpar
```

Alla försöker besvara samma fråga:

> **Vad behöver familjen just nu?**

Det är grundproblemet. Inte att onboarding är fel, utan att **ingen delad domän** finns om var familjen befinner sig och vad som är meningsfullt härnäst.

Konsekvensen är att varje ny funktion lägger till ännu ett beslutssystem — och att produkten känns fragmenterad för familjen även när varje del fungerar tekniskt.

---

# 2. Observationerna

Konkreta symptom i dagens produkt och kod:

| Symptom | Var det syns | Varför det skadar |
|---------|--------------|-------------------|
| Onboarding avslutas innan barnet använt produkten | `onboarding.js` → `onboarding_completed = true` → `/dashboard` | Familjen "är klar" utan North Star |
| Handoff ligger utanför onboardingens klimax | `dashboard-child-handoff.js` på Hem; `onboarding-activation.js` flag-gated | Barnet ska börja *i* onboarding, inte som sidospår |
| Dashboard innehåller specialfall | `home-readiness.js`, `dashboard-cta.js`, `encouragementCopy()` | Flera parallella beslut på samma skärm |
| 7-dagarsprogrammet är ett separat system | `parent_activation_program`, `/api/me/activation-program/*` | Egen motor — kopplad till program, inte resan |
| Analytics mäter skärmflöden | `funnel_onboarding_completed`, `activation_program_*` | Svårt att se familjens utveckling |
| Fel framgångsmått | `onboarding_completed` vs `child_first_completion` + `parent_first_completion_seen` | Fel KPI som "lyckades" |
| Firande kopplat till program | `activation-program-aha-card.js` kräver aktivt program | Aha missas utanför experiment |
| Flera sanningar om "aktivering" | `family_activation_state`, Engine facts, program-analytics | Samma familj, olika svar |

---

# 3. Designprinciper

## 1. En domän, många kanaler

Webb, native, push, e-post och admin ska läsa **samma Journey Context** — inte var sin tabell, flagga eller if-sats.

## 2. Klienter frågar, domänen svarar

Alla klienter frågar samma sak: *vad bör vi göra nu?* De läser inte rå DB och fattar inte egna produktbeslut.

## 3. Livsfas beskriver var familjen befinner sig

En familj har exakt **en** livsfas (Phase) åt gången. Fasen svarar på: *var är vi i resan?* — inte *vad ska vi göra härnäst?*

## 4. Milstolpar är historik

Milstolpar (Milestones) är **append-only**: vad som hänt. De försvinner inte när fasen ändras. De är bevis, inte navigation.

## 5. Journey Context beskriver vad som behövs härnäst

Context svarar på: *vad bör produkten göra nu?* — rekommenderade upplevelser, blockering, firande, prioritet. Det är **inte** samma sak som livsfas.

## 6. Context är tunt — copy lever separat

Context innehåller nycklar till upplevelser och **maskinläsbara skäl** (`reason`), inte rubriker och brödtext. Copy hämtas från **Experience Registry**.

## 7. Kanaler renderar, domänen avgör

Dashboard, onboarding, push och modaler **projicerar** Context. De ska inte härleda fas, prioritera upplevelser eller välja firande själva.

## 8. Livscykeln beskriver vad familjen behöver härnäst — inte bara vad de gjort

Historik: *skapat barn, lagt schema, loggat in.*

Rekommendation: *nästa viktigaste sak är att barnet provar.*

Det är den princip som förklarar varför **livsfas**, **milstolpe** och **Journey Context** är tre olika begrepp.

## 9. Analytics är observability — inte domäninput

Milstolpar skapas av **backend-händelser** (routes, domänhooks). Analytics speglar det som hänt för rapportering — analytics får inte vara enda källan till domänsanning.

---

# 4. Journey Context — huvudidén

Journey Context är det gemensamma kontrakt som förenar alla ytor.

> **Alla klienter frågar samma sak.**  
> Inte: alla klienter läser samma tabell.

## Tre begrepp — håll isär dem

| Begrepp | Fråga det besvarar | Exempel |
|---------|-------------------|---------|
| **Livsfas (Phase)** | Var befinner sig familjen i resan? | `FIRST_USE` |
| **Milstolpe (Milestone)** | Vad har familjen uppnått? | `routine_ready`, `first_success` |
| **Journey Context** | Vad bör produkten göra nu? | `blocking_experience: handoff_to_child` |

`FIRST_USE` beskriver *var* familjen är. Context beskriver att *handoff* är det som behöver hända härnäst.

## Kontrakt (tunt — ingen copy)

```ts
interface JourneyContext {
  phase: Phase;

  /** Senaste inträffade per milstolpe-nyckel (Fas 1: en gång per nyckel) */
  milestones: Record<MilestoneKey, string /* ISO-8601 */>;

  recommended_experiences: ExperienceKey[];
  blocking_experience: ExperienceKey | null;
  celebration: CelebrationKey | null;
  priority: 'handoff' | 'celebration' | 'coach' | 'none';

  /** Maskinläsbara skäl — inte copy. För debug och support. */
  reason: ReasonCode[];
}
```

**Medvetet utelämnat:** `headline`, `body`, `cta`, `route`, `theme` — dessa kommer från Experience Registry.

## Experience Registry

Versionerbar katalog organiserad **per livsfas** (`registry[phase][experienceKey]`). Copy kan ändras utan att domänkontraktet ändras.

| Fas | Registry |
|-----|----------|
| Fas 1 | Statisk JSON i repo — OK |
| Fas 2+ | Server-driven (API) — krävs för UX-konsistens över kanaler |

## Fas 1 — begränsad Context-scope

Journey Context är **single source of truth** — men Fas 1 gäller endast:

| Yta | Context styr |
|-----|--------------|
| Onboarding steg 5–6 | ✅ handoff |
| Handoff (dashboard) | ✅ när `FIRST_USE` |
| Firande (`first_success`) | ✅ celebration |
| Dashboard coach / readiness | ❌ legacy kvar |
| Push / e-post | ❌ legacy kvar |

Övriga ytor migreras efter Fas 1 — inte parallellt.

## Exempel: `FIRST_USE` — handoff behövs

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
  "priority": "handoff",
  "reason": ["child_not_logged_in"]
}
```

## Exempel: `first_success` — firande som klimax

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
  "priority": "celebration",
  "reason": ["first_success_achieved"]
}
```

## Ägarskap

Journey Context ägs av **en central domäntjänst**. Inga klienter implementerar egen journey-logik i Fas 1-scope.

---

# 5. Domänmodellen

## 5.1 Livsfaser (Phase)

| Fas | Betydelse |
|-----|-----------|
| `DISCOVERING` | Känner till produkten, inget konto |
| `SETTING_UP` | Konto och konfiguration pågår |
| `FIRST_USE` | Rutin finns; barnet ska börja använda |
| `BUILDING_ROUTINE` | `first_success` uppnått; vanor etableras |
| `ESTABLISHED_ROUTINE` | Stabil vardagsloop |
| `EXPANDING` | Utökar: syskon, kväll, medförälder, pedagog |
| `INDEPENDENCE` | Barnet driver själv; förälder följer lätt |

### Explicit fasmaskin (Fas 1)

```json
{
  "transitions": {
    "SETTING_UP": ["FIRST_USE"],
    "FIRST_USE": ["BUILDING_ROUTINE"],
    "BUILDING_ROUTINE": ["ESTABLISHED_ROUTINE"]
  }
}
```

Fasövergångar är deterministiska och dokumenterade — inte implicit spridda i regler.

### Första leverans

```
SETTING_UP  →  FIRST_USE  →  first_success  →  BUILDING_ROUTINE
```

Endast denna kedja implementeras i Fas 1.

## 5.2 Milstolpar (Milestone)

Append-only historik. Två typer:

| Typ | Exempel | Semantik |
|-----|---------|----------|
| **Engång** (`once`) | `first_success`, `routine_ready` | Högst en per familj (ev. per `child_id`) |
| **Upprepbar** (`repeatable`) | `child_logged_in`, `streak_day` | Flera rader tillåtna (framtida) |

Fas 1 använder endast engångsmilstolpar.

### Värde levererat vs erkänt

| Milstolpe | Betydelse | KPI-roll |
|-----------|-----------|----------|
| `child_first_completion` | Barnet levererade värde (check-off) | **System success** — "value delivered" |
| `parent_saw_completion` | Förälder såg resultatet | UX-bro |
| `first_success` | Båda ovan | **Produktmilestone** — "value acknowledged" |

Rapportera **båda** `child_first_completion_within_48h` och `first_success_within_48h`. Att bara mäta `first_success` riskerar att KPI blir UX-friktion snarare än produktvärde.

`onboarding_completed` är **inte** en milstolpe. Det är infrastruktur — se workshop-beslut §7.

## 5.3 Metrics

| Metric | Definition |
|--------|------------|
| `child_first_completion_within_48h` | Value delivered inom 48h |
| `first_success_within_48h` | Value acknowledged inom 48h |
| `handoff_completion_rate` | `handoff_started` → `child_logged_in` |
| `phase_distribution` | Andel familjer per livsfas |
| `phase_transition_latency` | Median tid mellan två livsfaser |
| `milestone_funnel` | account → routine → handoff → completion → first_success |

Analytics-events (`child_login_success`, etc.) behålls som **observability** — domänen skriver milstolpar via backend-hooks.

## 5.4 Terminologi

| Använd | Undvik i domändokument |
|--------|------------------------|
| Livsfas (Phase) | state, status, coreState |
| Milstolpe (Milestone) | achievement (som domänbegrepp) |
| Journey Context | readiness, activation (som domän) |
| Family Journey Model | Journey Engine (i RFC) |

---

# 6. Mapping från dagens kod

| Dagens system | Roll i ny modell |
|---------------|------------------|
| `parent.onboarding_completed` | **Infrastruktur** — `DO NOT USE FOR PRODUCT LOGIC` |
| `onboarding.js` steg 5–6 | Renderar Context (`FIRST_USE`) |
| `dashboard-child-handoff.js` | Handoff-action — triggas av Context |
| `activation-program-aha-card.js` | Firande via `celebration` |
| `parent_activation_program` | Coexist max **2 release-cykler**, sedan avveckling |
| `home-readiness` (coach) | **Ej Fas 1** — legacy kvar |
| `family_activation_state` | Ersätts gradvis av livsfas + milstolpar |
| `GET /api/family/first-success` | Parallell under övergång |

---

# 7. Workshop-beslut (blockers)

Dessa måste besvaras JA/NEJ innan implementation. Övrigt kan justeras i contract.

| # | Beslut | Rekommendation | Konsekvens om NEJ |
|---|--------|----------------|-------------------|
| **1** | Journey Context = single source of truth för Fas 1-ytor? | **JA** — begränsat till onboarding + handoff + celebration | Klienter behåller egna gates → fragmentering kvar |
| **2** | `first_success` som produktmilestone + `child_first_completion` som system-KPI? | **JA** — två nivåer (delivered vs acknowledged) | En KPI blir UX-beroende och skör |
| **3** | `onboarding_completed` kvar som auth-fält? | **JA** — med `DO NOT USE FOR PRODUCT LOGIC` i kod | Kräver alternativ routing-gate |
| **4** | Activation-program coexist med sunset? | **JA** — max **2 release-cykler** efter Fas 1 go-live | Permanent dubbel sanning |
| **5** | Registry statisk i Fas 1, server-driven senare? | **JA** | Snabbare start; planera Fas 2 API |
| **6** | Onboarding-klimax = "Låt barnet börja"? | **JA** | — |
| **7** | Central domäntjänst äger Context? | **JA** | — |
| **8** | Debug/explain från dag 1? | **JA** — `reason` i Context + debug-endpoint | Svårt att felsöka i prod |

## Öppna frågor (ej blockers)

| # | Fråga |
|---|-------|
| 1 | Per-barn eller per-familj för handoff vid flera barn? |
| 2 | Add-child: vilken fas och milstolpar? |
| 3 | Befintliga program-enrollees — löpa ut eller migrera? |
| 4 | Product Engine + Journey Model — sammanslagning eller parallellt? |
| 5 | Pedagog-only — undantag? |

---

# 8. Kända risker och avgränsningar

| Risk | Beskrivning | Motåtgärd |
|------|-------------|-----------|
| **Central brain** | Evaluator blir systemets enda beslutspunkt | Bryt i 3 funktioner: `derivePhase` → `deriveContext`; ingest separat |
| **Mini-BPM utan verktyg** | Implicit workflow svår att visualisera | Explicit `transitions`-tabell; debug-endpoint |
| **Dubbel sanning** | Activation-program + Journey parallellt | Sunset 2 release-cykler; nya KPI på milstolpar |
| **För många lager för tidigt** | Tung dev-onboarding | Hård Fas 1-scope; legacy coexist |
| **Analytics-desync** | Milestone från analytics vs backend | Backend = source of truth; analytics = spegling |
| **God-evaluator** | All logik i en fil | `phases.js`, `evaluator.js`, `ingest.js` separata |

### Designstyrkor (behåll)

- Separation Phase / Milestone / Context
- Context som projection layer (UI state API)
- Append-only milestones (analytics, debug, framtida insights)
- Inkrementell coexistence — med hård sunset

---

# Nästa steg

1. **Fas 1 go-live** — feature flags aktiveras av produktägare (se [implementation contract](./family-journey-implementation-contract.md)).
2. **Fas 2–5** — låst roadmap med DoD per fas: [family-journey-fas2-5-roadmap.md](./family-journey-fas2-5-roadmap.md).
3. **Pre-requisites §P1–P4** i roadmap — beslutas innan Fas 2 kod startar.

**Ingen ny journey-logik utöver godkänd fas-scope. Buggfixar och orelaterade förändringar påverkas inte.**
