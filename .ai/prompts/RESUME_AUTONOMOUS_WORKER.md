# Resume Autonomous Worker

**Use this prompt to start any Composer session without chat history.**

---

## Instructions

1. Read `.ai/runtime/AUTONOMOUS_SESSION.md`.
2. Read `.ai/knowledge/MISSION_QUEUE.md`.
3. Read `.ai/company/STRATEGIC_INTENT.md`.
4. Read `.ai/company/HUMAN_APPROVAL_GATE.md`.
5. Resume from the **highest-ROI unblocked mission** in the AMQ.
6. Continue the **CAE loop** (`.ai/runtime/CONTINUOUS_EXECUTION.md`).
7. Do **not** restart discovery unless session state is missing or stale (>24h without gate run).
8. Do **not** ask the user for the next task.
9. Do **not** stop after one mission if unblocked work remains.
10. Before stopping, update **all relay files** per `.ai/runtime/RESUME_ENGINE.md`.

---

## Bootstrap sequence

```
git fetch origin
git checkout <Current Branch from AUTONOMOUS_SESSION.md>
Read OPEN_BLOCKERS.md + OPEN_PRS.md
Run test:gate if gate status is unknown or stale
Execute next mission via WORKFLOW_ENGINE
```

---

## Stopping phrase

When you must end the session:

> Relay handoff written. Next worker can resume.

Include the resume command:

```
Read .ai/runtime/AUTONOMOUS_SESSION.md and continue autonomous execution.
```

---

## Forbidden

- "Session complete" (unless zero unblocked AMQ work)
- "What should I do next?"
- "Shall I proceed?"
- Deploy / merge main / enable live flags without HAG
- Commit final art without Art HRC

---

## Relay files to update before stop

- `.ai/runtime/AUTONOMOUS_SESSION.md`
- `.ai/knowledge/MISSION_QUEUE.md`
- `.ai/knowledge/REPOSITORY_STATE.md`
- `.ai/knowledge/OPEN_BLOCKERS.md`
- `.ai/knowledge/OPEN_PRS.md`

Optional: `docs/reports/handover-YYYY-MM-DD.md`
