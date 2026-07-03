# Relay Handoff Checklist

**Use before every session end.** Prevents incomplete handoffs.

---

## Mandatory updates

- [ ] `.ai/runtime/AUTONOMOUS_SESSION.md` — all sections reflect current reality
- [ ] `.ai/knowledge/MISSION_QUEUE.md` — ranks, statuses, completed items
- [ ] `.ai/knowledge/REPOSITORY_STATE.md` — branch, SHA, gate results
- [ ] `.ai/knowledge/OPEN_BLOCKERS.md` — HRC with exact decision text
- [ ] `.ai/knowledge/OPEN_PRS.md` — matches GitHub draft PRs

---

## Quality gates

- [ ] `test:gate` run if code changed (record N/N in REPOSITORY_STATE)
- [ ] `check:governance` run if `.ai/` or governance docs changed
- [ ] No deploy-mode env literals in docs (secret scanner)

---

## Resume clarity test

Read **only** `AUTONOMOUS_SESSION.md` and verify:

- [ ] **Next Recommended Action** is one concrete imperative
- [ ] **Current Branch** matches git branch
- [ ] **Active Mission** ID matches AMQ rank 1
- [ ] **HRC Blockers** list exact human decisions
- [ ] **Resume command** is present

If any fail → fix before stopping.

---

## Stopping phrase

```
Relay handoff written. Next worker can resume.
```

Resume command:

```
Read .ai/runtime/AUTONOMOUS_SESSION.md and continue autonomous execution.
```

---

## Anti-patterns

- [ ] Did NOT say "session complete" with open unblocked AMQ work
- [ ] Did NOT ask user "what next?"
- [ ] Did NOT rely on chat for mission state
