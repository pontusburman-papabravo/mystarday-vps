# Resume Engine

**Version:** 1.0  
**Role:** Relay protocol so every Composer session can continue from repo files alone  
**Invoked:** End of every session · start of every autonomous resume

---

## Principle

> Every Composer session is disposable.  
> The repository state is persistent.

Chat history is **not** a source of truth. Relay files are.

---

## Relay file set (mandatory)

| File | Purpose | Update when |
|------|---------|-------------|
| [AUTONOMOUS_SESSION.md](./AUTONOMOUS_SESSION.md) | Single-pane session state | Every checkpoint · every stop |
| [../knowledge/MISSION_QUEUE.md](../knowledge/MISSION_QUEUE.md) | Ranked missions (AMQ) | Mission start/complete/block |
| [../knowledge/REPOSITORY_STATE.md](../knowledge/REPOSITORY_STATE.md) | Branch · gates · LKG commit | After commit · after test run |
| [../knowledge/OPEN_BLOCKERS.md](../knowledge/OPEN_BLOCKERS.md) | HRC + technical blockers | Blocker added/resolved |
| [../knowledge/OPEN_PRS.md](../knowledge/OPEN_PRS.md) | IRC/HRC PR table | PR opened/merged/closed |
| [SESSION_HANDOFF_TEMPLATE.md](./SESSION_HANDOFF_TEMPLATE.md) | Copy-paste handoff skeleton | Reference only |
| [docs/reports/handover-YYYY-MM-DD.md](../../docs/reports/handover-YYYY-MM-DD.md) | Human-readable session log | Session end (optional but recommended) |

---

## Session end protocol (every run)

Whether successful, interrupted, or time-limited:

```
1. Run test:gate + check:governance if code touched
2. Update AUTONOMOUS_SESSION.md (all sections)
3. Update MISSION_QUEUE.md
4. Update REPOSITORY_STATE.md
5. Update OPEN_BLOCKERS.md
6. Update OPEN_PRS.md
7. Commit relay files with work (or relay-only commit if blocked)
8. Push branch
9. Update/create draft PR if IRC slice complete
10. Write handover doc if significant session
```

**Stopping phrase (required):**

> Relay handoff written. Next worker can resume.

**Forbidden phrase:**

> Session complete.

…unless AMQ has zero unblocked missions and no open IRC work.

---

## Session start protocol (autonomous resume)

```
1. Read AUTONOMOUS_SESSION.md
2. Read MISSION_QUEUE.md
3. Read STRATEGIC_INTENT.md + HUMAN_APPROVAL_GATE.md
4. Read OPEN_BLOCKERS.md + OPEN_PRS.md
5. git fetch && checkout Current Branch from AUTONOMOUS_SESSION
6. Resume highest-ROI unblocked mission — do NOT ask user
7. Do NOT restart discovery unless relay state is missing/stale
```

Entry command for humans:

> Read `AUTONOMOUS_SESSION.md` and continue autonomous execution.

Or use [../prompts/RESUME_AUTONOMOUS_WORKER.md](../prompts/RESUME_AUTONOMOUS_WORKER.md).

---

## Staleness rules

| Signal | Action |
|--------|--------|
| `Last updated` > 24h old | Re-run test:gate before new work |
| Branch in session file ≠ current branch | Fix branch or update file before coding |
| `test:gate` unknown | Run gate and record result |
| AMQ empty but backlog has items | Reprioritize AMQ from BACKLOG.md |
| OPEN_PRS conflicts with GitHub | Fetch remotes · reconcile table |

---

## Checkpoint cadence

Update relay files at minimum:

- After each mission complete (ARC/IRC)
- After each draft PR opened
- Before stopping for any reason
- After HRC blocker documented

---

## Integration with WORKFLOW_ENGINE

Relay updates are **PHASE 14** (SELF_IMPROVEMENT) plus a new **PHASE 15 — RELAY_HANDOFF**:

| Step | Action |
|------|--------|
| 15.1 | Refresh AUTONOMOUS_SESSION.md |
| 15.2 | Refresh knowledge/*.md |
| 15.3 | Verify resume instructions are actionable |
| 15.4 | Commit + push |

---

## Anti-patterns

- Relying on chat for mission state
- Stopping after one mission when AMQ has unblocked work
- Asking user "what next?" when AMQ is populated
- Updating handover without updating AUTONOMOUS_SESSION.md
- Declaring complete without recording next action

---

## Related

- [CONTINUOUS_EXECUTION.md](./CONTINUOUS_EXECUTION.md) — CAE loop across sessions
- [../company/HUMAN_APPROVAL_GATE.md](../company/HUMAN_APPROVAL_GATE.md) — when to escalate
- [../company/STRATEGIC_INTENT.md](../company/STRATEGIC_INTENT.md) — strategic north star
