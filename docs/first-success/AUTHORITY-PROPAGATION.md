# Authority propagation — PR2 design

> **Status:** Plan (post-PR1). PR1 etablerade A:s **monopol-yta** (`#engineCoachMount`).  
> PR2 styr **hur A påverkar resten av Hem** utan att bli global overlay eller att loggar blir policy.

Relaterat: [AUTHORITY-PRECEDENCE.md](AUTHORITY-PRECEDENCE.md), [DECISION-BOUNDARIES.md](DECISION-BOUNDARIES.md).

---

## Vad PR1 bevisade

| Bevis | Betydelse |
|-------|-----------|
| Exklusiv slot | A kan vara **normativ** för primary intent |
| B/C/D oförändrade | Multi-authority samexisterar utan split-brain i slotten |
| `engine_authority_conflict` | Avvikelse är **mätbar**, inte gissad |

PR1 är **auktoritetsoffentliggöring**, inte full migration.

---

## PR2 = authority propagation control

**Inte:** “ta bort readiness/CTA”.  
**Utan:** definiera **influence radius** — vad A får påverka utanför monopol-ytan, och vad som förblir fristående.

---

## 1. A influence radius (Hem)

### Inom radius (A får påverka i PR2)

| Yta | Propagation | Mekanism |
|-----|-------------|----------|
| `#engineCoachMount` | **Full** (redan PR1) | Enda primary CTA från `policy.name` |
| Visuell hierarki | **Delvis** | Coach alltid ovanför readiness; readiness visuellt “sekundär” (typografi/spacing, ej dölj) |
| Handoff-action | **Delvis** | `SHOW_CHILD` / celebration → `DashboardChildHandoff.startChildLogin()` (redan kopplat) |
| Analytics | **Full** | `engine_coach_cta_click`, `engine_authority_conflict` |

### Utanför radius (A får INTE påverka i PR2)

| Yta | Varför |
|-----|--------|
| `#homeReadinessMount` innehåll | B operativ — filtreras separat, inte styrt av A-output |
| `#medforalderCtaBanner` | C — avvecklas först när metrics visar A `INVITE_CO_PARENT` räcker |
| `#activationProgramBanner` | D — isolerat experiment |
| `encouragementCopy` i magic hub | C — egen migration (PR4) |
| Auth redirect / onboarding | Infrastruktur |

### Propagation-regel (PR2)

```
När first_success_engine_api = ON och Engine svarar 200:
  1. #engineCoachMount är alltid synlig (om policy finns)
  2. Readiness får inte visa items med type "coach_semantic" (se nedan)
  3. CTA-banners får inte duplicera samma policy.name som A (logga, ev. visuellt nedprioritera — ej auto-dölj i PR2)
```

---

## 2. Readiness: latent authority → operativ only

### Coach-semantik vs operativ-semantik

| Readiness `type` (idag) | Klass | PR2 |
|-------------------------|-------|-----|
| `pending_approval` | Operativ | ✅ Behåll |
| `pending_invite` | Operativ | ✅ Behåll |
| `incomplete_past_days` | Gråzon | ⚠️ Mät konflikt med A `NEEDS_CONSISTENCY` |
| (framtida coach-liknande) | Coach-semantik | ❌ Flytta till A / voice |

**PR2-åtgärd (server):** `/readiness` returnerar `semantic: 'operational' | 'coach'` per item. Klienten renderar operational under coach; loggar om både coach item och A visible.

**PR2-åtgärd (klient):** `home-readiness.js` — ingen ändring av mount; ev. CSS-klass `readiness-secondary` när `#engineCoachMount` inte är hidden.

---

## 3. Conflict resolution policy

### Princip

> **`engine_authority_conflict` är instrumentering — aldrig automatisk policy.**

| Nivå | Vem | Handling |
|------|-----|----------|
| L0 Log | System | Alltid — analytics + valfri admin aggregate |
| L1 Review | Produkt/eng | Veckovis: toppkonflikter, justera B/C eller voice |
| L2 Code | Eng | Endast när L1 beslutat: t.ex. filtrera readiness type, dölja C banner |
| L3 Engine | Eng | Ändra A rules/policies — sista utväg |

**Förbjudet:**

- Auto-dölj readiness när conflict > 0
- Auto-override CTA baserat på conflict count
- Routing `engine_authority_conflict` → `ProductEngine.evaluate` input

### När logg blir mänsklig action (exempel)

| Conflict | Mänsklig tolkning | Möjlig L2-åtgärd |
|----------|-------------------|------------------|
| `readiness_and_engine_both_visible` | OK om readiness operational | Filtrera coach-liknande readiness items |
| `engine_invite_vs_cta_banner` | Dubbel invite | PR3: dölj C när A = INVITE_CO_PARENT |
| `engine_milestone_vs_activation_aha` | Dubbel celebration | PR5: D av, A milestone modal |

---

## 4. Drift signals (mät först)

### Primära metrics (PR2 observability)

| Event / metric | Fråga |
|----------------|-------|
| `engine_coach_cta_click` / impressions | Tar användare A:s primary CTA? |
| `engine_authority_conflict` rate | Hur ofta samexisterar auktoriteter? |
| `readiness_action_click` efter coach visible | Bitar B fortfarande? |
| `policy.name` distribution | Stämmer A med förväntad funnel? |
| Time-to-first `engine_coach_cta_click` efter signup | Propagation till beteende |

### Semantisk drift (vad vi letar efter)

```
Drift = användaren följer C/B/D men Engine säger annat intent
```

Tecken:

- Hög `engine_invite_vs_cta_banner` + klick på medförälder-banner, inte coach
- Hög conflict rate + låg `engine_coach_cta_click`
- A = `SHOW_CHILD` men låg child handoff rate

**PR2 levererar:** admin eller script aggregate på `analytics_events` för `engine_*` — inte ny Engine-logik.

---

## 5. Downstream behavior (bevisa att A inte bara är ett kort)

A påverkar **beteende** när:

| Signal | Downstream |
|--------|------------|
| `SHOW_CHILD` click | `child_seen_at` / child login (facts → Engine state change) |
| `ADD_EVENING` click | Planning öppnas, kväll schema (facts → `has_evening`) |
| `milestone: first_success` | Celebration modal (PR5 — koppla befintlig confetti) |

**PR2 minimum:** spåra click → 7d retention på `first_success_within_48h` proxy. Ingen auto-loop än.

---

## 6. PR2 scope (förslag)

| Inkludera | Exkludera |
|-----------|-----------|
| `semantic` på readiness items (server) | Ta bort readiness |
| CSS/visual secondary för readiness under coach | Auth/onboarding |
| Conflict aggregate script eller admin card | Auto conflict resolution |
| Dokumentera L0–L3 resolution | D experiment merge |

---

## 7. PR-fasöversikt (uppdaterad)

| PR | Fokus |
|----|-------|
| PR1 ✅ | Monopol-yta + fetch + conflict log |
| PR2 | Influence radius + readiness semantic split + drift metrics |
| PR3 | C banner av när A invite dominerar |
| PR4 | `encouragementCopy` → A tone |
| PR5 | Celebration authority (A milestone vs D aha) |

---

## Acceptance (PR2)

- [ ] Readiness items har `semantic: operational|coach`
- [ ] Inga coach-semantic items renderas under A utan conflict log
- [ ] Drift dashboard eller weekly script för `engine_*` events
- [ ] Skriftlig L1-review-process (denna doc räcker som L0/L1 definition)
- [ ] Ingen automatisk governance från conflict log
