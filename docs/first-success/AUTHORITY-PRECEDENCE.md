# Authority precedence — Hem (`/dashboard`)

> **Syfte:** Mekaniskt låsa vem som får styra vilken UI-yta — så PR1 inte blir “parallell sanning” utan **begränsad auktoritet**.

Relaterat: [DECISION-BOUNDARIES.md](DECISION-BOUNDARIES.md), [ENGINE_SPEC.md](ENGINE_SPEC.md).

---

## Fyra typer av sanning (inte lager)

| ID | System | Auktoritet | Fråga den svarar på |
|----|--------|------------|---------------------|
| **A** | Product Engine | Normativ | *Vad ska familjen göra härnäst?* |
| **B** | Readiness | Operativ drift | *Vad kräver uppmärksamhet just nu?* |
| **C** | Implicit UI policy | Odeklarerad (shadow) | *Vad tycker klienten att användaren borde göra?* |
| **D** | Activation experiment | Hypotes-loop | *Vad testar vi denna vecka?* |

**Infrastruktur** (auth, offline, impersonation) ingår inte — den styr åtkomst, inte produktintent.

---

## Precedence-regler (Hem)

```
1. A får ENDAST styra ytor explicit markerade "A-owned" i PR1.
2. B, C, D fortsätter som idag på sina ytor — A får inte duplicera dem.
3. C ska gradvis ersättas av A (ej PR1) — aldrig två beslut om samma fråga.
4. D är isolerad — A läser inte D; D läser inte A.
5. B informeras av facts (samma DB), inte av A:s output (ingen cirkel).
6. Vid konflikt: logga, dölj inte — se Conflict protocol nedan.
```

### Vad “informs B read-only” betyder

- Readiness **får** visa pending approvals även om A säger `SHOW_CHILD`.
- Readiness **får inte** visa en andra “nästa steg”-coach med samma semantik som A.
- Långsiktigt: `/readiness` items filtreras till **operativa typer** (se öppna frågor).

---

## PR1-hård regel (anti dual-system drift)

> **A får bara påverka UI där B/C/D inte redan tar samma beslut.**

I PR1 betyder det:

| Tillåtet | Förbjudet |
|----------|-----------|
| Ny mount `#engineCoachMount` med **ett** kort | Ersätta/redigera `#homeReadinessMount` |
| Visa Engine policy som **observation** (dev/flag) | Dölja readiness när Engine har annan policy |
| Logga `engine_authority_conflict` vid överlapp | Låta två “nästa steg”-CTAs synas utan logg |
| CTA som **endast** kommer från `policy.name` + voice | `if (stars)` / `parent_count` i engine-coach |

---

## Matrix: UI-komponent × auktoritet

Sortering på Hem (över → under) enligt `dashboard.html`.

| UI-komponent | DOM / init | Nuvarande auktoritet | PR1: vem styr? | PR1: A får? | Senare mål |
|--------------|------------|----------------------|----------------|-------------|------------|
| Impersonation / offline / system message | banners | Infrastruktur | Infrastruktur | ❌ | — |
| Dagens nyhet app banner | `#dagensNyhetAppBanner` | Admin content | Admin | ❌ | — |
| Active sharing | `#activeSharingBanner` | Server/reports | B-operativ | ❌ | B |
| **Activation program banner** | `#activationProgramBanner` (JS insert) | **D** | **D** | ❌ | D → avveckla |
| Medförälder CTA | `#medforalderCtaBanner` | **C** (`dashboard-cta.js`) | **C** | ❌ | **A** (`INVITE_CO_PARENT`) |
| Dela appen CTA | `#delaAppenCtaBanner` | **C** (growth) | **C** | ❌ | C eller marketing |
| Daily summary warmth | `#dashboardDailySummary` | **C** / stats | **C** | ❌ | A `uiTokens` tone |
| **Magic home hub** | `#parentHomeHubMount` | **C** (`encouragementCopy`) | **C** | ❌ | A + data display |
| **Readiness lista** | `#homeReadinessMount` | **B** | **B** | ❌ | B (smal operativ) |
| **Engine coach (NY)** | `#engineCoachMount` | — | **A** | ✅ **enda PR1-yta** | A |
| Home bump time | `#homeBumpMount` | Operativ verktyg | Operativ | ❌ | — |
| Child handoff | `#dashboardChildHandoff` | UX shell | UX | ❌ | **Action** utför A `SHOW_CHILD` |
| Child cards grid | `#childCardsGrid` | Data (`dashboard-stats`) | Data | ❌ | — |
| Star history | `#starHistorySection` | Data | Data | ❌ | — |
| Quick actions bar | knappar överst | UX (alltid tillgängliga) | UX | ❌ | — |
| **Activation aha modal** | `#activationAhaModal` | **D** | **D** | ❌ | A `milestone` (senare) |

