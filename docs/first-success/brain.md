# Product Brain

Det viktigaste tekniska beslutet i First Success v2.

Idag: coach, push, nudge, milestones och voice har **egna regler**.  
Mål: **ett lager** — facts → state machine → outputs.

```
Family facts (DB + events)
        ↓
Product Brain (state machine)
        ↓
Outputs (moment, reason, recommendedAction, milestone?)
        ↓
Kanaler (coach, voice-katalog, push, email, celebration)
```

**Brain returnerar inte UI.** Ingen `headline`, `cta` eller `route` i Brain-svaret. Se [coach.md](coach.md).

---

## State machine (inte if/else per kanal)

Brain håller **ett** `currentState` per familj. Coach, push och voice frågar state — de räknar inte om från noll.

### States (v1)

```
REGISTERED
    ↓
ROUTINE_READY
    ↓
CHILD_SEEN
    ↓
FIRST_ACTIVITY
    ↓
FIRST_DAY_COMPLETE
    ↓
STREAK_3
    ↓
WEEK_1
    ↓
CUSTOMIZING
```

Sidostates / flags (inte separata huvudflöden): `EVENING_ADDED`, `CO_PARENT_INVITED`.

### Övergångar (exempel)

| Från | Till | Trigger (fact) |
|------|------|----------------|
| — | REGISTERED | `family.created_at` |
| REGISTERED | ROUTINE_READY | `routine_created_at` satt |
| ROUTINE_READY | CHILD_SEEN | `child_seen_at` satt |
| CHILD_SEEN | FIRST_ACTIVITY | `first_completion_at` ELLER annat First Success-bevis |
| FIRST_ACTIVITY | FIRST_DAY_COMPLETE | `first_day_completed_at` |
| FIRST_DAY_COMPLETE | STREAK_3 | `streak_days >= 3` |
| STREAK_3 | WEEK_1 | `days_since_signup >= 7` och aktivitet |
| * | CUSTOMIZING | användaren öppnat Anpassa ELLER coach rekommenderat |

Implementation: `src/lib/product-brain/state-machine.js` — `transition(facts) → currentState`.

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
| `onboarding_wizard_completed` | bool | legacy; nedprioriterad |
| `days_since_signup` | int | beräknat |

Facts samlas i `collectFamilyFacts(familyId)` — en query-yta, cachebar per request.

---

## Brain output (API)

```
GET /api/family/first-success
```

```json
{
  "state": "FIRST_ACTIVITY",
  "moment": "FIRST_ACTIVITY",
  "reason": "completed_first_activity",
  "firstSuccess": {
    "achieved": true,
    "at": "2026-06-27T18:00:00Z",
    "kind": "star"
  },
  "recommendedAction": "ADD_EVENING",
  "milestone": "first_activity"
}
```

| Fält | Beskrivning |
|------|-------------|
| `state` | Nuvarande state machine-läge |
| `moment` | Vad som just hänt / vad vi firar (kan = state) |
| `reason` | Maskinläsbar orsak för analytics och A/B |
| `recommendedAction` | Coach-intent (enum) |
| `milestone` | Om celebration ska visas (enum eller null) |

**Inget** `headline`, `body`, `cta`, `route` här.

### recommendedAction (enum v1)

```
SHOW_CHILD
FIRST_ACTIVITY
COMPLETE_FIRST_DAY
ADD_EVENING
INVITE_PARENT
ADD_REWARD
CUSTOMIZE_ROUTINE
null
```

Prioritet när flera kandidater: definieras i `rules-coach.js` — Brain väljer **en**.

---

## Kanaler konsumerar samma output

| Kanal | Läser |
|-------|--------|
| Coach (Hem) | `recommendedAction` + voice-katalog |
| Celebration | `milestone` + voice-katalog |
| Push | `moment` + push-template per moment |
| Email / nudge | `state` + scheduler timing |
| Admin advisor | samma `facts` |

Exempel: `moment = FIRST_ACTIVITY`

| Kanal | Beteende |
|-------|----------|
| Coach | `recommendedAction: ADD_EVENING` |
| Voice | `voice.first_activity.headline` (klient) |
| Push | mall `first_activity` |
| Milestone | `first_activity` celebration |

---

## Teknisk placering

```
src/lib/product-brain/
  index.js           computeBrainOutput(familyId)
  collect-facts.js   collectFamilyFacts
  state-machine.js   transition + currentState
  rules-coach.js     recommendedAction priority
  rules-milestone.js milestone triggers
```

Push/email-mallar: `templates/` eller befintliga schedulers som läser `moment`.

---

## First Success ≠ bara stjärna

`first_success_at` sätts när **minst ett** bevis inträffar:

```js
first_success_at = min(
  first_completion_at,
  first_day_completed_at,
  // ev. smooth_morning när vi har signal
)
```

`first_success_kind` dokumenterar vilket. Brain state går till `FIRST_ACTIVITY` på samma trigger.
