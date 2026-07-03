# Organizational Knowledge Index

**Maintained by:** CTO / Org Health  
**Updated:** 2026-07-03 (relay v1.0 + COS v1.4)  
**Purpose:** Living map — update after each mission

---

## Relay system (session continuity)

| File | Role |
|------|------|
| `.ai/runtime/AUTONOMOUS_SESSION.md` | **Start here** — mission · branch · gates |
| `.ai/runtime/RESUME_ENGINE.md` | Relay protocol |
| `.ai/knowledge/MISSION_QUEUE.md` | AMQ |
| `.ai/knowledge/REPOSITORY_STATE.md` | Branch · LKG · gate status |
| `.ai/knowledge/OPEN_BLOCKERS.md` | HRC blockers |
| `.ai/knowledge/OPEN_PRS.md` | IRC table |
| `.ai/prompts/RESUME_AUTONOMOUS_WORKER.md` | Resume prompt |

---

## Authority stack

| Layer | Location | Status |
|-------|----------|--------|
| POS | `product-operating-system/` | ✅ |
| COS | `.ai/company/ORGANIZATION.md` | ✅ v1.3 |
| HAG | `.ai/company/HUMAN_APPROVAL_GATE.md` | ✅ ARC → IRC → HRC |
| RVS KPI | `.ai/company/REPOSITORY_VALUE_SCORE.md` | ✅ |
| Registry | `config/governance-registry.json` | ✅ 7 rules |
| Knowledge | `.ai/knowledge/` | ✅ |

---

## Delivery tiers (v1.3)

```
ARC (no PR) → IRC (draft PR) → HRC (human only)
```

**Blocked-ROI:** never idle when unblocked work exists.

---

## Min Värld — vertical slice status

| Slice | Status |
|-------|--------|
| Home ambient + progression | ✅ |
| Garden ambient scenery | ✅ |
| Garden LOE runtime | ✅ |
| Garden timer auto-bloom | ✅ QA |

---

## Backlog

`.ai/knowledge/BACKLOG.md`
