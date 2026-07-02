# Organizational Knowledge Index

**Maintained by:** Org Health (Orchestrator + AI Systems Architect)  
**Updated:** 2026-07-02 (overnight run complete)  
**Purpose:** Living map — update after each mission, do not re-grep from scratch

---

## Authority stack

| Layer | Location | Status |
|-------|----------|--------|
| POS | `product-operating-system/` | ✅ 12 files restored |
| COS | `.ai/company/ORGANIZATION.md` | ✅ v1.1 org OS |
| PCB + bibles | `.ai/product/` | ✅ WDB/GDB ref aligned |
| AOS | `.ai/` + `.cursor/rules/` | ✅ tier-aware 200/201 |
| Runtime | `.ai/runtime/` | ✅ tier in MISSION/REVIEW/WORKFLOW |
| Registry | `config/governance-registry.json` | ✅ 7 rules + CI |
| Knowledge | `.ai/knowledge/` | ✅ index + backlog |

---

## Core systems

| System | Entry | Tests |
|--------|-------|-------|
| Express app | `app.js`, `server.js` | `test/maintenance-order.test.js` |
| Auth | `src/routes/auth/` | `test/auth-integration.test.js` |
| Journey coach | `src/lib/journey/`, `journey-coach.js` | `test/journey-*.test.js` |
| Core Engine | `src/core-engine/` | `test/engine-golden.test.js` |
| Experience packs | `config/experience-packs/child_se/` | `test/experience-pack*.test.js` |
| Platform runtime | `src/lib/platform-runtime/` | `test/platform-runtime-integration.test.js` |
| Governance | `config/governance-registry.json` | `test/governance-registry.test.js` |

---

## World implementation state

| World (PCB) | Pack slug | Status |
|---------------|-----------|--------|
| Morgonhuset | `routine_home` | Live |
| Trädgården | `garden` | Live |
| Verkstaden–Läshörnan (5) | — | Not in pack |
| Platform runtime flag | `platform_runtime_enabled` | Default OFF |

---

## Open gaps

| ID | Gap | Priority |
|----|-----|----------|
| GAP-001 | GDB/WDB version refs | ✅ fixed |
| GAP-002 | `lint:public` over CI budget | P2 |
| GAP-003 | 5 PCB worlds not in pack | P3 (human content) |
| GAP-004 | Child IA doc drift | ✅ ADR + indexes updated |

---

## Backlog

`.ai/knowledge/BACKLOG.md`
