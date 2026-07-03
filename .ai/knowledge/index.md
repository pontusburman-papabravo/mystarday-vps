# Organizational Knowledge Index

**Maintained by:** CTO / Org Health  
**Updated:** 2026-07-03 (MO003 — HAG v1.2 + Garden LOE)  
**Purpose:** Living map — update after each mission

---

## Authority stack

| Layer | Location | Status |
|-------|----------|--------|
| POS | `product-operating-system/` | ✅ |
| COS | `.ai/company/ORGANIZATION.md` | ✅ v1.2 |
| HAG | `.ai/company/HUMAN_APPROVAL_GATE.md` | ✅ IRC vs HRC |
| PCB + bibles | `.ai/product/` | ✅ |
| Registry | `config/governance-registry.json` | ✅ 7 rules |
| Knowledge | `.ai/knowledge/` | ✅ |

---

## Human Approval Gate (v1.2)

**Mandate check:** Continue unless HRC trigger. IRC = checkpoint only, no pause.

---

## Min Värld — vertical slice status

| Slice | Component | Status | Notes |
|-------|-----------|--------|-------|
| **Home** | Ambient + progression | ✅ | Pack-driven v1.0.2+ |
| **Garden** | Ambient scenery | ✅ | Pack-driven v1.0.4 |
| **Garden** | Living objects (LOE) | ✅ | `living-object-runtime.js` + verb API |
| **Garden** | Client LOE tap | ✅ | `child-garden.js` pack-linked bed hotspot |
| **Platform runtime** | Orchestrator | ✅ | Flag default OFF |

**Pattern:** pack (worlds + living-objects) → runtime module → playable → client

---

## Open gaps

| ID | Gap | Priority | Next mission |
|----|-----|----------|--------------|
| GAP-007 | Garden timer refresh UX polish | P2 | BL-024 |
| GAP-006 | Shared world-ambient helper | P2 | BL-023 |
| GAP-002 | lint:public CI budget | P2 | BL-010 |
| GAP-003 | PCB worlds 3–7 not in pack | P3 | Human creative (HRC) |

---

## Backlog

`.ai/knowledge/BACKLOG.md`
