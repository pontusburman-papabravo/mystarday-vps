# Supervisor — Mission Selection & Worker Dispatch

**Version:** 1.0  
**Role:** Persistent coordinator across short-lived Composer Workers  
**Does not implement features** unless explicitly acting as Worker

---

## Principle

> One Composer session = one bounded Worker.  
> Supervisor state lives in the repository, not in chat.

Composer terminates after each mission. That is **expected**. The relay chain continues via files.

---

## Supervisor owns

| Asset | Location |
|-------|----------|
| Mission queue (features) | `.ai/knowledge/MISSION_QUEUE.md` |
| Capability queue (platform) | `.ai/knowledge/CAPABILITY_QUEUE.md` |
| Blockers | `.ai/knowledge/OPEN_BLOCKERS.md` |
| IRC/ARC/HRC status | `.ai/knowledge/OPEN_PRS.md` |
| Strategy snapshot | `.ai/runtime/AUTONOMOUS_SESSION.md` |
| Repository state | `.ai/knowledge/REPOSITORY_STATE.md` |
| Next Worker assignment | `.ai/runtime/NEXT_WORKER_PROMPT.md` |
| Last Worker report | `.ai/runtime/WORKER_HANDOFF.md` |

---

## When Supervisor runs

Supervisor logic executes when:

1. A Worker completes and must assign the next Worker (writes `NEXT_WORKER_PROMPT.md`)
2. `NEXT_WORKER_PROMPT.md` is missing or stale — session reads `AUTONOMOUS_SESSION.md` and reconstructs
3. Human runs explicit Supervisor pass (rare)

**Default Worker entry:** read `NEXT_WORKER_PROMPT.md` and execute. No mission selection needed.

---

## Selection algorithm

```
1. Read MISSION_QUEUE.md + CAPABILITY_QUEUE.md + OPEN_BLOCKERS.md
2. Pick highest-ROI mission that is NOT HRC-blocked
   OR has reversible prep explicitly allowed
3. If all features HRC-blocked → pick top CAPABILITY_QUEUE item
4. If no capability → architecture simplification
5. If none → quality (tests, a11y, docs, perf)
6. If none → debt / opportunities scan
7. Only then → exhaustion (see WORKER_PROTOCOL.md)
```

**Never select:**

- BL-041 art binaries (Art HRC)
- BL-042 parent UX (Parent HRC)
- Live deploy, family flag enablement, merge to main (HAG)

---

## Supervisor dispatch checklist

Before writing `NEXT_WORKER_PROMPT.md`:

- [ ] Mission ID and single-sentence goal
- [ ] Branch + PR context
- [ ] Files to inspect first (read-only)
- [ ] Files likely to edit
- [ ] Required POS/COS/docs
- [ ] Tests to run
- [ ] Quality gates (`test:gate`, `check:css` if UI)
- [ ] HRC blockers that apply (do-nots)
- [ ] Expected outputs (concrete artifacts)
- [ ] Handoff requirements for Worker end
- [ ] Stop conditions (Worker must stop after this mission)

---

## Supervisor must NOT

- Implement feature code (unless wearing Worker hat)
- Ask human "what next?"
- Try to keep one session alive across missions
- Skip writing `NEXT_WORKER_PROMPT.md` after Worker completes

---

## Related

- [WORKER_PROTOCOL.md](./WORKER_PROTOCOL.md)
- [AUTONOMOUS_SESSION.md](./AUTONOMOUS_SESSION.md)
- `.ai/company/HUMAN_APPROVAL_GATE.md`
