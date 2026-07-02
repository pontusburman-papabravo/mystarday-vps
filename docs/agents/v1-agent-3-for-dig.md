# Agent 3 — För dig Completion

**Kopiera hela filen till en ny Cursor-agent.**  
**Program:** [v1-completion-program.md](../v1-completion-program.md)  
**Våg:** 2 — **starta inte förrän Agent 1 + Agent 5 är stabila**  
**Branch-prefix:** `cursor/v1-for-dig-` + suffix `-ef46`

---

## Ditt mål

Stäng **För dig Sprint 3–5** och markera **För dig v1 Complete**.

---

## Varför Våg 2

För dig har **nav-/metrics-beslut** (Sprint 4) och delar filer med aktivering. Riskerar att störa v1-stängning om den körs parallellt med FEAT-1 och First Star.

**Startvillkor:**

- [ ] Agent 1 FEAT-1 Closed (eller minst Phase 5 mergad)
- [ ] Agent 5 PR 1–2 mergade (onboarding handoff)
- [ ] Agent 7: ingen blockerande regression i custody + onboarding

---

## Nuvarande läge (repo)

| Sprint | Status |
|--------|--------|
| 1–2 | MVP, aktivering, beslutsskärm, helrutin merge (`mergeScheduleSection`) |
| 3 | Delvis — `for_dig_goal_install`, grundläggande personalisering |
| 4 | **Ej gjord** — bibliotek under *Mer* (metrics-gated i spec) |
| 5 | Delvis — favoriter + "Mest installerade" i UI; full CRUD oklart |

**Källor:** `docs/for-dig-spec.md`, `docs/for-dig-vision.md`, `docs/helrutin-semantik-spec.md`.

---

## Fil-ägarskap

```
src/lib/for-dig-config.js
src/lib/for-dig-activate.js
src/lib/for-dig-plan-preview.js (om finns)
src/routes/for-dig.js
db/for-dig-*.js
public/js/for-dig.js
public/for-dig.html
public/js/nav-config.js          ← Sprint 4 endast med ADR/flag
test/for-dig-*.test.js
```

---

## PR-sekvens (4 PR)

### PR 1 — Sprint 3 personalisering

- Smart *Rekommenderat för [barn]* (ålder, dölj utanför spann)
- Redan-aktiverad-badge / heuristik
- Outcome banners enligt spec §8

### PR 2 — Admin

- Admin editor för mål enligt `for-dig-spec.md` §19.5
- Synka med `for-dig-config.js`

### PR 3 — Sprint 5 favoriter

- Full favorit-CRUD (mål, schema, belöning, aktivitet)
- Populär-sortering: visa sektion endast om ≥3 mål med `install_count >= 5`
- Analytics: `for_dig_favorite_toggle`

### PR 4 — Outcome + Sprint 4 beslut

**Sprint 4 (nav):** Välj **ett**:

- **A)** Implementera med `feature_flag` + dokumenterat metrics-tröskelvärde i ADR, eller  
- **B)** Explicit defer till v1.1 i `docs/for-dig-spec.md` + `14_DECISION_LOG.md`

Outcome-instrumentering + admin/dashboard enligt spec.

---

## Definition of Done

- [ ] Sprint 3 acceptance criteria i spec uppfyllda
- [ ] Admin målhantering fungerar
- [ ] Favoriter CRUD + populär-sektion med trösklar
- [ ] Sprint 4: flag+metrics **eller** skriftlig defer
- [ ] Helrutin: ingen regression (kör `scripts/for-dig-helrutin-qa.mjs`)
- [ ] `npm run test:gate` grön
- [ ] Agent 7 sign-off

---

## Test

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
# test:gate — full env prefix in root AGENTS.md and .cursor/rules/130-testing.mdc
npm run test:gate
node scripts/for-dig-helrutin-qa.mjs   # om DB tillgänglig
```

---

## Förbjudet

- Ändra helrutin-semantik utan ADR (redan låst)
- Global paywall
- Ändra custody (Agent 1)
- Ändra onboarding First Star (Agent 5) utan koordination

---

## Self-review

```
POS governed by: for-dig-vision, PA-01, Constitution §1 (one next step)
```
