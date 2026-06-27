# Coach & voice (presentation)

> **Engine-spec:** [ENGINE_SPEC.md](ENGINE_SPEC.md). **Policy-lager:** `src/core-engine/5-policy/`.

Hem visar **en** rekommenderad handling. Presentation är **dum** — den konsumerar Engine-output.

```
Brain → primaryNeed + milestone + reason
              ↓
Coach → action (produktstrategi, experiment)
              ↓
Voice-katalog (tone, headline, body, cta)
              ↓
UI renderar ett kort
```

Coach är där produktstrategi lever. Brain ska inte veta om `ADD_EVENING` vs `ADD_REWARD`.

---

## Need → Action (Coach-lager)

| primaryNeed | Action v1 (kan ändras via experiment) | Villkor |
|-------------|---------------------------------------|---------|
| `SHOW_CHILD` | `SHOW_CHILD` | `!child_seen_at` |
| `COMPLETE_DAY` | `COMPLETE_FIRST_DAY` | idag påbörjad, inte allt klart |
| `RE_ENGAGE` | `RESUME_ROUTINE` | dormant/returning |
| `INCREASE_CONSISTENCY` | `ADD_EVENING` | `!evening_schedule_exists` |
| `INCREASE_CONSISTENCY` | `ADD_WEEKEND` | (experiment) helg-schema saknas |
| `INCREASE_CONSISTENCY` | `ADD_REMINDER` | (experiment) push på |
| `SHARE_RESPONSIBILITY` | `INVITE_PARENT` | `co_parent_count < 2` |
| `PERSONALIZE` | `CUSTOMIZE_ROUTINE` | vecka 1+ |
| `PERSONALIZE` | `ADD_REWARD` | (experiment) stjärnor, ingen reward |
| `null` | — | coachen tyst |

Om flera actions kan uppfylla samma need — Coach väljer via prioritet eller experiment. Brain ändras inte.

### Action enum (Coach-output, inte Brain)

```
SHOW_CHILD
COMPLETE_FIRST_DAY
ADD_EVENING
ADD_WEEKEND
ADD_REMINDER
INVITE_PARENT
ADD_REWARD
CUSTOMIZE_ROUTINE
RESUME_ROUTINE
```

---

## Varför Brain inte bär UI

Om Brain returnerar `headline`, `body`, `cta`, `route`:

- Svårt att A/B-testa utan deploy
- Svårt att översätta
- Webb vs app divergerar
- Brain blir en view controller
- Produktstrategi låses i domänlagret

Brain returnerar **need**. Coach returnerar **action**. Voice returnerar **copy**.

---

## Voice-katalog

Varje action (eller milestone) har en voice-post. Brain returnerar inte text.

### Fält per post

| Fält | Beskrivning |
|------|-------------|
| `tone` | Vilken känsla UI ska förmedla — styr komponentval |
| `headline` | Kort rubrik |
| `body` | Förklaring |
| `cta` | Knapptext |
| `route` | Vart CTA leder (webb/app kan divergera) |
| `reducesUncertainty` | Lag 7 — bekräftar att familjen gör rätt |

### Tone (v1)

| Tone | När | UI-hint |
|------|-----|---------|
| `celebration` | Milestone, first success | Konfetti, varm färg |
| `encouragement` | På väg, halvvägs | Mjuk, framåt |
| `calm` | Rutin, vardag | Låg kontrast, ingen stress |
| `coach` | Nästa steg | Tydlig CTA, ett fokus |
| `warning` | Sällan — t.ex. dormant 14d | Varsam, inte skuldbeläggande |

Exempel (konceptuellt):

```
ADD_EVENING:
  tone: coach
  headline: Lägg till kvällsrutinen
  body: Då blir läggningen lika tydlig som morgonen.
  cta: Lägg till kväll
  reducesUncertainty: Du är på rätt väg — nästa steg gör kvällen enklare.

first_success (milestone):
  tone: celebration
  headline: Första framgången!
  body: [kind-specifik text]
```

### Kind-specifik copy (milestones)

`first_success` med `kind: star` vs `full_routine` vs `smooth_morning` — olika body i voice, samma milestone. Brain levererar `kind`; voice väljer text.

---

## Klientflöde

1. Hämta Brain-output (`primaryNeed`, `milestone`, …)
2. Coach (server eller klient) mappar `primaryNeed` → `action` (ev. feature flag / experiment)
3. Slå upp `VoiceCatalog.get(action, { childName, kind, locale })`
4. Rendera ett kort med rätt `tone`-komponent

A/B och feature flags på **steg 2–3** — aldrig i Brain.

---

## Progression (användaren ser "Nästa steg")

| Need → Action | Användaren ser (via voice) |
|---------------|----------------------------|
| SHOW_CHILD | Visa barnet första rutinen |
| COMPLETE_FIRST_DAY | Slutför dagens rutin |
| ADD_EVENING | Lägg till kväll |
| INVITE_PARENT | Bjud in andra föräldern |
| ADD_REWARD | Lägg till belöning |
| CUSTOMIZE_ROUTINE | Anpassa rutiner |
| RESUME_ROUTINE | Fortsätt där ni slutade |

Säg aldrig "Mission" i UI.

---

## Milestones vs coach

| | Coach | Milestone |
|---|-------|-----------|
| Syfte | Vad nu? | Vad åstadkommit? |
| Källa | `primaryNeed` → action | `milestone` från Brain |
| Tone | `coach`, `encouragement`, `calm` | `celebration` |
| UI | Ett kort på Hem | Kort modal / toast |
| Samtidigt | Coach döljs eller under celebration | Inte två lika viktiga CTAs |

---

## Minska osäkerhet (Lag 7)

Varje voice-post bör inkludera `reducesUncertainty` — en mening som bekräftar att familjen gör rätt.

Exempel efter registrering:

> "Eras första rutin är redo. Nästa steg är att visa barnet — det tar under en minut."

---

## Experiment (Coach, inte Brain)

```
Hypotes: INCREASE_CONSISTENCY → ADD_REWARD konverterar bättre än ADD_EVENING
Variant A: coach map need → ADD_EVENING
Variant B: coach map need → ADD_REWARD
Metric: need_fulfilled_within_7d, first_success_within_48h
```

Brain-output identisk mellan varianter. Endast Coach + voice skiljer sig.

---

## Ersätter

- Splittrad readiness-logik med hårdkodad copy
- Produktstrategi i Brain (`recommendedAction` med `ADD_EVENING` direkt i domänlagret)
