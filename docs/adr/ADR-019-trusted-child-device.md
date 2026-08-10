# ADR-019 — Trusted child device (PIN-less reopen)

**Status:** Accepted (R4.2 vertical slice — child device mode)  
**Date:** 2026-08-03 (updated 2026-08-06)  
**Scope:** Child session lifetime on a dedicated family device  
**Superseded notes:** Shared/parent modes, widget parity, and single entry authority — see **[ADR-022](ADR-022-family-device-architecture.md)** and [`docs/family-device-architecture.md`](../family-device-architecture.md).  
**Related:** `docs/parent-session-handoff.md`, DeviceMode / SessionGate, POS `04` C-01/C-08  
**POS:** Constitution rule 2 (no surprise), child scope deny-by-default

---

## Context

Families want a dedicated tablet/phone where the app opens in child view without re-entering the child PIN on every cold start, while parent surfaces remain gated.

---

## Decision

**Option A — Device-bound trust (implemented slice)**

1. Parent enables **barnenhet** for a chosen child (`POST /api/family/trusted-devices/child`).
2. Server stores a hashed device token in `family_trusted_device` and sets httpOnly `trusted_device` cookie (90d).
3. Cold start: `POST /api/auth/trusted-device/restore` → short-lived child JWT + child refresh → `/child/today`.
4. Parent gate unchanged for parent surfaces; revoke removes device row and deletes linked child refresh token.
5. Rollout: global `feature_flag` `trusted_device_v1` (default OFF); optional `family_feature_override`.

**Not in this slice:** shared/parent device modes, native biometrics (fallback to parent PIN remains), widget completion.

---

## Security

- Enroll requires authenticated parent + `authz.getChildAccess`.
- Restore never trusts client-stored child id; child derived from server device row + family.
- Revoked devices fail restore and lose last issued refresh token on revoke.
- Child JWT cannot access parent APIs (unchanged authz).

---

## References

- `src/lib/trusted-device.js`, `db/family-trusted-device.js`
- `public/js/trusted-device-client.js`, `public/js/native-child-session-restore.js`
- `test/trusted-device-child.integration.test.js`
