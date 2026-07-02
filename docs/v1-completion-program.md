# v1 Completion Program

**Status:** Operativ styrplan (Våg 0)  
**Mål:** Stäng påbörjat arbete — sammanhängande **v1-release**, inte nya stora features.  
**Skapad:** 2026-07-02  
**Ägare:** Agent 8 (program) → Agent 7 (release gate)

---

## Syfte

Efter senaste 24h-sprinten finns fungerande kod i flera spår (~45–90 % per spår), men ingen enhetlig **v1-complete**-markering. Detta program organiserar **åtta parallella avslut** med tydligt ägarskap, fil-låsning och gate-regler.

**När v1 är klar** kan nästa fas fokusera på FEAT-1B/1C, AI-onboarding och ny produkt — inte på att städa halvfärdigt.

---

## Nuvarande läge (källsanning: `main`, 2026-07-02)

| Spår | Uppskattning | Källa |
|------|-------------|--------|
| FEAT-1 v1 (boendeschema) | **Closed** | Phase 5 mergad (#498) |
| Parent Hubs 10/10 | **Complete** | Hub sweep v2 (#499) |
| För dig (Sprint 1–5) | ~70 % | Sprint 3–5 delvis — Agent 3 Våg 2 |
| Child Worlds 10/10 | **Complete (v1)** | Idag + Skatt shipped; Mina personer V0 (#502) |
| Illustrationer | **Complete** | Registry + garden + decals (#501) |
| First Star / ACT-1 v1 | **v1 kod klar** | Handoff mergad (#500); flags OFF |
| QA / Release | **RC** | `docs/qa/v1-release-candidate.md` |
| Dokumentation | **Complete** | `docs/v1-release-notes.md`, handoff |

---

## Agentöversikt

| Agent | Namn | Våg | Start | Leverans |
|-------|------|-----|-------|----------|
| **8** | Documentation (program) | **0** | **Först** | `v1-completion-program.md` + agent-promptar |
| **1** | FEAT-1 Completion | 1 | Direkt efter 8 | FEAT-1 Closed |
| **2** | Parent Hub Finalization | 1 | Parallellt | Parent Hubs Complete |
| **4** | Child Worlds Completion | 1 | Efter/med 6 | Child Worlds Complete |
| **5** | First Star Completion | 1 | Parallellt | ACT-1 Complete (v1) |
| **6** | Illustration & Assets | 1.5 | Före/med 4 | Assets Complete |
| **3** | För dig Completion | **2** | **Efter 1 + 5 stabila** | För dig v1 Complete |
| **7** | QA & Release | **1→3** | **Efter första PR** | Release Candidate |
| **8** | Documentation (final) | 3 | Efter Agent 7 | Documentation Complete |

**Kopiera agent-uppdrag:** `docs/agents/v1-agent-{N}-*.md`

---

## Rekommenderad startordning (idag)

```
1. Agent 8  → skapar program + DoD-index (denna fil + prompts)
2. Agent 1  → FEAT-1 Phase 5 (mest blockerande)
3. Agent 2  → Parent hubs QA (låg kodrisk)
4. Agent 5  → First Star onboarding (monopol på onboarding.js)
5. Agent 6  → Assets (före Agent 4 wiring)
6. Agent 7  → Gate efter varje agent-PR (inte sist)
── vänta ──
7. Agent 3  → För dig (efter FEAT-1 + First Star stabila)
8. Agent 4  → Child worlds (efter Agent 6 assets)
9. Agent 8  → Final docs + release notes
```

---

## Out of scope (v1 frozen)

Följande ** ingår inte** i v1 Completion Program. Nya ADR krävs om scope ändras.

| Item | Varför utanför |
|------|----------------|
| **FEAT-1B** (`custom` boendemönster) | Spec v0.3 klar — separat feature efter v1 |
| **FEAT-1C** (`custody_override`) | Pipeline-stub; produkt ej definierad för v1 |
| **AI starter plan** (`activation_ai_starter_plan`) | ACT-1 PR 4+ |
| **Print/PDF custody** (`print-schema-core.js`) | Explicit utanför FEAT-1 (BC-13) |
| **För dig Sprint 4 nav-flytt** utan metrics/flag | Metrics-gated i `for-dig-spec.md` §9 — defer eller feature flag |
| **Ny fjärde coach / global paywall** | POS forbidden utan ADR |
| **Syskon-leaderboards, star IAP** | POS forbidden |

---

## Fil-låsningsmatris

Vid parallell körning — **en primär ägare per fil**. Andra agenter: öppna PR mot ägaren eller vänta.

| Fil / område | Primär ägare | Andra får |
|--------------|--------------|-----------|
| `migrations/*custody*`, `src/lib/custody-*`, `db/custody.js` | Agent 1 | Läsa |
| `public/js/schedule-custody.js`, `src/routes/schedules/child-crud.js` | Agent 1 | — |
| `public/js/custody-*.js`, `dashboard-custody.js` | Agent 1 | Agent 2 (copy only) |
| `public/js/dashboard-home-hub.js`, `planning-hub.js`, `rewards-hub.js`, `family-hub.js` | Agent 2 | — |
| `public/js/for-dig.js`, `src/lib/for-dig-*`, `src/routes/for-dig.js` | Agent 3 | — |
| `public/js/nav-config.js` | Agent 3 | **Låst tills v1 wave 2** |
| `public/js/onboarding.js`, `public/js/onboarding-*.js` | Agent 5 | — |
| `public/js/child-first-star-mode.js`, `child-worlds-nav.js` | Agent 5 (gate), Agent 4 (post-gate polish) | Koordinera |
| `public/js/child-today-focus.js`, `child-morgonhus.js`, `child-garden.js` | Agent 4 | Agent 6 (assets only) |
| `public/images/child/**`, `docs/child-image-assets.md` | Agent 6 | Agent 4 (wiring) |
| `public/sw.js`, `config/cache-version.json` | Se **SW-regel** nedan | — |
| `docs/boendeschema-*.md`, `docs/*-vision.md` | Agent 8 (final) | Mini-updates per agent-PR |
| `test/custody-*.test.js` | Agent 1 | Agent 7 |
| `test/*-hub-10-10.test.js`, `test/hem-10-vision.test.js` | Agent 2 | Agent 7 |

### SW / cache-version ownership

**Regel:** Max **en SW-bump per mergad agent-PR** i v1-programmet.

| Våg | SW-bump-ägare |
|-----|----------------|
| Våg 1 | Agent 1 → Agent 5 → Agent 6 → Agent 2 (endast om assets ändrats) |
| Våg 2 | Agent 3 → Agent 4 |
| Våg 3 | Agent 7 (release candidate manifest) |

**Undantag:** Två agenter ändrar statiska assets samma dag → koordinera i **en** PR eller låt Agent 7 göra final bump.

**Krav:** `config/cache-version.json` och `public/sw.js` `CACHE_NAME` måste matcha. Kör `npm run check:css` vid Tailwind-ändringar.

---

## PR-sekvens per agent

### Agent 1 — FEAT-1 (4 PR)

1. `feat(custody): Phase 5 custody_home_id write + backfill migration`
2. `feat(custody): analytics gaps (created, filter) + verify allowlist`
3. `test(custody): integration QA matrix (weekends, DST, timezone)`
4. `chore(custody): remove week_variant UI write paths + DoD + ADR`

### Agent 2 — Parent Hubs (2 PR)

1. `docs(qa): hub-integration-sweep v2 + Jenny screenshots`
2. `fix(hubs): a11y/copy polish from sweep findings`

### Agent 3 — För dig (4 PR, Våg 2)

1. `feat(for-dig): Sprint 3 personalisering (rekommenderat, installerad-badge)`
2. `feat(for-dig): admin goal editor`
3. `feat(for-dig): Sprint 5 favoriter CRUD + popularitet`
4. `feat(for-dig): outcome instrumentation` (+ ev. Sprint 4 nav **endast med flag/metrics-ADR**)

### Agent 4 — Child Worlds (3 PR)

1. `feat(child): Idag decals + empty/celebration states`
2. `feat(child): Morgonhus garden wiring (efter Agent 6)`
3. `docs(child): Mina personer vision stub + markera Idag/Skatt shipped`

### Agent 5 — First Star (3 PR)

1. `feat(activation): child handoff onboarding step`
2. `feat(activation): onboarding-first-star guide`
3. `chore(activation): rollout docs + flag migration gaps` (flag förblir OFF)

### Agent 6 — Assets (2 PR)

1. `feat(assets): garden scene + decal binaries to canonical paths`
2. `chore(assets): registry sync + manifest + SW precache`

### Agent 7 — QA (löpande + 1 final)

- Efter **varje** agent-PR: `npm run test:gate`
- Milestone-PR: `docs(qa): v1 release candidate checklist`

### Agent 8 — Documentation (2 PR)

1. **Våg 0:** Denna fil + `docs/agents/*.md` (docs only)
2. **Våg 3:** ADR/spec DoD avbockad + `docs/v1-release-notes.md`

---

## Definition of Done per agent

### Agent 1 — FEAT-1 Closed

- [ ] `weekly_schedule.custody_home_id` skrivs vid schema-sparning (Phase 5)
- [ ] Backfill-migration för befintliga `week_variant`-rader
- [ ] UI visar **hemnamn**, inte A/B, i dashboard + schedule + settings
- [ ] Inga `week_variant`-**skrivningar** i UI (legacy read fallback dokumenterad)
- [ ] Analytics: `custody_schedule_created`, `custody_filter_changed` (eller mappat till `custody_view_filtered` med ADR) i allowlist + emit
- [ ] `custody_schedule_updated` verifierad (finns redan)
- [ ] Integrationstester: alternate_weekends, alternate_weeks, DST, timezone
- [ ] `boendeschema-spec.md` §Definition of Done avbockad
- [ ] `npm run test:gate` grön
- [ ] Agent 7 sign-off på custody regression

### Agent 2 — Parent Hubs Complete

- [ ] Jenny-test dokumenterat per hub (screenshot i `docs/qa/`)
- [ ] `docs/qa/hub-integration-sweep.md` uppdaterad (v2, post-merge)
- [ ] `parent-hub-acceptance-checklist.md` ifylld per hub i PR
- [ ] Inga öppna C5/C6-punkter från sweep (Belöningar route, Familj barnkort)
- [ ] `test:gate` grön (`hem-10-vision`, `planning-hub-10-10`, `rewards-hub-10-10`, `family-hub-10-10`)
- [ ] Agent 7 sign-off på parent smoke

### Agent 3 — För dig v1 Complete

- [ ] Sprint 3: smart rekommendation, redan-aktiverad, outcome banners
- [ ] Admin: målhantering enligt `for-dig-spec.md` §19.5
- [ ] Sprint 5: favorit-CRUD + populär-sortering med trösklar
- [ ] Sprint 4: **antingen** implementerad med flag **eller** explicit defer i ADR
- [ ] `npm run test:gate` grön (`for-dig-*.test.js`)
- [ ] Agent 7 sign-off

### Agent 4 — Child Worlds Complete

- [ ] Idag: decals kopplade, empty + celebration ≤2s
- [ ] `child-worlds-index.md`: Idag + Skattkammaren → **Shipped**
- [ ] Morgonhus: garden asset wired (beroende Agent 6)
- [ ] Mina personer: vision + minimum UI (hall + tom-state)
- [ ] Olle-test dokumenterat för Idag
- [ ] Agent 7 sign-off på child smoke

### Agent 5 — ACT-1 Complete (v1)

- [ ] `activation_child_handoff_v1`: onboarding-steg + migration om saknas
- [ ] `onboarding-first-star.js` eller ADR att First Star endast i barnvy
- [ ] Cohort/funnel events i allowlist enligt `act-1-cursor-tasklist.md` PR 2
- [ ] **Ingen** prod rollout utan Agent 7 godkännande
- [ ] `npm run test:gate` grön (`first-star-mode*.test.js`, `activation-funnel`)
- [ ] Rollout-runbook i `docs/first-success/` eller PR-beskrivning

### Agent 6 — Assets Complete

- [ ] `docs/child-image-assets.md`: inga `saknas` utan defer-notering
- [ ] `public/images/child/manifest.json` synkad
- [ ] Garden + decals committade till kanoniska sökvägar
- [ ] SW precache uppdaterad (en bump, koordinera med Agent 1/4)
- [ ] `test/child-art-assets.test.js` grön

### Agent 7 — Release Candidate

- [ ] `npm run test:gate` grön efter varje v1-agent-PR
- [ ] Constitution test (POS 15 §A) på: Hem, child completion, onboarding, rewards, custody banner
- [ ] WCAG spot-check: kontrast, 44pt barnmål, reduced motion
- [ ] Lighthouse på magic Hem (baseline noterad)
- [ ] Deploy checklist + changelog draft
- [ ] **BLOCK** merge av ACT-1 rollout-PR om custody eller onboarding regression

### Agent 8 — Documentation Complete

- [ ] Alla agent-DoD speglade i specs (checkboxar uppdaterade)
- [ ] ADR-versioner bumpade där beslut låsts
- [ ] `docs/v1-release-notes.md` skapad
- [ ] Architecture index / handoff för nästa fas
- [ ] Inga stale TODO i v1-scope docs

---

## Agent 7 gate-regler

Agent 7 **bygger ingen produktkod** (utom ev. test/fixtures för QA).

### Obligatorisk körning

Efter varje agent-PR som rör `src/`, `public/`, `migrations/`, eller `test/`:

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
# test:gate — full env prefix in root AGENTS.md and .cursor/rules/130-testing.mdc
npm run test:gate
```

### Block-veto (STOP merge)

| Villkor | Agent |
|---------|-------|
| `test:gate` röd | 7 |
| Custody regression (banner, schedule resolve, handoff) | 7 → eskalera till Agent 1 |
| Onboarding broken path (skip handoff, multi-child) | 7 → eskalera till Agent 5 |
| POS-brott (C-01, PA-01, G-01) | 7 |
| SW version mismatch (`cache-version.json` ≠ `sw.js`) | 7 |
| ACT-1 flags ON i prod utan sign-off | 7 |

### Godkännande-format (i PR)

```
Agent 7: ✓ test:gate
Agent 7: ✓ smoke [parent|child|custody|onboarding]
Agent 7: ✓ release [blocked|ready]
```

---

## ACT-1 rollout-regler

**Prod-default:** `activation_first_star_mode_v1` = **OFF** (migration `1809170000000`).

### Före rollout

1. Agent 5 PR 1–2 mergade + grön gate
2. Agent 7 manuell QA: första familjen, flera barn, avbruten/återupptagen onboarding
3. Skriftlig go i PR eller `docs/first-success/OPERATIONAL-TRUTH.md`

### Rollout-steg (rekommenderat)

| Steg | Åtgärd |
|------|--------|
| 1 | Intern dogfood-familjer via admin feature_flag |
| 2 | `scripts/enable-act1-flags.js` på staging — **inte** full lista på prod utan L1-beslut |
| 3 | Mät `activation-funnel` 6-steg i admin 48h |
| 4 | Gradvis prod: `activation_first_star_mode_v1` först, sedan handoff |

### Flaggor i `enable-act1-flags.js`

```
activation_onboarding_v1
activation_child_handoff_v1
activation_first_star_guide_v1
activation_first_star_mode_v1
activation_ai_starter_plan      ← v1: lämna OFF om ej implementerad
activation_nudge_v1
referral_program
```

**OBS:** Alla flaggor måste finnas i DB (`npm run migrate`) innan script körs.

---

## DoD-index (snabbreferens)

| Dokument | Agent som stänger |
|----------|-------------------|
| `docs/boendeschema-spec.md` §DoD | Agent 1 |
| `docs/parent-hubs-index.md` + `qa/hub-integration-sweep.md` | Agent 2 |
| `docs/for-dig-spec.md` Sprint 3–5 | Agent 3 |
| `docs/child-worlds-index.md` | Agent 4 |
| `docs/act-1-cursor-tasklist.md` PR 2 | Agent 5 |
| `docs/child-image-assets.md` | Agent 6 |
| `docs/15` constitution + `190-definition-of-done.mdc` | Agent 7 |
| ADR + release notes | Agent 8 |

---

## Förväntad slutgrad efter programmet

| Spår | Nu | Efter v1 |
|------|-----|----------|
| FEAT-1 v1 | ~85% | **100%** |
| Parent Hubs | ~90% | **100%** |
| För dig | ~70% | **95–100%** |
| Child Worlds | ~75% | **90–100%** |
| Illustrationer | ~85% | **100%** |
| First Star | ~45% | **100% (v1)** |
| QA | ~70% | **100%** |
| Dokumentation | ~80% | **100%** |

---

## Relaterade filer

```
docs/v1-completion-program.md          ← denna fil
docs/agents/v1-agent-1-feat1-custody.md
docs/agents/v1-agent-2-parent-hubs.md
docs/agents/v1-agent-3-for-dig.md
docs/agents/v1-agent-4-child-worlds.md
docs/agents/v1-agent-5-first-star.md
docs/agents/v1-agent-6-assets.md
docs/agents/v1-agent-7-release-qa.md
docs/agents/v1-agent-8-documentation.md
```

---

*Senast uppdaterad: 2026-07-02 — Agent 8 Våg 0*
