# Worker Protocol — One Mission Per Session

**Version:** 1.0  
**Role:** Short-lived Composer session executing exactly one bounded mission

---

## Principle

> Worker completion is success, not failure.  
> The chain continues when the next session reads `NEXT_WORKER_PROMPT.md`.

Do **not** attempt multiple missions in one session unless the assigned prompt explicitly bundles them (rare).

---

## Worker entry

**Primary (always try first):**

```
Read .ai/runtime/NEXT_WORKER_PROMPT.md and execute it.
```

**Fallback (if NEXT_WORKER_PROMPT missing):**

```
1. Read .ai/runtime/AUTONOMOUS_SESSION.md
2. Read .ai/knowledge/MISSION_QUEUE.md + CAPABILITY_QUEUE.md
3. Act as Supervisor → select mission → self-assign via mental SUPERVISOR.md
4. Execute one mission only
```

---

## Worker lifecycle

```
READ assignment (NEXT_WORKER_PROMPT.md)
  ↓
READ required docs only (no full rediscovery)
  ↓
git fetch && checkout assigned branch
  ↓
IMPLEMENT bounded scope
  ↓
RUN tests listed in prompt
  ↓
UPDATE knowledge + session state
  ↓
WRITE WORKER_HANDOFF.md (what was done)
  ↓
WRITE NEXT_WORKER_PROMPT.md (next Worker assignment)
  ↓
COMMIT + PUSH
  ↓
STOP
```

---

## Worker responsibilities

| # | Responsibility |
|---|----------------|
| 1 | Read assigned mission only |
| 2 | Read necessary docs (listed in prompt) |
| 3 | Implement the mission |
| 4 | Run tests |
| 5 | Update docs/state |
| 6 | Create ARC/IRC artifact (commit; draft PR if IRC) |
| 7 | Update AMQ / CQ |
| 8 | Write `NEXT_WORKER_PROMPT.md` |
| 9 | Write `WORKER_HANDOFF.md` |
| 10 | **Stop** |

---

## Worker must NOT

- Start a second mission in the same session
- Ask human for next task
- Deploy to live / merge main / enable live feature flags without HAG
- Leave `NEXT_WORKER_PROMPT.md` empty or vague
- Say "session complete" without next Worker prompt

---

## Handoff requirements (every Worker end)

Update at minimum:

- `.ai/runtime/WORKER_HANDOFF.md` — this Worker’s report
- `.ai/runtime/NEXT_WORKER_PROMPT.md` — next Worker’s assignment
- `.ai/runtime/AUTONOMOUS_SESSION.md` — session snapshot
- `.ai/knowledge/REPOSITORY_STATE.md` — branch, SHA, gate results
- `.ai/knowledge/MISSION_QUEUE.md` or `CAPABILITY_QUEUE.md` — status changes

---

## Delivery tiers

| Tier | Worker output |
|------|---------------|
| **ARC** | Commit only |
| **IRC** | Commit + update draft PR |
| **HRC** | Document blocker; do not implement blocked part |

---

## Stopping phrase

```
Worker handoff written. Next session: Read .ai/runtime/NEXT_WORKER_PROMPT.md and execute it.
```

---

## Exhaustion rule

Worker chain pauses only when Supervisor finds **no** assignable mission across:

- unblocked features
- capabilities (≥2 consumers)
- architecture simplification
- quality improvements with positive ROI

Document exhaustion in `AUTONOMOUS_SESSION.md` with explicit category scan.

---

## Related

- [SUPERVISOR.md](./SUPERVISOR.md)
- [WORKER_HANDOFF.md](./WORKER_HANDOFF.md)
- [NEXT_WORKER_PROMPT.md](./NEXT_WORKER_PROMPT.md)
