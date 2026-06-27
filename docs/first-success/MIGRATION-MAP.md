# First Success — migrationskarta (verifierad)

> Baserad på faktiska entrypoints och anrop i repo — inte antagen fillista.  
> Uppdatera när nya kedjor hittas.

Se [ENGINE_SPEC.md](ENGINE_SPEC.md) för målarkitektur.

---

## 1. Hem (dashboard) — execution graph

```
dashboard.html
  ├─ auth.js (authGuard på DOMContentLoaded)
  ├─ dashboard.js (initDashboard)
  │    ├─ loadChildren / loadDashboardCards / loadStarHistory
  │    ├─ ActivationProgramBanner.init()     ← separat experiment (API: /api/me/activation-program)
  │    ├─ showMedforalderCtaIfEligible()     ← dashboard-cta.js (parent_count + feature flag)
  │    ├─ initDelaAppenCta()                 ← dashboard-cta.js
  │    └─ DashboardChildHandoff.init()       ← UX/navigation, ej produktbeslut
  ├─ home-readiness.js (egen DOMContentLoaded → load)
  │    └─ GET /api/family/readiness          ← **ersätts av Engine coach**
  ├─ activation-program-aha-card.js          ← poll /api/me/activation-program/new-completions
  ├─ activation-program-banner.js           ← poll /api/me/activation-program
  └─ dashboard-home-hub.js (via magic view)
       ├─ encouragementCopy()               ← **dold produktlogik** (stars>=5, allDone)
       └─ medförälder inline CTA             ← duplicerar dashboard-cta logik
```

**Entrypoint:** `public/dashboard.html` → `dashboard.js` rad ~289 `DOMContentLoaded` + `home-readiness.js` rad ~111 parallellt.

**Readiness-kedja (verifierad):**

```
home-readiness.js:load()
  → apiFetch('/api/family/readiness')
  → src/routes/family/core.js GET /readiness
  → server bygger items[] (pending_invite, pending_approval, incomplete_past_days, …)
  → klient renderar kort med href + title/sub (copy i backend-route)
```

Detta är **inte** samma som Engine — readiness är operativ “vad behöver uppmärksamhet idag”, Engine är “vad är nästa steg mot First Success”. Parallell körning är medveten i fas 1.

---

## 2. Onboarding — trigger chain

```
Registrering / login
  ├─ register.js sätter onboarding_completed = false
  ├─ auth.js redirectAfterLogin()
  │    └─ onboarding_completed === false → /onboarding
  ├─ auth.js requireAuth() / authGuard()
  │    └─ redirectIncompleteOnboarding() → /onboarding
  │         (undantag: /onboarding, /login, /register, /child/*)
  └─ onboarding.html
       ├─ onboarding.js DOMContentLoaded
       │    ├─ auth check → /login eller /dashboard om redan klar
       │    ├─ OnboardingStarterPlan.init()  ← flag activation_onboarding_v1
       │    │    └─ /api/family/activation-config
       │    │    └─ om aktiv: döljer step1, visar ACT-1 wizard
       │    └─ annars goToStep(1) legacy wizard
       ├─ onboarding-starter-plan.js
       ├─ onboarding-activation.js (handoff + first star guide, flag-gated)
       └─ activation-program-enroll-choice.js (efter complete)
```

**Viktigt:** `auth.js` / `redirectIncompleteOnboarding` är **routing-infrastruktur**, inte produktbeslut. Ska **refaktoreras** (ny trigger: Engine state eller `onboarding_completed` + flag), inte raderas.

---

## 3. Klassificering per fil

| Fil | Typ | Åtgärd | Verifierad? |
|-----|-----|--------|-------------|
| `home-readiness.js` | Decision + presentation | Ersätt coach-delen; ev. behåll “varningar” separat | ✅ anropar /readiness |
| `family/core.js` `/readiness` | Server decision | Gradvis avveckla eller begränsa till operativa items | ✅ |
| `onboarding.js` | Orchestration | Bypass vid dag 0; behåll add-child | ✅ DOMContentLoaded |
| `onboarding-starter-plan.js` | Orchestration | Flytta till “Anpassa”; flag | ✅ activation-config |
| `onboarding-activation.js` | Orchestration | Koppla till Engine `SHOW_CHILD` / handoff | ✅ |
| `activation-program-banner.js` | Experiment / content | **Behåll** tills ACT-program avvecklas; inte samma som Engine | ✅ egen API |
| `activation-program-aha-card.js` | Celebration UI | Koppla om till `milestone` från Engine | ✅ |
| `activation-program-enroll-choice.js` | Post-onboarding experiment | Behåll / koppla om senare | ✅ |
| `auth.js` (redirectIncompleteOnboarding) | Auth + routing guard | **Refaktorera** trigger, inte radera | ✅ |
| `session-gate.js` | Device routing | **Ligga kvar** | ⚠️ ej djupgranskad |
| `dashboard-cta.js` | Decision (parent_count) | Engine `INVITE_CO_PARENT` tar över coach; CTA kan finnas kvar | ✅ |
| `dashboard-child-handoff.js` | UX / navigation | **Ligga kvar** — handoff action från Engine | ✅ |
| `dashboard-home-hub.js` encouragementCopy | **Dold decision logic** | Flytta ton/copy till voice; trigger från Engine eller stats | ✅ rad 142–154 |
| `dashboard-tour.js` | Onboarding UX | Koppla till `NEEDS_CLARITY` senare | ⚠️ |
| `child-dashboard-celebrations.js` | Presentation | **Ligga kvar** — triggas av `milestone` | ⚠️ ej traced här |

---

## 4. Implicit logik (riskytor)

Dessa fattar **lokala produktbeslut** utan Engine:

| Plats | Vad den gör |
|-------|-------------|
| `dashboard-home-hub.js` `encouragementCopy()` | Väljer budskap efter stars/allDone |
| `dashboard-cta.js` | `parent_count < 2` → visa medförälder-banner |
| `dashboard-home-hub.js` | Duplicerad medförälder-gate |
| `family/core.js` `/readiness` | Prioritet + copy för action items |
| `onboarding-starter-plan.js` | ACT-1 flöde vs legacy step1 |

**Capacitor-native:** Inga separata Swift/Kotlin-beslut hittade — allt ovan gäller webview.

---

## 5. Säker migrationsordning

```
Fas A — observera (ingen prod-risk)
  engine-client.js hämtar /first-success, loggar till console bakom flag

Fas B — parallell coach
  engine-coach.js renderar ETT kort på Hem
  readiness + activation banners kvar

Fas C — routing
  auth redirect: dag 0 familjer skippar /onboarding (backend flag + JWT-fält)

Fas D — avveckling
  home-readiness (coach-del), encouragementCopy, duplicerade CTAs

Fas E — server
  push/nudge schedulers → Engine (allowlist tas bort)
```

---

## 6. Nästa PR (engine-client) — scope

**Gör:**

- `public/js/engine-client.js` — fetch + cache
- `public/js/engine-coach.js` — policy.name → voice → ett DOM-kort
- Mount på `#homeReadinessMount` eller ny `#engineCoachMount` **parallellt**
- Feature flag: `first_success_engine_api` (redan på backend)

**Gör inte i samma PR:**

- Röra `auth.js` redirect
- Ta bort readiness
- Onboarding-bypass

---

## 7. Öppna frågor (kräver mer tracing)

- [ ] `session-gate.js` full kedja vid child device mode
- [ ] `parent-magic-router.js` lazy-load vs dashboard init
- [ ] Vilka readiness-typer som måste överleva som operativa (pending_approval ≠ coach)
- [ ] `dashboard-tour.js` trigger
