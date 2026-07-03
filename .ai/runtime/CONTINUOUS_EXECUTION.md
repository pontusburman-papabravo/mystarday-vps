# Continuous Autonomous Execution (CAE)

**Version:** 1.0  
**Role:** Loop behavior within and across Composer sessions  
**Authority:** Subordinate to HUMAN_APPROVAL_GATE.md

---

## CAE loop (single session)

```
READ relay state
  ↓
SELECT highest-ROI unblocked mission (AMQ)
  ↓
EXECUTE via WORKFLOW_ENGINE phases 0–14
  ↓
UPDATE relay files (RESUME_ENGINE)
  ↓
BLOCKED? → blocked-ROI protocol → next mission
  ↓
MORE unblocked missions? → loop (do not stop)
  ↓
MUST STOP (time/context)? → RELAY_HANDOFF → exit
```

---

## Blocked-ROI protocol

When mission blocked (HRC or technical):

1. Document in `OPEN_BLOCKERS.md`
2. Ask internally: *Is there higher-ROI unblocked work?*
3. Pick next AMQ item — **never idle** if productive work exists
4. HRC-blocked examples: art assets, parent UX copy, live deploy
5. Reversible prep examples: stubs, schema drafts, migration templates, tests

---

## Multi-mission session rules

| Rule | Detail |
|------|--------|
| **CAE-01** | Do not stop after one mission if AMQ has unblocked items |
| **CAE-02** | Do not ask user for next task |
| **CAE-03** | Assume Product Owner offline |
| **CAE-04** | IRC draft PR does not require human pause |
| **CAE-05** | HRC blocks one mission, not the session |
| **CAE-06** | Optimize for RVS, not commit count |

---

## Delivery tiers in CAE

```
ARC  → commit, continue (no PR)
IRC  → draft PR, continue
HRC  → document, continue other missions
```

---

## Stop conditions

Stop **only** when one of:

| # | Condition |
|---|-----------|
| 1 | All AMQ missions blocked (HRC or technical) AND no reversible prep left |
| 2 | Open BLOCK from QA_ENGINE or REVIEW_ENGINE unresolved |
| 3 | Composer session must end (time/context) — **write relay first** |
| 4 | Explicit user interrupt with new directive |

Stop is **not** triggered by:

- Draft PR opened
- IRC checkpoint reached
- Human has not reviewed PR
- One mission completed

---

## Cross-session continuity

Session N ends → relay files written  
Session N+1 starts → read `AUTONOMOUS_SESSION.md` → resume same branch/mission

No chat memory required.

---

## Related

- [RESUME_ENGINE.md](./RESUME_ENGINE.md)
- [AUTONOMOUS_SESSION.md](./AUTONOMOUS_SESSION.md)
- [../knowledge/MISSION_QUEUE.md](../knowledge/MISSION_QUEUE.md)
