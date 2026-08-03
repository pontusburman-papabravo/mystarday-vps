# ADR-019 — Trusted child device (PIN-less reopen)

**Status:** Proposed (implementation STOPPED pending accept)  
**Date:** 2026-08-03  
**Scope:** Child session lifetime on a dedicated family device  
**Related:** `docs/parent-session-handoff.md`, DeviceMode / SessionGate, POS `04` C-01/C-08  
**POS:** Constitution rule 2 (no surprise), child scope deny-by-default

---

## Context

Families want a dedicated tablet/phone where:

1. App opens **directly in child view**
2. Child does **not** re-enter the same child PIN on every cold start
3. Leaving to parent mode still requires a **parental gate**
4. Trusted mode can be **disabled and revoked**
5. Child JWT must never reach parent APIs
6. Parent refresh must not be revoked when the child logs out

Today the product has:

| Mechanism | What it does | Gap |
|-----------|--------------|-----|
| Child access JWT (~8h) + refresh (~30d) | Session continuity while cookies live | Web cold open still lands on `/child-login` and asks for PIN even when a valid child session exists (partial client resume can help; see non-goals) |
| `DeviceMode` localStorage (`child`/`parent`) | Client routing hint | Not a security boundary; cleared or spoofable |
| `stjarndag_parent_session` handoff | Restores parent after child | Orthogonal to child PIN-less reopen |
| Known children list | Speeds picker | Still requires child PIN |

There is **no** server-side “this device is trusted for child X without PIN” model.

---

## Decision (proposed — not accepted)

Do **not** ship PIN-less reopen until product/security accept one of:

### Option A — Device-bound child refresh (recommended direction)

1. Parent explicitly enables **Barnenhet** for a chosen child on this device.
2. Server issues a **device-bound child refresh** (hashed, rotatable, revocable) stored HttpOnly.
3. Cold start uses refresh → new short-lived child access JWT → `/child/today`.
4. Parent gate still required for parent surfaces; disabling Barnenhet revokes the device refresh.
5. Audit log: enable / disable / revoke / anomalous use.

### Option B — OS biometric unlock of stored child session

Native-only Secure Storage + biometric; weaker web story; still needs server revoke story for lost devices.

### Rejected without ADR accept

- Client-only “remember PIN”
- Extending child access JWT to months without device binding
- Reusing parent handoff cookie as child trust
- Family-wide PIN skip

---

## Consequences if accepted

- New table (e.g. `child_device_trust`) + migration
- Settings UX: enable / disable / list devices
- Integration tests: revoke, theft, child≠parent API, handoff intact
- Release flag for staged rollout

## Current engineering stop line

**This ADR documents the gap.** Code in the 2026-08 stability branch may:

- Resume an **already valid** child session on `/child-login` → `/child/today` (no new trust)
- Keep DeviceMode + parental gate behavior

It must **not** implement Option A/B until Status → Accepted.

---

## References

- `public/js/device-mode.js`, `public/js/session-gate.js`
- `src/lib/parent-session-handoff.js`
- `docs/kravspec-app-webb.md` §2 (device management intent)
- Open harness work: PR #813 (handoff navigation race — test-only)
