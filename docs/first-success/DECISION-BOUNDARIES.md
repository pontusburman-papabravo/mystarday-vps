# Decision boundary map (per screen)

> **Syfte:** Låsa *en* besluts-entrypoint per skärm — innan kod tas bort.  
> Verifierad mot repo; öppna punkter markerade ⚠️.

Relaterat: [MIGRATION-MAP.md](MIGRATION-MAP.md) (runtime-kedjor), [ENGINE_SPEC.md](ENGINE_SPEC.md) (mål).

---

## Tre parallella beslutssystem (idag)

| # | System | Var | Ansvar |
|---|--------|-----|--------|
| **A** | Product Engine | `GET /api/family/first-success` | Nästa steg mot First Success |
| **B** | Readiness / server items | `GET /api/family/readiness` + `core.js` | Operativa “attention items” + copy |
| **C** | Frontend implicit policy | `if` i hub, CTA, coach, celebrations | Lokala trösklar (stars, parent_count, …) |
| **D** | Activation experiment | `/api/me/activation-program/*` | 7-dagarsprogram, A/B, reflection — **ej Engine** |

Migration = minska **B + C** för coach/activation; isolera **D**; gör **A** till sanning för “vad nu?”.

---

## Skärm för skärm

### 1. Hem (`/dashboard`)

#### Init idag (konflikt)

```
DOMContentLoaded #1  dashboard.js     → authGuard → initDashboard → banners/CTA/handoff
DOMContentLoaded #2  home-readiness.js → load() → /readiness
DOMContentLoaded #3  activation-program-* → /activation-program
```

**Två (egentligen tre) init-sanningar på samma skärm.**

#### Beslut idag — vem bestämmer vad?

| Fråga | System | Entrypoint |
|-------|--------|------------|
| “Vilket kort ska föräldern se som nästa steg?” | **B** (+ copy i server) | `home-readiness.js` → `/readiness` |
| “Ska medförälder-CTA visas?” | **C** | `dashboard-cta.js` + `dashboard-home-hub.js` |
| “Vilket uppmuntringsmeddelande i magic hub?” | **C** | `dashboard-home-hub.js` `encouragementCopy()` |
| “Ska 7-dagars activation-banner visas?” | **D** | `activation-program-banner.js` |
| “Ska aha-modal efter completion?” | **D** | `activation-program-aha-card.js` |
| “Visa barnet loggar in?” | UX (ej policy) | `dashboard-child-handoff.js` — **action** från Engine senare |

#### Mål: single decision flow (coach)

```
GET /api/family/first-success  →  engine-coach.js  →  #engineCoachMount (ett kort)
```

**Tillåtet parallellt (tillsvidare):**

- `/readiness` endast för **operativa** items (pending approval, invites) — inte “nästa steg”
- **D** experiment banners — egen flag, egen API
- Handoff = UX som **utför** `policy.name === SHOW_CHILD` (ingen egen gate)

**Ej tillåtet efter migration:**

- `encouragementCopy()` som policy
- Duplicerad `parent_count` gate i hub + cta för samma CTA

#### Nästa PR-gräns (Hem)

| Inkludera | Exkludera |
|-----------|-----------|
| `engine-client.js` fetch | Ersätta readiness |
| Ett overlay-kort (`#engineCoachMount`) | `auth.js` |
| Flag `first_success_engine_api` | Activation-program |
| | `dashboard.js` init-ordning |

---

### 2. Onboarding (`/onboarding`)

#### Beslut idag

| Fråga | System | Entrypoint |
|-------|--------|------------|
| “Får användaren ens hit?” | **Infrastruktur** | `auth.js` `redirectIncompleteOnboarding` (`onboarding_completed`) |
| “ACT-1 eller legacy wizard?” | **D** (flag) | `onboarding-starter-plan.js` → `/activation-config` |
| “Vilket steg i wizarden?” | **C** (orchestration) | `onboarding.js` `goToStep(n)` |
| “Handoff + first star guide?” | **D** (flag) | `onboarding-activation.js` |

#### Mål (senare — inte PR 1)

```
Registrering (server) → rutin finns → onboarding_completed=true ELLER skip
Engine state ROUTINE_READY → coach SHOW_CHILD (på Hem, inte wizard)
```

**auth.js:** ⚠️ **Oklart än** hur mycket Engine ska styra redirect vs `onboarding_completed` DB-fält. Trolig modell:

