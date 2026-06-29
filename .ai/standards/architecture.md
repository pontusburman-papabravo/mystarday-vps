# Standard — Architecture

**Version:** 1.0  
**Authority:** `product-operating-system/10_ARCHITECTURE.md` · `14_DECISION_LOG.md` (ADR)

> This file routes agents to product truth. **Do not duplicate** POS 10 here.

---

## Principles (summary — full detail in POS 10)

1. **Server owns product truth** — clients are channels  
2. **Journey/Gate singularity** — no duplicate coach brains  
3. **Authz centralized** — `src/middleware/authz.js` · no inline ownership SQL  
4. **Parameterized SQL** — `db/*` query modules  
5. **Optional integrations degrade gracefully** — no key = no crash  
6. **Middleware order matters** — see `app.js` · maintenance before routes  
7. **No global paywall** — `requireComponent()` per route (ADR-005)  
8. **No client-only unlock or auth**

---

## When to Read POS 10

- New route or API surface
- New scheduler or background job
- Schema migration
- Module extraction from large files
- Third-party integration

---

## ADR Required (Level 3)

See [DECISION_MODEL.md](../DECISION_MODEL.md). Draft in POS 14 format.

---

## Agent Checks (before PR)

- [ ] Simpler than replaced structure
- [ ] No parallel system for existing concern
- [ ] Route inventory updated if new endpoints (`npm run dump:routes`)
- [ ] Migration idempotent + rollback gate test
- [ ] ADR linked if authority changed

---

## Deep References

| Topic | Location |
|-------|----------|
| Full architecture rules | `product-operating-system/10_*.md` |
| ADR log | `product-operating-system/14_DECISION_LOG.md` |
| Architect role | [roles/architect.md](../roles/architect.md) |
| Refactor workflow | [workflows/refactoring.md](../workflows/refactoring.md) |
| Runtime engines | `.ai/runtime/IMPLEMENTATION_ENGINE.md` |
