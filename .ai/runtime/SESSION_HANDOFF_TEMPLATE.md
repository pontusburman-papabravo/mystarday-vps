# Session Handoff Template

**Use at session end.** Copy to `docs/reports/handover-YYYY-MM-DD.md` and sync relay files.

---

## Metadata

| Field | Value |
|-------|-------|
| **Session end** | YYYY-MM-DD HH:MM UTC |
| **Active branch** | `cursor/...` |
| **Last commit** | `<sha>` — message |
| **test:gate** | N/N green · red details |
| **check:governance** | OK / FAIL |
| **Relay updated** | yes / no |

---

## Session outcome

One paragraph: what shipped, what blocked, what deferred.

---

## Human decisions received

| ID | Decision | Impact |
|----|----------|--------|
| | | |

---

## PRs this session

| IRC | PR | Branch | Status | Notes |
|-----|-----|--------|--------|-------|
| | | | Draft/Merged | |

---

## What was delivered

| Layer | Key files |
|-------|-----------|
| | |

---

## AMQ — next work

| Rank | ID | Mission | Blocker |
|------|-----|---------|---------|
| 1 | | | |

---

## Test / env notes

- Node 20 on PATH
- `NODE_ENV=test` for gate
- Unset email API keys for tests
- Other pitfalls discovered

---

## Explicit do-nots

- 
- 

---

## Scores

- RVS: X.X / 10 (Δ)
- LWS: X.X / 10 (Δ)

---

## Relay verification checklist

Before saying "Relay handoff written":

- [ ] `AUTONOMOUS_SESSION.md` — all sections current
- [ ] `MISSION_QUEUE.md` — ranks and statuses match reality
- [ ] `REPOSITORY_STATE.md` — branch, commit, gates
- [ ] `OPEN_BLOCKERS.md` — HRC items with exact decision needed
- [ ] `OPEN_PRS.md` — matches GitHub
- [ ] Next action is one imperative sentence
- [ ] Resume command documented

---

## Resume command

```
Read .ai/runtime/AUTONOMOUS_SESSION.md and continue autonomous execution.
```
