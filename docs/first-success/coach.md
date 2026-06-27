# Coach & voice

Hem visar **en** rekommenderad handling. Inga parallella CTAs.

**Brain** bestämmer `recommendedAction`. **Voice-katalog** bestämmer copy. De är separata.

```
Brain → recommendedAction + reason
              ↓
Voice-katalog (webb/app, översättningsbar)
              ↓
UI renderar ett kort
```

---

## Varför Brain inte bär UI

Om API returnerar `headline`, `body`, `cta`, `route`:

- Svårt att A/B-testa utan deploy
- Svårt att översätta
- Webb vs app divergerar
- Brain blir en view controller

Brain returnerar **intent**. Frontend (eller `public/locales/voice/`) äger text.

---

## API (kombinerat svar till klient)

Klienten anropar `GET /api/family/first-success` och slår upp copy lokalt:

```json
{
  "state": "FIRST_ACTIVITY",
  "moment": "FIRST_ACTIVITY",
  "reason": "completed_first_activity",
  "recommendedAction": "ADD_EVENING",
  "milestone": null
}
```

Klient:

```js
const copy = VoiceCatalog.getRecommendedAction(
  brain.recommendedAction,
  { childName, locale: 'sv' }
);
// → { headline, body, cta, route }
```

### Voice-katalog (exempel struktur)

```js
// public/js/voice-catalog.js eller i18n JSON
ADD_EVENING: {
  headline: 'Lägg till kvällsrutinen',
  body: 'Då blir läggningen lika tydlig som morgonen.',
  cta: 'Lägg till kväll',
  route: '/planning?focus=evening',
  reducesUncertainty: 'Du är på rätt väg — nästa steg gör kvällen enklare.',
}
```

A/B: `experiment` key i Brain eller feature flag väljer katalog-variant — inte hårdkod i Brain.

---

## recommendedAction — prioritet (v1)

Brain väljer **högst prioriterade** som inte är uppfylld:

| Prio | Action | Villkor (facts) |
|------|--------|-----------------|
| 1 | SHOW_CHILD | `!child_seen_at` |
| 2 | FIRST_ACTIVITY | `!first_completion_at` |
| 3 | COMPLETE_FIRST_DAY | idag påbörjad, inte allt klart |
| 4 | ADD_EVENING | aktivitet finns, `!evening_schedule_exists` |
| 5 | INVITE_PARENT | `co_parent_count < 2`, aktivitet 2+ dagar |
| 6 | ADD_REWARD | stjärnor, ingen reward claimed |
| 7 | CUSTOMIZE_ROUTINE | vecka 1+ eller ovan klart |
| — | null | coachen tyst |

---

## Progression (användaren ser "Nästa steg")

| Action | Användaren ser (via voice) |
|--------|----------------------------|
| SHOW_CHILD | Visa barnet första rutinen |
| FIRST_ACTIVITY | Ge / upplev första aktiviteten |
| COMPLETE_FIRST_DAY | Slutför dagens rutin |
| ADD_EVENING | Lägg till kväll |
| INVITE_PARENT | Bjud in andra föräldern |
| ADD_REWARD | Lägg till belöning |
| CUSTOMIZE_ROUTINE | Anpassa rutiner |

Säg aldrig "Mission" i UI.

---

## Milestones vs coach

| | Coach | Milestone |
|---|-------|-----------|
| Syfte | Vad nu? | Vad åstadkommit? |
| Källa | `recommendedAction` | `milestone` från Brain |
| UI | Ett kort på Hem | Kort modal / toast |
| Samtidigt | Coach döljs eller under celebration | Inte två lika viktiga CTAs |

---

## Minska osäkerhet (Lag 7)

Varje voice-post bör kunna inkludera `reducesUncertainty` — en mening som bekräftar att familjen gör rätt.

Exempel efter registrering:

> "Eras första rutin är redo. Nästa steg är att visa barnet — det tar under en minut."

---

## Ersätter

- Splittrad `GET /api/family/readiness` (gradvis)
- Hårdkodad copy i `admin-start` / dashboard för activation CTAs
