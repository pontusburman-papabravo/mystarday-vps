# Agent 5 — First Star / ACT-1 Completion (v1)

**Kopiera hela filen till en ny Cursor-agent.**  
**Program:** [v1-completion-program.md](../v1-completion-program.md)  
**Våg:** 1 — parallellt med Agent 1 och 2  
**Branch-prefix:** `cursor/v1-first-star-` + suffix `-ef46`

---

## Ditt mål

**ACT-1 v1 Complete** — aktivering redo för **staged rollout** (flaggor OFF i prod tills Agent 7 godkänner).

---

## Nuvarande läge (repo)

| Klart | Saknas |
|-------|--------|
| `family_activation_state` + backfills | `activation_child_handoff_v1` onboarding-steg |
| 6-stegs First Success funnel (API + admin) | `onboarding-first-star.js` |
| `child-first-star-mode.js` (barnvy) | `activation_onboarding_v1` template-flow (v1: utanför scope) |
| Flag `activation_first_star_mode_v1` (default OFF) | Prod rollout |
| `scripts/enable-act1-flags.js` | Migration för handoff/guide flags om saknas |

**Checkpoint:** `docs/act-1-cursor-tasklist.md` — stopp utvärdera efter PR 2.

---

## Fil-ägarskap (monopol onboarding)

```
public/js/onboarding.js
public/js/onboarding-first-star.js    (skapa)
public/js/onboarding-starter-plan.js  (v1: rör ej om ej i scope)
migrations/*activation*
src/lib/activation-*.js
src/routes/analytics.js               (ACT-events endast)
db/activation-funnel.js
public/admin/admin-analytics.js       (funnel UI — endast om events saknas)
test/first-star-mode*.test.js
test/act1-rollout.test.js
test/pr2-checkpoint.test.js
```

**Delat med Agent 4 (koordinera):**

- `child-first-star-mode.js` — du äger gate-logik
- `child-worlds-nav.js` — Agent 4 får polish **efter** gate, inte ändra gate

---

## PR-sekvens (3 PR)

### PR 1 — Child handoff

- Ny onboarding-sektion bakom `activation_child_handoff_v1`
- Migration seed flag om saknas i DB
- `ChildAccessStep`: PIN, copy, länk `/child-login`
- Soft gate: primär "Skapa barnkod", sekundär "Hoppa över" → `child_handoff_skipped`
- Emit `child_access_completed` + uppdatera `family_activation_state`
- Fix: `skipInvite()` ska inte hoppa över handoff när flag på

### PR 2 — Onboarding first star guide

- Skapa `public/js/onboarding-first-star.js` (IIFE, efter `onboarding.js`)
- 3 steg: öppna barnvy → markera klar → celebration
- Flag `activation_first_star_guide_v1` (migration om saknas)
- **Eller** ADR: First Star endast i barnvy (`child-first-star-mode.js`) — dokumentera beslut

### PR 3 — Analytics + rollout docs

- Saknade funnel events i `src/routes/analytics.js` allowlist
- `docs/first-success/` rollout-runbook (staged, inte `enable-act1-flags.js` på prod utan L1)
- **Flaggor förblir OFF** — ingen prod enable i denna PR

---

## ACT-1 rollout-regler (läs innan merge)

1. `activation_first_star_mode_v1` default **OFF**
2. Agent 7 manuell QA krävs före prod enable
3. Rollout-ordning: dogfood → `first_star_mode` → handoff → (senare) template
4. `enable-act1-flags.js` — verifiera att alla keys finns efter migrate

---

## Manuell QA (Agent 7 + du)

- [ ] Första familjen: signup → handoff → first star
- [ ] Flera barn: handoff per barn
- [ ] Avbruten onboarding → återuppta
- [ ] Legacy path utan flaggar oförändrad

---

## Definition of Done

- [ ] Child handoff i onboarding fungerar bakom flag
- [ ] First star guide (onboarding eller ADR för barnvy-only)
- [ ] `child_access_completed` loggas korrekt
- [ ] Admin funnel visar 6-steg utan regression
- [ ] `npm run test:gate` grön
- [ ] **Ingen** prod flag enable utan Agent 7 `release ready`
- [ ] PR 3 innehåller rollout-runbook

---

## v1 out of scope

- `activation_onboarding_v1` template-first (ACT-1 PR 3)
- `activation_ai_starter_plan`
- 9-stegs funnel (behåll 6-steg First Success)

---

## Test

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
# test:gate — full env prefix in root AGENTS.md and .cursor/rules/130-testing.mdc
npm run test:gate
node scripts/pr2-checkpoint.mjs
```

---

## Self-review

```
POS governed by: Constitution §5 (complete signup), P-02, G-01
```
