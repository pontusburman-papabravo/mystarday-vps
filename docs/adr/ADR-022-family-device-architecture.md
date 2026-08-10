# ADR-022 — Family device architecture (betrodd enhet, en entry)

**Status:** Accepted — **PRODUCT DECISION GO**  
**Date:** 2026-08-10  
**Supersedes (partial):** ADR-019 scope notes (“Not in this slice” for shared/parent/widget — those are now in scope via this ADR)  
**Normativ spec:** [`docs/family-device-architecture.md`](../family-device-architecture.md)  
**POS:** Constitution 1–5, `04` C-01/C-08, `15` routine path  
**Related:** ADR-019, R4.2–R4.5, `docs/parent-session-handoff.md`

---

## Context

Familjeappen har vuxit fram med **två mentala appar**: förälder (e-post/lösenord) och barn (namn + PIN), plus handoff, `DeviceMode` i localStorage, trusted-device restore, och widget-bridge — som **var för sig** kan styra cold start. Det skapar wrong-child-risk och login-friktion (Emma-use case).

R4 har redan levererat backend för `family_trusted_device` (`child`, `shared`), child restore, shared picker, co-parent scope, och per-widget `childId` binding. Produktmodellen var inte låst i en enda entry state machine.

---

## Decision

1. **Familjeappen is one family app on a trusted device** — not two logins. Ten definitive product rules are listed in `family-device-architecture.md` §1.

2. **Three separated concepts (normative):**
   - `device_mode`: `parent` | `shared` | `child`
   - `view_context`: `parent` | `child:<id>` | `picker`
   - `credential_context`: `parent` | `child:<id>` | `none`  
   **Device role ≠ UI mode ≠ credential.**

3. **Single entry authority:** `resolveAppEntry(...)` (Fas 2) is the only cold-start router. `SessionGate`, `DeviceMode`, handoff, and bootstrap **must not** independently override server device identity.

4. **Server canonical:** `family_trusted_device` (+ trusted restore/context APIs) is source of truth for device behavior. Client may cache; client may not invent device role.

5. **Daily security boundary:** Child → adult requires biometrics or adult app-lock PIN and **activates** parent credentials — not hidden parent tokens during child UI.

6. **Child profile switch** on trusted shared device is `select-child` / picker — not logout/login. Child PIN is **optional** (sibling lock), not default navigation.

7. **Widget** uses the same child scope as app child mode; per-instance `childId` binding is mandatory; wrong-child **fail closed**.

8. **Offline v1:** Child keeps existing offline completion queues; adult state-changing APIs require connectivity — **no** general offline parent admin in v1.

9. **UX freeze:** No parallel UX models for entry/widget until phases in spec are delivered. Widget work continues only on this architecture.

10. **Implementation phases:** Spec (Fas 1) → Entry orchestrator (Fas 2) → Vuxen 🔒 (Fas 3) → Deprecate dual-login UX (Fas 4) → Widget rollout alignment (Fas 5). See spec §9.

---

## Consequences

- **Positive:** Aligns product with R4 investment; reduces PIN friction; clarifies widget binding; measurable 10/10 criteria.
- **Negative:** Requires refactoring entry paths and tests that assume `/child-login` and child logout as normal; ADR-019 doc is incomplete for parent mode until Fas 2.
- **Rollout:** Continue `trusted_device_v1` kill switch; pilot before broad widget ON.

---

## Security (unchanged principles)

- Child JWT cannot call parent APIs.
- Restore never trusts client-only child id.
- Revoked device loses restore and linked refresh lineage.
- Co-parent `allowed_children` enforced on picker, restore, and widget.

---

## References

- `docs/family-device-architecture.md`
- `src/lib/trusted-device.js`, `migrations/1810180000000_trusted_device_v1.js`
- `public/js/trusted-device-bootstrap.js`, `public/js/device-mode.js`, `public/js/session-gate.js`
- `test/r43-shared-device.integration.test.js`, `test/trusted-device-child.integration.test.js`
