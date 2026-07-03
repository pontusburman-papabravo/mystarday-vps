# Relay Handoff Checklist

**Use before every session end.** Prevents incomplete handoffs.

---

## Mandatory updates (Worker end)

- [ ] `.ai/runtime/WORKER_HANDOFF.md` — this Worker’s report
- [ ] `.ai/runtime/NEXT_WORKER_PROMPT.md` — next Worker assignment (actionable)
- [ ] `.ai/runtime/AUTONOMOUS_SESSION.md` — session snapshot
- [ ] `.ai/knowledge/REPOSITORY_STATE.md` — branch, SHA, gate results
- [ ] `.ai/knowledge/MISSION_QUEUE.md` or `CAPABILITY_QUEUE.md` — status changes
- [ ] `.ai/knowledge/OPEN_BLOCKERS.md` — if blockers changed
- [ ] `.ai/knowledge/OPEN_PRS.md` — if PRs changed

## Resume clarity test

Read **only** `NEXT_WORKER_PROMPT.md` and verify:

- [ ] Mission ID present
- [ ] Goal is one sentence
- [ ] Branch matches git
- [ ] Tests to run listed
- [ ] Handoff requirements listed
- [ ] Stop conditions clear

## Stopping phrase (Worker)

```
Worker handoff written. Next session: Read .ai/runtime/NEXT_WORKER_PROMPT.md and execute it.
```
