# AODS — AI Orchestrated Development Standard

**Version:** 0.1 (stub)  
**Status:** Stub — full v1.0 planned separately  
**Authority:** Subordinate to [DOCUMENTATION_MAP.md](./DOCUMENTATION_MAP.md) and POS  

---

## Purpose

AODS defines **how AI agents and human developers must work** when producing Min värld assets and implementation — so output is traceable, POS-aligned, and IP-grade in five years.

This stub enforces the **Bible chain** until AODS v1.0 is authored.

---

## Normative rule

> **No AI may create an image, animation, or implementation code directly from an idea.**

Required chain:

```
Vision (POS, PCB, LWES principles)
  → World Bible
  → Entity Bible
  → Animation Bible
  → Prompt Bible / Art Prompt Catalog
  → Art Generation → Implementation
```

See [bibles/README.md](./bibles/README.md) and [DOCUMENTATION_MAP.md](./DOCUMENTATION_MAP.md).

---

## When AI must NOT invent

| Situation | Action |
|-----------|--------|
| Behavior undefined in POS | Open Question — stop, do not guess |
| Scene/entity not in a Bible | Author Bible entry first |
| New LWES part requested | ADR in `product-operating-system/14_DECISION_LOG.md` |
| Product decision (economy, unlock, copy) | Escalate — not agent invention |
| Missing assets/keys | Stop — list required inputs |

---

## Agent bootstrap (minimum)

1. Read [DOCUMENTATION_MAP.md](./DOCUMENTATION_MAP.md) — know what exists vs missing  
2. Read POS 00, 00A, 00B + task domain doc  
3. Read relevant Bible before producing assets or code  
4. Follow `.cursor/rules/000-core.mdc` → implement → `180-self-review.mdc` → `190-definition-of-done.mdc`  

Runtime roster: `.ai/AGENTS.md` · `.ai/runtime/WORKFLOW_ENGINE.md`

---

## Related

| Document | Role |
|----------|------|
| [DOCUMENTATION_MAP.md](./DOCUMENTATION_MAP.md) | Status table + build order |
| [LIVING_WORLD_ENGINE_SPEC.md](./LIVING_WORLD_ENGINE_SPEC.md) | Engine contract (FROZEN v1.0) |
| [bibles/README.md](./bibles/README.md) | Production Bible index |
| `.cursor/rules/` | AOS enforcement (000–190) |

**Planned:** AODS v1.0 — bible chain lint, agent role matrix, PR templates, forbidden AI patterns.
