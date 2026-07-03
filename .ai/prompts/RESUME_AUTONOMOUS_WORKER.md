# Resume Autonomous Worker

**One-line entry for every new Composer session:**

```
Read .ai/runtime/NEXT_WORKER_PROMPT.md and execute it.
```

---

## Worker protocol (summary)

You are a **Worker** — exactly one bounded mission, then stop.

1. Read `.ai/runtime/NEXT_WORKER_PROMPT.md` (full assignment).
2. Read files listed in the prompt only — do not restart full discovery.
3. `git fetch` + checkout assigned branch.
4. Implement mission scope.
5. Run tests listed in prompt.
6. Update knowledge + session state.
7. Write `.ai/runtime/WORKER_HANDOFF.md`.
8. Write `.ai/runtime/NEXT_WORKER_PROMPT.md` (next Worker assignment).
9. Commit + push.
10. **Stop.**

Full rules: `.ai/runtime/WORKER_PROTOCOL.md`

---

## Fallback (NEXT_WORKER_PROMPT missing)

```
1. Read .ai/runtime/AUTONOMOUS_SESSION.md
2. Read .ai/knowledge/MISSION_QUEUE.md + CAPABILITY_QUEUE.md
3. Read .ai/knowledge/OPEN_BLOCKERS.md
4. Act as Supervisor (.ai/runtime/SUPERVISOR.md) — select one mission
5. Execute as Worker — then write NEXT_WORKER_PROMPT for the following session
```

---

## Supervisor reference

Supervisor selects missions and writes prompts. Does not implement features.

`.ai/runtime/SUPERVISOR.md`

---

## Forbidden

- Multiple missions in one session
- "What should I do next?"
- Deploy / merge main / enable live flags without HAG
- Art binaries without Art HRC
- Keeping session alive to "finish everything"

---

## Stopping phrase

```
Worker handoff written. Next session: Read .ai/runtime/NEXT_WORKER_PROMPT.md and execute it.
```
