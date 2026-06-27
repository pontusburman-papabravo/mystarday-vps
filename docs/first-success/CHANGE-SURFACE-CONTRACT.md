# Change surface contract — prod-kommunikation vid A-ändringar

> **Regel:** Ingen produktionsändring i multi-authority-systemet är giltig utan en **mänskligt läsbar intent-sats** kopplad till den yta som faktiskt förändras.

Relaterat: [PROD-OPERATING-ENVELOPE.md](PROD-OPERATING-ENVELOPE.md), [PROD-STABILITY-MODEL.md](PROD-STABILITY-MODEL.md), [AUTHORITY-PRECEDENCE.md](AUTHORITY-PRECEDENCE.md).

---

## Problemet

Familjer ser inte A/B/C/D. De ser:

- ett nytt kort på Hem
- readiness som fortfarande finns
- CTA-banners som fortfarande finns
- eventuellt activation-experiment

Utan lokalt kontrakt blir det: *"Vem bestämmer? Varför ändrades hemmet?"*

---

## Kontrakt per release (obligatoriskt fält)

Varje deploy som påverkar användarens upplevelse via Engine-coachen ska ha:

| Fält | Syfte | Exempel (PR1) |
|------|--------|----------------|
| `release_id` | Unik nyckel för dismiss / analytics | `coach_primary_v1` |
| `user_visible_intent` | **En mening** — vad användaren ska förstå | *"Vi visar nu ett tydligt förslag till nästa steg här på Hem."* |
| `what_changed` | Konkret, synlig förändring | *"Ett kort med 'Nästa steg' har lagts till högst upp."* |
| `why_it_matters` | Varför det hjälper (inte teknik) | *"Ni behöver inte leta bland påminnelser — ett förslag i taget."* |

### Förbjudet i användartext

- "Engine", "policy", "auktoritet", "logik", "modell"
- Generiska release notes utan koppling till ytan
- Onboarding-popup långt från Hem
- Settings-sida som enda förklaring

### Tillåtet språk

- "Ny coach", "rekommendation", "förslag till nästa steg"
- Funktion, inte system

---

## Var kontraktet visas

**Endast i `#engineCoachMount`** — samma yta som förändringen, inte ett extra lager.

```
┌─────────────────────────────────────┐
│ [Ny] Kort förklaring (dismiss ×)    │  ← change notice (första gången / per release_id)
│ NÄSTA STEG                          │
│ Rubrik från policy                  │
│ Brödtext                            │
│ [ Primär CTA ]                      │
└─────────────────────────────────────┘
```

Implementering: `public/js/engine-coach-change.js` + render i `engine-coach.js`.

Dismiss: `localStorage` nyckel `engine_coach_change_seen_<release_id>`.

---

## Stabilitet > precision

Användaren behöver **en** stabil berättelse:

> *"Här får jag ett förslag till nästa steg. Resten på sidan är påminnelser och verktyg."*

Readiness (B), CTA (C) och activation (D) ska **inte** försöka förklara coachen. De fortsätter med sina egna etiketter (väntande godkännanden, bjud in, etc.).

Om B/C-text låter som "nästa steg" — det är en **konflikt-yta** (se PROD-OPERATING-ENVELOPE), inte något coachen ska motverka med mer copy.

---

## Checklista före prod-deploy (A-ändring)

- [ ] `release_id` satt i `engine-coach-change.js`
- [ ] Tre fält ifyllda på svenska, utan systemjargon
- [ ] Kontrakt visas **i** coach-kortet, inte separat modal
- [ ] Kill switch dokumenterad (`first_success_engine_api` / `FIRST_SUCCESS_ENGINE_API=false`)
- [ ] B/C/D oförändrade eller explicit noterade i PR (inga dolda semantikskiften)
- [ ] `engine_authority_conflict` fortsätter loggas — **aldrig** styra auto-dölj

---

## PR-fasöversikt (kommunikation)

| PR | Tekniskt | Användarkontrakt |
|----|----------|------------------|
| PR1 ✅ | Monopol-yta `#engineCoachMount` | "Nytt kort: Nästa steg på Hem" |
| PR2 | Stabilisering + mätning (ej expansion) | Ingen ny användartext om inte beteende synligt ändras |
| PR3+ | Propagation endast efter L1-beslut | Ny `release_id` + ny intent-sats |

---

## Acceptance

- [ ] Befintlig familj som öppnar Hem ser **lokalt** varför ett nytt kort finns
- [ ] Efter dismiss visas inte samma intro igen (samma `release_id`)
- [ ] Ingen separat "Engine"- eller changelog-UI krävs för att förstå förändringen
