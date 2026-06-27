# Product Brain (domänöversikt)

> **Full implementation:** [ENGINE_SPEC.md](ENGINE_SPEC.md) och `src/core-engine/`.

Brain är domänlagret i Product Engine — facts genom needs. Policy och presentation lever i separata lager.

```
Family facts (DB + events)
        ↓
Product Brain (deterministisk domänlogik)
        ↓
Outputs: state + capabilities + primaryNeed + milestone?
        ↓
Coach översätter need → action → copy (se coach.md)
```

**Brain beskriver användaren. Inte produkten.**

Brain returnerar inte UI, copy, routes eller produktåtgärder som `ADD_EVENING`. Det uttrycker **behov** (`INCREASE_CONSISTENCY`). Coach väljer **hur** behovet möts — och det kan ändras via experiment utan att Brain skrivs om.

---

## Determinism (obligatorisk regel)

Brain är **helt deterministisk**. Samma facts in → samma output ut. Alltid.

**Brain får aldrig läsa:**

| Förbjudet | Varför |
|-----------|--------|
| UI / routes / komponenter | Presentation är Coach |
| Feature flags | Experiment är Coach |
| Locale / språk | Copy är voice-katalog |
| Copy / headlines | Voice-katalog |
| Experimentvarianter | A/B är Coach |

**Brain läser endast facts** (och beräknar state, capabilities, needs, milestones).

Det gör Brain extremt enkel att testa: mock facts → assert output. Inga sidoeffekter.

---

## Tre lager i output (inte en linjär kedja)

Livet är inte linjärt. En familj kan ha första aktivitet, vara borta två veckor, och komma tillbaka. En familj kan bjuda in medförälder utan streak.

Därför: **core state + capabilities + facts** — inte en enda `REGISTERED → … → WEEK_1`-kedja.

### Core state

Var familjen befinner sig i sin relation till produkten:

```
ONBOARDING     — registrerad, rutin eller handoff saknas
ACTIVE         — rutin finns, familjen använder produkten
FIRST_SUCCESS  — minst ett First Success-bevis uppnått
DORMANT        — ingen aktivitet på X dagar (konfigurerbart)
RETURNING      — var dormant, nu aktiv igen
```

Core state är **ömsesidigt uteslutande** — en familj har exakt ett core state.

### Capabilities (icke-linjära flaggor)

Vad familjen **har** eller **gjort** — oberoende av varandra:

```
has_routine           — schema finns
has_evening           — kvällsrutin finns
has_reward            — minst en belöning skapad eller claimad
has_second_parent     — två föräldrar kopplade
child_has_seen_app    — barnet har sett sin rutin
has_first_completion  — minst en aktivitet klar
```

Capabilities är **additiva**. De försvinner inte när core state ändras (utom om data raderas).

### Facts (rådata)

Allt Brain läser — se tabellen nedan. Facts är input; state och capabilities är **deriverade**.

---

## First Success som domänbegrepp

`FIRST_ACTIVITY` som state var en proxy för dagens produkt. **First Success** är domänen.

| Fält | Beskrivning |
|------|-------------|
| `first_success_at` | När minst ett bevis inträffade |
| `first_success_kind` | Vilket bevis: `star` \| `full_routine` \| `smooth_morning` |

När `first_success_at` sätts → core state blir `FIRST_SUCCESS`. **Kind** är detaljen — inte ett separat state i maskinen.

Brain sätter inte hårdkodat att endast stjärna räknas. Minst ett bevis räcker.

---

## Needs (inte produktstrategi)

Brain uttrycker **vad familjen behöver** — inte vilken knapp de ska trycka.

```
primaryNeed (enum)
```

### Needs v1

| Need | Betydelse (domän) |
|------|-------------------|
| `SHOW_CHILD` | Barnet har inte sett rutinen |
| `COMPLETE_DAY` | Dagens rutin påbörjad men inte klar |
| `INCREASE_CONSISTENCY` | Aktivitet finns men mönster svagt (streak, kväll, helg) |
| `SHARE_RESPONSIBILITY` | En förälder bär allt |
| `PERSONALIZE` | Grunden fungerar — dags att anpassa |
| `RE_ENGAGE` | Familjen var aktiv, nu tyst |
| `null` | Inget akut behov — coachen tyst |

**Brain rekommenderar inte.** Den uttrycker ett behov. Coach översätter:

```
INCREASE_CONSISTENCY
        ↓
ADD_EVENING   eller   ADD_WEEKEND   eller   ADD_REMINDER
        ↓
Copy + CTA (voice-katalog)
```

Om ni om sex månader vill föreslå "första belöning" istället för "kvällsrutin" — ändrar ni **Coach**, inte Brain.

### Prioritet (domän, inte produkt)

Brain väljer **ett** `primaryNeed` när flera gäller:

| Prio | Need | Villkor (facts/capabilities) |
|------|------|------------------------------|
| 1 | `SHOW_CHILD` | `!child_has_seen_app` |
| 2 | `COMPLETE_DAY` | idag påbörjad, inte allt klart |
| 3 | `RE_ENGAGE` | core state `DORMANT` eller `RETURNING` |
| 4 | `INCREASE_CONSISTENCY` | `has_first_completion`, svag streak eller saknad kväll |
| 5 | `SHARE_RESPONSIBILITY` | en förälder, aktivitet 2+ dagar |
| 6 | `PERSONALIZE` | vecka 1+ eller capabilities tillräckliga |
| — | `null` | inget akut |

