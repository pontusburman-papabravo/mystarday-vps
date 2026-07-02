# ACT-1 — Cursor tasklist (v1.4)

**Skapad:** 2026-06-24  
**Status:** Arbetsorder — bygg i ordning. **Primära dokument för Cursor** (exekveringsplan = bakgrund).

**Läs:** [`act-1-ai-startschema-spec.md`](./act-1-ai-startschema-spec.md)  
**Bakgrund:** [`aktivering-exekveringsplan.md`](./aktivering-exekveringsplan.md)

**Primär metric:** `activation_rate_48h`  
**P0 Activation Event:** schema sparat + `child_access_completed` + first completion inom 48h

**Checkpoint:** Stopp efter PR 2 — utvärdera innan PR 3/4.

---

## Låsta beslut (v0.3)

| # | Beslut |
|---|--------|
| D1 | OpenAI v1, tunt LLM-lager |
| D2 | Soft gate PIN + 24h follow-up |
| D6 | `config/starter-plan-meta.js` — ingen ny DB-tabell |
| D8 | Huvudtratt: `child_access_completed` (inte `child_profile_created`) |
| D9 | Persisted `FamilyActivationState` per familj |
| D10 | Max 1 rutin, 3–5 aktiviteter default, max 7 detaljerad |
| D3 | Referral v0: spårning + admin, **ingen belöning** (parallellt, ej blockerande) |
| D5 | Auto-sitemap från `SEO_INDEXABLE_PATHS` (parallellt, ~0,5 d) |

---

## PR 1 — Instrumentering, flags, mall-metadata

**Mål:** Kunna mäta funnel och styra rollout innan UI byggs.

### EPIC 1.1 — P0 activation state (source of truth)

- [ ] Migration: `family_activation_state` eller kolumner på `family` (`schema_saved_at`, `child_access_completed_at`, `first_completion_at`, `p0_activated_at`, `p0_activated_within_48h`, `activation_variant`)
- [ ] `src/lib/activation-p0.js`: `updateActivationState()`, `isP0Activated()`, `getActivationFunnelStep()`
- [ ] `activation_achieved_48h` emitteras **server-side** när `p0_activated_at` sätts (inte enbart client)
- [ ] Enhetstest: 48h-fönster, child access utan tidig profile-created i funnel

### EPIC 1.2 — Funnel events

- [ ] Lägg till alla ACT-events i `ALLOWED_CLIENT_EVENTS` (`src/routes/analytics.js`)
- [ ] Server helpers i `src/lib/analytics-tracker.js`: `trackActivationOnboardingEvent(name, familyId, meta)`
- [ ] **Huvudtratt-events:** `activation_onboarding_started`, `starter_template_selected`, `starter_plan_saved`, **`child_access_completed`**, `first_completion_recorded`, `activation_achieved_48h`
- [ ] **Sub-metrics:** `child_profile_created`, `child_pin_created`, `child_view_opened`, `child_handoff_skipped`
- [ ] AI-events (förbered): `starter_plan_generation_started/succeeded/failed`
- [ ] Varje relevant event uppdaterar `FamilyActivationState` där applicerbart

### EPIC 1.3 — Feature flags

- [ ] Migration: seed `feature_flag` eller `features` för `activation_onboarding_v1`, `activation_child_handoff_v1`, `activation_first_star_guide_v1`, `activation_ai_starter_plan`
- [ ] Helper: `isActivationOnboardingEnabled(familyId)` — per familj + cohort-datum
- [ ] Variant assignment: `legacy` | `template_only` | `template_plus_ai` (lagra på familj eller session)

### EPIC 1.4 — Starter plan metadata + storleksgränser

- [ ] Skapa `config/starter-plan-meta.js` — 6–10 paket mappade till `default_schedule`-namn
- [ ] Implementera `selectStarterTemplate(input)` i `src/lib/starter-plan/select-template.js`
- [ ] Enforce: max 1 rutin, default 3–5 aktiviteter, max 7 vid “detaljerad”; trunkera mall om nödvändigt
- [ ] Test: given ageBand + routineType → rätt scheduleName; activity count within limits

**PR 1 klar när:** events loggas i dev; flags läsas; selector returnerar mall utan UI.

---

## PR 2 — A1: Child handoff + first star guide

**Mål:** Öka aktivering utan ny template-UI — baseline före A2.

### EPIC 2.1 — Child handoff i onboarding

- [ ] Ny sektion i onboarding (eller utökning steg 5) bakom `activation_child_handoff_v1`
- [ ] Komponent `ChildAccessStep`: PIN-setup, copy/email login-info, länk till `/child-login`
- [ ] Soft gate: primär “Skapa barnkod”, sekundär “Hoppa över” + `child_handoff_skipped` + konsekvenscopy
- [ ] Vid PIN satt **eller** barnvy öppnad via handoff → emit **`child_access_completed`** + uppdatera `FamilyActivationState`
- [ ] Återanvänd mönster från `dashboard-child-handoff.js` där möjligt