### Överlapp att bevaka (konflikt-zoner)

| Fråga | System 1 | System 2 | PR1-beteende |
|-------|----------|----------|--------------|
| “Nästa steg för familjen?” | A coach (ny) | B readiness | **Båda synliga OK** om readiness inte har coach-semantik; **logga** om readiness har “gör X härnäst” |
| “Bjud in medförälder?” | A `INVITE_CO_PARENT` | C `#medforalderCtaBanner` | **C vinner PR1**; logga om A också vill invite |
| “Fira första aktivitet?” | A `milestone` | D `#activationAhaModal` | **D vinner PR1**; senare en celebration authority |
| “Uppmuntra förälder?” | A `uiTokens` | C `encouragementCopy` | **C vinner PR1**; A-coach ska inte duplicera ton |

---

## Conflict protocol (PR1)

När `engine-client` får svar från A, kör **conflict scan** (klient, ingen produktlogik):

```js
// Pseudokod — implementeras i engine-client.js
function detectAuthorityConflicts(engine, domState) {
  const conflicts = [];
  if (domState.readinessVisible && engine.policy.name) {
    conflicts.push('readiness_and_engine_both_visible');
  }
  if (engine.policy.name === 'INVITE_CO_PARENT' && domState.medforalderCtaVisible) {
    conflicts.push('engine_invite_vs_cta_banner');
  }
  if (engine.milestone === 'first_success' && domState.activationAhaVisible) {
    conflicts.push('engine_milestone_vs_activation_aha');
  }
  return conflicts;
}
```

**Vid konflikt:**

1. `analytics.track('engine_authority_conflict', { conflicts, policy, need, coreState })`
2. **Ingen automatisk döljning** i PR1 — mäta först
3. Optional dev-only: `console.info('[Engine authority]', conflicts)`

Detta gör “parallell sanning” **synlig** innan den blir permanent drift.

---

## Init-orkestrering (PR1)

PR1 **ändrar inte** init-ordning. Lägger till fjärde init:

```
DOMContentLoaded #4  engine-client.js → fetch A → render #engineCoachMount only
```

Regel: `engine-client` får **inte** anropa `HomeReadiness.reload()` eller mutera andra mounts.

---

## Mapping: `policy.name` → PR1 UI (A-owned endast)

| `policy.name` | PR1 coach-kort | Får inte samtidigt |
|---------------|----------------|-------------------|
| `SHOW_CHILD` | “Visa barnet” → handoff action | Egen readiness “visa barn” item |
| `ADD_EVENING` | Länk till planning | Kvälls-copy i readiness |
| `INVITE_CO_PARENT` | (visa men **sekundär** tills C avvecklas) | — |
| `SIMPLIFY_ROUTINE` | Länk/schema | — |
| `TRIGGER_CELEBRATION` | (PR1: dev only / milestone hook) | D aha modal |
| `CUSTOMIZE_ROUTINE` | Länk onboarding/anpassa | — |

Voice: `public/js/engine-voice.js` (ny) — **presentation only**, ingen `if (need)`.

---

## Faser efter PR1

| Fas | A auktoritet expanderar | C/B/D minskar |
|-----|-------------------------|---------------|
| PR1 | `#engineCoachMount` only + conflict log | — |
| PR2 | Readiness filtreras (operativ only) | B coach-items bort |
| PR3 | `medforalderCta` av — A invite | C banner |
| PR4 | `encouragementCopy` → A tone | C hub policy |
| PR5 | Aha → `milestone` | D celebration |

---

## Öppna frågor (blockerar PR2, inte PR1)

- [ ] Vilka `/readiness` `type` är operativa vs coach? (`pending_approval` ja; `incomplete_past_days` ?)
- [ ] Ska magic hub encouragement döljas när `#engineCoachMount` synlig?
- [ ] En celebration authority: A `milestone` vs D aha — vem vinner vid `first_success`?

---

## PR1 acceptance (mekanisk)

- [ ] `#engineCoachMount` är enda DOM A får skriva till
- [ ] Ingen ändring i `home-readiness.js`, `dashboard-cta.js`, `activation-program-*`
- [ ] `engine_authority_conflict` loggas när kända överlapp finns
- [ ] Feature flag av → ingen engine mount, ingen beteendeförändring
- [ ] Golden + API-tester gröna