- **Infrastruktur:** JWT/`onboarding_completed` = “får lämna register-flöde”
- **Produkt:** Engine = “vad ska familjen göra nu”

Dessa får inte blandas i samma if-sats.

#### PR-gräns

**Ingen** onboarding- eller auth-ändring i engine-client PR.

---

### 3. Barnvy (`/child-dashboard`, `/child/today`)

#### Beslut idag

| Fråga | System | Entrypoint |
|-------|--------|------------|
| “Vad är NU/NÄSTA?” | Data (API) | `child-dashboard.js` / `daily-log` — **korrekt, inte policy** |
| “Confetti vid X% klart?” | **C** | `child-dashboard-celebrations.js` `checkMilestones(total, completed)` |
| “Coach efter aktivitet?” | **C** (copy) | `child-today-coach.js` `peekNextActivity()` |

#### Mål

- Rutin-rendering: **oförändrad** (data-driven)
- First Success celebration: **A** `milestone` från Engine (förälder) eller server event — ⚠️ barnvy kan behöva eget API eller SSE
- Barn-coach: presentation only; inga tröskel-if för “nästa steg”

#### PR-gräns

**Uteslutet** från första engine-client PR.

---

### 4. Planering (`/planning`)

#### Beslut idag

- Navigation hub (`planning-hub.js`) — länkar + package access
- **Ingen** readiness/Engine-koppling hittad ✅

#### Mål

- `policy.name === ADD_EVENING` → deep link hit (voice `route`)
- Inga nya beslut i klienten

#### PR-gräns

Endast ev. `?focus=evening` från coach-länk — senare.

---

### 5. Push (server → native)

#### Beslut idag

| System | Entrypoint |
|--------|------------|
| **B/C server** | `push-reminder-scheduler.js`, `activation-nudge-scheduler.js` — egna regler |

#### Mål

```
Engine.evaluate → policy + validityWindow → push adapter → payload
```

Native: visa payload. **Ingen produktlogik** (redan sant via Capacitor).

#### PR-gräns

**Uteslutet** — allowlist i shadow-guard tills migrerat.

---

### 6. Activation experiment (tvärgående)

**Eget system D** — inte “fel logik” att ta bort i Engine-PR.

| Komponent | API | Relation till Engine |
|-----------|-----|-------------------|
| Banner | `/api/me/activation-program` | Parallell; avvecklas på produktbeslut |
| Aha card | `new-completions` | Överlappar `milestone` — slå ihop **senare** |
| Enroll choice | `enroll-choice` | Efter onboarding — ej Engine PR1 |

**Regel:** Blanda inte experiment-flaggar in i `policySet` utan explicit mapping-tabell.

---

## Sammanfattning: en sanning per concern

| Concern | Framtida entrypoint | Idag | PR1 |
|---------|---------------------|------|-----|
| Förälder “vad nu?” (coach) | **A** `/first-success` | B + C | ✅ overlay only |
| Operativt “kräver åtgärd” | B `/readiness` (narrowed) | B | ❌ oförändrat |
| Onboarding gate | Infrastruktur + DB-fält | auth.js | ❌ |
| 7-dagars program | **D** experiment API | D | ❌ |
| Barn celebration | A eller server event | C | ❌ |
| Push innehåll | A → server adapter | scheduler | ❌ |

---

## Designlås (innan borttagning av kod)

För **Hem** gäller efter PR1+rollout:

1. **Coach-frågan** (`vad ska jag göra nu?`) → endast **A**
2. **Readiness** → endast operativa items (approve, invite) — inte duplicera coach
3. **Ingen ny `if (parent_count|stars|streak)`** för CTAs i `public/js/`
4. **Experiment D** → egna flags; aldrig i Engine evaluate

---

## Öppna punkter ⚠️

- [ ] Exakt lista: vilka `/readiness` item-typer överlever som operativa?
- [ ] `onboarding_completed` vs Engine `coreState` — vem vinner vid konflikt?
- [ ] Barnvy: hur får child celebration `milestone` utan dubbel logik?
- [ ] `parent-magic-router` lazy load vs dubbel `ActivationProgramBanner.init()` (rad 436 + 538 i dashboard.js)

---

## Rekommenderad PR1 (oförändrad, tight)

```
engine-client.js
engine-coach.js
#engineCoachMount på dashboard.html
feature flag
INGA: auth, onboarding, readiness removal, activation-program
```

Detta etablerar **A** som observerbar sanning utan att röra **B, C, D** eller infrastruktur.