### EPIC 2.2 — First star guide

- [ ] Ny fil `public/js/onboarding-first-star.js` (IIFE, laddas efter onboarding.js)
- [ ] Komponent `FirstStarGuide`: 3 steg (öppna barnvy → markera klar → celebration)
- [ ] Koppla till befintlig completion-flow / `child_first_completion` om möjligt
- [ ] Flag `activation_first_star_guide_v1`

### EPIC 2.3 — Admin funnel (del 1)

- [ ] Ny `GET /api/admin/analytics/activation-funnel` — **9-stegs huvudtratt** (exekveringsplan §6.2)
- [ ] Data från `FamilyActivationState` + analytics_events som backup
- [ ] UI: admin flik “Aktivering” med veckokohort + variant breakdown
- [ ] Sub-metrics expanderbara under steg 5 (child access)

### EPIC 2.4 — Fixa kända gap

- [ ] `skipInvite()` ska inte hoppa över child handoff / first star när flag på
- [ ] Säkerställ `child_view_opened` fires vid barnvy-besök från guide

**PR 2 klar när:** ny familj kan nå first star guide; admin funnel visar 9-stegs baseline; **`child_access_completed`** loggas korrekt.

### CHECKPOINT — stopp här, utvärdera innan PR 3

- [ ] Kör manuellt test: legacy + (om flag) handoff + first star
- [ ] Admin funnel: jämför veckokohort signup → child access → completion
- [ ] Bekräfta att activation state inte divergerar från events
- [ ] **Go/no-go:** handoff läcker inte → godkänn PR 3

---

## PR 3 — A2: Template-first onboarding (utan AI)

**Mål:** Ta bort “tom canvas” — mätbart utan AI-lift.

### EPIC 3.1 — Frågeflöde

- [x] `public/js/onboarding-starter-plan.js` — `StarterPlanQuestionFlow`
- [x] 7 frågor enligt spec (< 90 sek)
- [x] `activation_question_answered` per steg
- [x] Flag `activation_onboarding_v1` — visa nytt flöde istället för/efter steg 1 legacy

### EPIC 3.2 — Preview & save

- [x] `StarterPlanPreview`: lista aktiviteter, edit (namn, ordning, ta bort, lägg till)
- [x] `starter_plan_preview_viewed`, `starter_plan_saved` (server via schedule POST)
- [x] Save via befintlig `POST /api/onboarding/schedule` eller `saveStarterPlan()` wrapper
- [x] `starter_template_selected` med `template_id`

### EPIC 3.3 — Flödesintegration

- [x] Efter save → `ChildAccessStep` (PR 2)
- [x] Efter handoff → `FirstStarGuide` (PR 2)
- [x] Legacy onboarding kvar för kontroll-arm / flag off

### EPIC 3.4 — Kvalitetsmetrics

- [x] Logga `plan_edited_before_save: boolean`, `activity_count` i `starter_plan_saved` metadata

**PR 3 klar när:** Variant A (template + handoff + first star, **utan AI**) kan köras end-to-end.

---

## PR 4 — A3: AI-personalisering

**Mål:** Mät lift ovanpå template-only.

### EPIC 4.1 — generateStarterPlan

- [ ] `src/lib/starter-plan/generate-plan.js`
- [ ] `src/lib/starter-plan/llm.js` — OpenAI, timeout 15s
- [ ] Prompt enligt spec §6
- [ ] **Fallback:** vid fel → `selectStarterTemplate` output oförändrad + barnnamn i copy

### EPIC 4.2 — Integration i preview

- [ ] Efter frågor: om `activation_ai_starter_plan` → anropa generate; annars ren mall
- [ ] Loading state i preview (max 15s, sedan fallback)
- [ ] `used_ai: true/false` i events

### EPIC 4.3 — Guardrails & ops

- [ ] Logga AI-fel med orsakskod
- [ ] Ingen PII i prompts utöver barnnamn + användarsvar
- [ ] Flag avstänger AI utan deploy

**PR 4 klar när:** Variant B (template + AI + handoff + first star) live; A/B mätbart.

---

## PR 5 — Nudges, experiment, polish

**Mål:** Fånga familjer som inte når P0; full experimentloop.

### EPIC 5.1 — Non-activated nudges

- [ ] Mejl/push 24–48h efter signup om inte `activation_achieved_48h`
- [ ] Copy: “Ditt schema väntar — ge första stjärnan på 2 min” (skilj från win-back för tidigare aktiva)
- [ ] Respektera `notification_preference` / `EMAIL_ENABLED`

### EPIC 5.2 — Experiment

