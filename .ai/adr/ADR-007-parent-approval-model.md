# ADR-007 — Parent Approval Model

**Status:** Accepted  
**Date:** 2026-06-29

## Context

Layer 7 real rewards och Skattkammaren kräver förälders relation — appen är budbärare, inte merchant (PCB, G-07, PEB §13).

## Problem

Auto-approved redemptions eller barn-initierade köp bryter trust och Product Constitution §4 (osäkerhet).

## Decision

- **Skattkammaren redemption** = `pending` tills **parent explicit approve** (push optional, in-app queue).  
- **Reward definition** (create/edit/delete) = parent-only route; barn read-only catalog.  
- **Real-world treat** copy: parent-defined text — app skickar notifikation, inte vara.  
- **AI coach** får föreslå belöning copy — **aldrig** godkänna redemption (PEB §13).  
- **PIN gate** för parent settings; child session cannot approve.

## Alternatives Considered

| Alt | Varför nej |
|-----|------------|
| Auto-approve under N stjärnor | Underminerar Layer 7 |
| Parent PIN per redemption | Friktion för varje fika |

## Trade-offs

+ Trust + G-07 compliance.  
− Extra parent tap; mitigated by batch approve optional senare (ny ADR).

## Consequences

- API: `POST /api/rewards/redemptions` → pending; `PUT .../approve` parent auth.  
- Push: only `action_needed` class (PEB notifications).  
- UI: warm copy — not transactional (PEB UX-P06).

## Migration Strategy

Existing redemptions grandfathered as approved; new flow default pending from cutover date.

## Related Documents

- `PARENT_EXPERIENCE_BIBLE.md` §13 Parent Reward System  
- `GAME_DESIGN_BIBLE.md` G-07  
- `PRODUCT_CONTENT_BIBLE.md` Layer 7

## Future Revisions

Scheduled approve windows; co-parent approve either parent.