Prioriteten beskriver **familjens situation** — inte produktens roadmap.

---

## Facts (Brain-input)

Alla regler läser **facts** — aldrig ad hoc queries i coach/push.

| Fact | Typ | Källa / kommentar |
|------|-----|-------------------|
| `family_id` | uuid | `family` |
| `signup_at` | timestamptz | `family.created_at` |
| `child_count` | int | `child` |
| `primary_child_id` | uuid | första barnet |
| `routine_created_at` | timestamptz | schema finns |
| `evening_schedule_exists` | bool | kväll i weekly_schedule |
| `child_seen_at` | timestamptz | barn login ELLER förälder markerat "visat" |
| `first_completion_at` | timestamptz | `family_activation_state` |
| `first_day_completed_at` | timestamptz | alla dagens items klara första gången |
| `first_success_at` | timestamptz | minst ett First Success-bevis |
| `first_success_kind` | enum | `star` \| `full_routine` \| `smooth_morning` |
| `last_activity_at` | timestamptz | senaste completion eller login |
| `streak_days` | int | `streak` eller beräknat |
| `co_parent_invited_at` | timestamptz | `family_invite` skickad |
| `co_parent_count` | int | `parent` per family |
| `reward_claimed_at` | timestamptz | första `reward_redemption` |
| `days_since_signup` | int | beräknat |
| `days_since_last_activity` | int | beräknat |

Facts samlas i en enda funktion per request — cachebar, testbar.

---

## Brain output (kontrakt)

Brain returnerar **domän** — inget UI.

| Fält | Beskrivning |
|------|-------------|
| `coreState` | `ONBOARDING` \| `ACTIVE` \| `FIRST_SUCCESS` \| `DORMANT` \| `RETURNING` |
| `capabilities` | Objekt med bool-flaggor (se ovan) |
| `primaryNeed` | Ett behov eller `null` |
| `milestone` | Om celebration ska visas (enum eller null) |
| `firstSuccess` | `{ achieved, at, kind }` |
| `reason` | Maskinläsbar orsak för analytics |

**Inget** `headline`, `body`, `cta`, `route`, `recommendedAction`, `ADD_EVENING` här.

`moment` (vad som just hänt) kan speglas i `milestone` — Brain firar domänhändelser, inte UI-events.

---

## Milestones

Milestones = vad vi **åstadkommit** (firande). `primaryNeed` = vad familjen **behöver nu** (coach).

| Milestone | Trigger |
|-----------|---------|
| `routine_ready` | `routine_created_at` |
| `child_seen` | `child_seen_at` |
| `first_success` | `first_success_at` (med `kind`) |
| `first_day_complete` | `first_day_completed_at` |
| `streak_3` | `streak_days >= 3` |
| `week_1` | `days_since_signup >= 7` och aktivitet |

Inte på samma skärm som coach.

---

## Kanaler konsumerar Brain + Coach

| Kanal | Läser |
|-------|--------|
| Coach (Hem) | `primaryNeed` → Coach → action → voice |
| Celebration | `milestone` + voice |
| Push | `coreState` + `primaryNeed` + mallar (Coach-lager) |
| Email / nudge | `coreState` + timing |
| Admin advisor | samma `facts` |

Exempel: `milestone = first_success`, `primaryNeed = INCREASE_CONSISTENCY`

| Kanal | Beteende |
|-------|----------|
| Celebration | firar first success (`kind` i copy) |
| Coach | Coach mappar need → t.ex. `ADD_EVENING` (experiment) |
| Voice | `tone: celebration` för milestone; `tone: coach` för need |

---

## Learning Loop

Regler är inte eviga. Produktstrategi förändras när data visar vad som fungerar.

```
Product Brain (facts → state → needs)
        ↓
Coach (need → action → copy)
        ↓
Family action (klick, completion, handoff)
        ↓
Metrics (first_success_within_48h, need_fulfilled, …)
        ↓
Experiment (A/B på Coach — inte Brain)
        ↓
Uppdaterade coach-regler ELLER nya facts
```

| Lager | Vad som får ändras ofta |
|-------|-------------------------|
| Brain | Nya facts, tydligare needs, bättre dormant-trösklar |
| Coach | Vilken action som möter `INCREASE_CONSISTENCY`, copy, tone, A/B |
| Voice | Texter, locale, `reducesUncertainty` |
| Constitution | Sällan — bara om produktfilosofin skiftar |

**Experiment hör hemma i Coach.** Om `INCREASE_CONSISTENCY` ska leda till belöning istället för kväll — ändra coach-mappningen, mät, behåll Brain.

Brain-regler uppdateras när vi **förstår familjen bättre** (nya facts, bättre `DORMANT`-definition). Inte när vi vill testa en CTA.

---

## Implementation (referens)

Implementationsdetaljer lever i kod och separata tekniska noter — inte i denna arkitekturspec. Se byggordning i projektets implementation-tracker.

Kärnmoduler (konceptuellt):

- `collectFamilyFacts` — facts
- `deriveStateAndCapabilities` — core state + capabilities
- `derivePrimaryNeed` — needs-prioritet
- `deriveMilestone` — firanden

Alla deterministiska, rena funktioner: `(facts) → output`.