- [ ] Kohort-tilldelning dokumenterad i admin
- [ ] Jämför `activation_rate_48h` per variant veckovis
- [ ] Go/no-go: AI endast om Variant B slår A med ≥5 pp absolut

### EPIC 5.3 — Aktiveringsprogram (D7)

- [ ] Utvärdera auto-enroll treatment för nya familjer efter A1 (ersätt opt-in gap)
- [ ] Verifiera `ACTIVATION_PROGRAM_ENABLED` + `ACTIVATION_PROGRAM_LAUNCH_AT` på prod

### EPIC 5.4 — Admin & docs

- [ ] Full activation funnel-dashboard
- [ ] Uppdatera `CLAUDE.md` changelog vid deploy
- [ ] SW bump om frontend-ändringar

**PR 5 klar när:** veckorapport kan svara på de tre veckofrågorna i exekveringsplanen.

---

## Checklista före merge till main (varje PR)

- [ ] `npm run lint` (0 nya errors)
- [ ] Relevanta tester (`test/activation-program*.test.js`, ny `test/activation-p0.test.js`)
- [ ] Feature flag default **off** eller endast dev-familjer
- [ ] Ingen regression i befintlig onboarding utan flag
- [ ] `docs/route-inventory-pre-split.md` om nya routes

---

## Parallellt med ACT-1 (ej PR-blockerande)

Kör när PR 1–2 är igång eller mellan PR — **blockera inte** activation-spåret.

### VIR-1 v0 — Referral-spårning (~2 d)

- [ ] Migration `referral_code` + `referral` (se [`referral-program.md`](./referral-program.md) §0)
- [ ] `?ref=` i register + `localStorage` persistence
- [ ] Personlig kod i `dashboard-cta.js` + `referral_link_shared` event
- [ ] Kvalificering → `qualified` (ingen belöning)
- [ ] `GET /api/admin/referrals` + admin-lista

### SEO-5 — Auto-sitemap (~0,5 d)

- [ ] `GET /sitemap.xml` genererad från `SEO_INDEXABLE_PATHS` i `src/lib/seo-pages.js`
- [ ] Test: nya SEO-sidor i allowlist syns automatiskt; `/login` m.fl. exkluderade
- [ ] Behåll `public/sitemap.xml` som fallback eller ta bort efter route live

---

## Efter ACT-1 — FEAT-1 Boendeschema (P1)

**Spec:** [`boendeschema-spec.md`](./boendeschema-spec.md) (BC-1 … BC-13) · **ADR:** [`boendeschema-adr.md`](./boendeschema-adr.md) · **Plan:** [`boendeschema-implementationsplan.md`](./boendeschema-implementationsplan.md)

**Ordning:** Spec + ADR mergad → Phase 2 migration → Phase 3 engine → Phase 4 konsumenter → Phase 5 cleanup.

- [x] Phase 1: domänspec, ADR, implementationsplan
- [ ] Phase 2: `pattern_type` + `configuration`; backfill `alternate_weeks`; `icon` på hem
- [ ] Phase 3: `custody-schedule-engine.js` (`alternate_weeks` + `alternate_weekends`)
- [ ] Phase 4: migrera API, schedulers, UI till engine; banner “nästa byte”
- [ ] Phase 5: `custody_home_id` primärt; `week_variant` legacy; hemnamn i UI (ej A/B)
- [ ] (Separat) Print/PDF: konsumera `activeHome` / `isParentDay` via custody API — ej FEAT-1

---

```
Bygg ACT-1 enligt docs/act-1-cursor-tasklist.md — starta med PR 1.

Primär metric: activation_rate_48h
P0 event: schema + barnprofil/PIN + first completion inom 48h

Constraints:
- template-first; AI endast PR 4
- AI får aldrig blockera onboarding
- bygg A1 (handoff+first star) före A2 (template UI)
- allt bakom feature flags

Spec: docs/act-1-ai-startschema-spec.md
```

---

## Dokumenthistorik

| Datum | Version | Ändring |
|-------|---------|---------|
| 2026-06-24 | 1.0 | Första tasklist — 5 PR |
| 2026-06-24 | 1.1 | `child_access_completed`, activation state, 9-stegs funnel, PR2 checkpoint, D8–D10 |
| 2026-06-24 | 1.2 | D3 referral v0 + D5 auto-sitemap som parallella tasks |
| 2026-06-24 | 1.3 | FEAT-1 boendeschema — post-ACT-1 tasklista |
| 2026-06-24 | 1.4 | FEAT-1: hela scope (BC-1–11) i en release |
| 2026-07-01 | 1.5 | FEAT-1: domänspec + ADR + Phase 1–5 implementationsplan |
| 2026-07-01 | 1.6 | FEAT-1: utskrift/PDF utanför scope; BC-13 = domänexponering |
