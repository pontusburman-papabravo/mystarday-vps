# DPIA — My Starday Ireland launch (draft)

**Version:** 0.1 (code-derived) · **Date:** August 2026  
**Status:** Internal draft — **not signed** until external review complete

---

## 1. Processing description

| Field | Value |
|-------|--------|
| Controller | Papa Bravo AB |
| Processing | Family routine app: parent accounts, child PIN profiles, schedules, star rewards, optional observations, optional share links, push notifications, optional web analytics with consent |
| Market | Ireland (`country_code=IE`, `market_region=EU`) when `market_ie_open` enabled |
| Platforms | Web (PWA), iOS/Android native WebView + native IAP/push |

Source: [`implementation-baseline.md`](../implementation-baseline.md)

---

## 2. Necessity & proportionality

| Assessment | Finding (from product design) |
|------------|----------------------------|
| Data minimisation — child | First name/nickname + emoji only; no child email/phone/surname |
| Purpose limitation | Routine completion drives stars; no child-targeted ads in code paths |
| Parent gate | Child accounts created/managed by parent; child login PIN-only |
| Optional sensitive-adjacent data | `pedagog_notes` may contain mood/sleep/behaviour — **parent/pedagog entered**, not child forms |

**`LEGAL_REVIEW_REQUIRED`:** Whether `pedagog_notes` / observations trigger DPIA escalation or Irish health-data adjacent treatment when parents record wellbeing fields.

---

## 3. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation (implemented) | Residual |
|------|------------|--------|--------------------------|----------|
| Unauthorised access to child routine data | Medium | High | Authz middleware, child/parent session separation, PIN lockout | **`LEGAL_REVIEW_REQUIRED`** penetration test scope |
| Professional share link leakage | Medium | High | Expiry, optional PIN, parent-initiated only, revoke | User education in privacy notice |
| Push token misuse | Low | Medium | Tokens tied to parent account; deleted on account delete | Platform processor trust |
| Analytics re-identification via family_id | Low | Medium | Events keyed to family UUID; deleted on erasure; metadata whitelist | Aggregate snapshots remain |
| Processor breach (Neon, Resend, etc.) | Low | High | Processor DPAs, encryption in transit | **`LEGAL_REVIEW_REQUIRED`** DPA audit |
| Marketing tags without consent | Medium | Medium | Default denied; GCM v2 + cookie banner | Swedish `/privacy` text out of date (not IE path) |
| Account deletion incomplete | Low | High | Explicit delete list incl. `analytics_events` | `admin_audit_log`, `contact_message` retained |
| OAuth email relay (Apple Hide My Email) | Low | Low | Store relay for transactional email only | Documented in privacy notice |

---

## 4. Consultation

| Stakeholder | Status |
|-------------|--------|
| DPO / privacy counsel | **`LEGAL_REVIEW_REQUIRED`** — not evidenced in repo |
| Child users | Indirect via parent; child notice at `/en/eea/child-privacy` |
| Irish users (pilot) | After RC, before gate ON |

---

## 5. Decision

| Outcome | Condition |
|---------|-----------|
| **Proceed to external review** | This draft complete |
| **Proceed to Ireland launch** | All `LEGAL_REVIEW_REQUIRED` in [`LEGAL_REVIEW_REQUIRED.md`](../LEGAL_REVIEW_REQUIRED.md) closed + RC pass |
| **Reject / redesign** | If counsel identifies high-risk processing without mitigation |

**Sign-off:** _Pending — Controller representative + counsel_

---

## 6. Review cycle

- Re-assess when: pedagog health fields expanded, child social features, new processors, or school/educator bulk deployment in IE.
