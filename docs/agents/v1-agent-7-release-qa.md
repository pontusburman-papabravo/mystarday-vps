# Agent 7 — QA & Release

**Kopiera hela filen till en ny Cursor-agent.**  
**Program:** [v1-completion-program.md](../v1-completion-program.md)  
**Våg:** 1→3 — **börja efter första v1-agent-PR, inte sist**  
**Branch-prefix:** `cursor/v1-release-qa-` + suffix `-ef46`

---

## Ditt mål

**Release Candidate** — verifiera att v1-programmet kan shipas utan regression.

**Du bygger ingen produktfunktion.** Du kör gate, smoke, a11y, performance baseline och blockerar merge vid brott.

---

## När du kör

| Trigger | Åtgärd |
|---------|--------|
| Varje agent-PR (1–6) | `test:gate` + relevant smoke |
| Agent 1 PR 4 | Full custody regression |
| Agent 5 PR 2 | Onboarding + First Star smoke |
| Alla agenter klara | Release candidate checklist |
| ACT-1 rollout-PR | **BLOCK** utan manuell QA sign-off |

---

## Gate-kommandon

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
# test:gate — full env prefix in root AGENTS.md and .cursor/rules/130-testing.mdc
npm run test:gate
```

Valfritt full suite (pre-release): `npm test` med samma test-env som i AGENTS.md.

CSS (vid Tailwind/static):

```bash
npm run check:css
```

---

## Smoke-matris

| Område | Agent | Verifiera |
|--------|-------|-----------|
| Parent Hem | 2 | Priority ladder, undantag, barnrad → daglig logg |
| Planering | 2 | Sektioner, tom-state, iPhone SE |
| Belöningar | 2 | Pending, hantera, stjärnöversikt |
| Familj | 2 | Barn före vuxna, barnprofil-länk |
| Custody | 1 | Banner hemnamn, schedule markering, handoff notify |
| För dig | 3 | Aktivera + helrutin sektion merge |
| Child Idag | 4 | Olle-test, celebration ≤2s |
| Onboarding | 5 | Handoff, skip path, multi-child |
| Assets | 6 | Inga 404 på child images |

---

## Constitution test (POS 15 §A)

Kör manuellt vid UX-ändringar:

- [ ] Parent home: ett nästa steg (PA-01)
- [ ] Child completion: reality before celebration (G-01)
- [ ] Onboarding: complete signup (Constitution §5)
- [ ] Rewards: stars not purchasable (R-02)
- [ ] Paywall: lifetime-free inte blockerad

---

## Accessibility (spot check)

- [ ] Kontrast parent magic dark theme
- [ ] 44pt barnkontroller
- [ ] `prefers-reduced-motion` på celebration
- [ ] Tangentbord: primära CTAs nåbara
- [ ] Screen reader: rubriker/aria på hub-sektioner

---

## Performance (baseline)

- [ ] Lighthouse mobile på `/dashboard` (magic Hem) — notera score i PR
- [ ] Inga nya stora bundles utan motivering
- [ ] Child images: lazy below fold OK

---

## Block-veto (STOP merge)

Skriv i PR:

```
Agent 7: BLOCK — [orsak]
```

| Villkor |
|---------|
| `test:gate` fail |
| SW `CACHE_NAME` ≠ `cache-version.json` |
| Custody regression |
| Onboarding dead-end |
| POS-brott |
| ACT-1 flags ON utan godkännande |

---

## Godkännande-format

```
Agent 7: ✓ test:gate
Agent 7: ✓ smoke [parent|child|custody|onboarding]
Agent 7: ✓ release [blocked|ready]
```

---

## Release deliverables (final PR)

Skapa `docs/qa/v1-release-candidate.md` med:

- Gate resultat (datum, commit)
- Smoke checklist avbockad
- Kända begränsningar (defer-lista från program)
- Deploy checklist (migrate, restart, health curl)
- Changelog draft → Agent 8 finaliserar `docs/v1-release-notes.md`

---

## Förbjudet

- Feature-implementation "medan du ändå är här"
- Prod flag enable
- `npm test` på prod VPS med live email keys

---

## Self-review

```
Self-review: QA Director ✓ — ship veto exercised: [none|listed]
```
