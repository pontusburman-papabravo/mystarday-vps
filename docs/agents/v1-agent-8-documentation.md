# Agent 8 — Documentation

**Kopiera hela filen till en ny Cursor-agent.**  
**Program:** [v1-completion-program.md](../v1-completion-program.md)  
**Våg:** 0 (program) + 3 (final)  
**Branch-prefix:** `cursor/v1-docs-` + suffix `-ef46`

---

## Ditt mål

1. **Våg 0:** Program + agent-promptar (denna fils syskon)  
2. **Våg 3:** Documentation Complete efter Agent 7 Release Candidate

**Du implementerar ingen produktkod** i Våg 0. Endast `docs/`.

---

## Våg 0 leverans (först)

Skapa/uppdatera:

- [x] `docs/v1-completion-program.md`
- [x] `docs/agents/v1-agent-1-feat1-custody.md` … `v1-agent-8-documentation.md`

Merge **endast docs** — ingen `public/`, `src/`, `migrations/`.

---

## Våg 3 leverans (efter Agent 7)

### Uppdatera status i index

| Fil | Ändra |
|-----|-------|
| `docs/child-worlds-index.md` | Shipped där Agent 4 stängt |
| `docs/parent-hubs-index.md` | Status kolumn → Complete |
| `docs/boendeschema-spec.md` | §DoD avbockad |
| `docs/boendeschema-implementationsplan.md` | Phase 5 ✅ |
| `docs/act-1-cursor-tasklist.md` | PR 2 checkboxar |

### ADR / beslut

- `docs/boendeschema-adr.md` — version bump om Phase 5 låst
- `docs/14_DECISION_LOG.md` — Sprint 4 defer, First Star scope, etc.
- `docs/helrutin-semantik-adr.md` — markera implementation complete

### Skapa

- `docs/v1-release-notes.md` — användarorienterade + tekniska highlights
- `docs/architecture/v1-handoff.md` — vad nästa fas bör plocka (FEAT-1B, ACT-1 PR 3)

### Städa

- Ta bort stale TODO i v1-scope docs
- Uppdatera `docs/qa/hub-integration-sweep.md` pekare om Agent 2 levererat v2
- `CLAUDE.md` "Recent changes" — kort v1-release rad (om team convention)

---

## DoD-index (du äger synk)

När en agent stänger sitt spår, uppdatera motsvarande doc:

| Agent | Dokument |
|-------|----------|
| 1 | `boendeschema-spec.md` §DoD |
| 2 | `parent-hubs-index.md`, `qa/hub-integration-sweep.md` |
| 3 | `for-dig-spec.md` sprint-checkboxar |
| 4 | `child-worlds-index.md` |
| 5 | `act-1-cursor-tasklist.md` |
| 6 | `child-image-assets.md` |
| 7 | `qa/v1-release-candidate.md` |
| 8 | `v1-release-notes.md`, ADR index |

---

## PR-sekvens

### PR 0 (Våg 0) — denna insats

`docs(v1): completion program + agent prompts`

### PR Final (Våg 3)

`docs(v1): release notes + DoD closure + architecture handoff`

---

## Definition of Done — Documentation Complete

- [ ] Alla agent-DoD speglade i käll-docs (inga tomma checkboxar för stängda spår)
- [ ] `v1-release-notes.md` publicerad
- [ ] `v1-handoff.md` pekar på FEAT-1B, FEAT-1C, ACT-1 PR 3
- [ ] Inga motsägelser mellan program och agent-prompts
- [ ] Out-of-scope lista i program matchar ADR/defer-beslut

---

## Förbjudet

- Produktkod i Våg 0-PR
- Ändra POS (`product-operating-system/`) utan contradiction ADR
- Markera Shipped utan agent-leverans verifierad

---

## Self-review

```
Self-review: AISA ✓ — docs match repo state as of [commit SHA]
```
