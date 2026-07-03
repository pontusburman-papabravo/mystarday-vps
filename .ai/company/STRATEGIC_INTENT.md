# Strategic Intent

**Standing directive from Product Owner**  
**COS v1.4 — agents derive missions from this, not from chat**

---

## Intent (current)

```
Build Min Värld.

Prioritize the largest improvement to child experience.

Keep architecture simple.

Never violate POS.

Live deploy always requires human approval.
```

---

## How agents use this

| Human provides | Agent derives |
|----------------|---------------|
| Strategic Intent (this doc) | Mission Queue (AMQ) with ROI |
| POS + PCB | What is allowed to build |
| HAG | When to stop and escalate |

**Agents do not ask:** “What should I do next?”  
**Agents do:** Rank missions → pick highest ROI unblocked → execute.

---

## When to update

Human updates this doc when strategy shifts (e.g. new world priority, platform pivot).  
Org Health proposes updates via HRC only when POS conflict requires founder decision.

---

## Related

- `.ai/knowledge/MISSION_QUEUE.md` — Autonomous Mission Queue
- `.ai/company/HUMAN_APPROVAL_GATE.md`
- `.ai/company/NIGHTLY_REVIEW.md`
