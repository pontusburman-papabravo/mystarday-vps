# DPIA — My Starday Ireland launch (draft)

**Version:** 0.1 (code-derived) · **Date:** August 2026  
**Status:** Internal draft — **internal sign-off**, not externally legally verified

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

**LDRA-A2 guardrails:** Optional wellbeing notes are not positioned as health-data collection. If content constitutes Article 9 health data, contract basis alone is insufficient — see [`LEGAL_DECISIONS_AND_RISK_ACCEPTANCE.md`](../LEGAL_DECISIONS_AND_RISK_ACCEPTANCE.md) A2. Voluntary sensitive free text receives enhanced protection (no analytics/marketing/profiling/AI).

---

## 3. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation (implemented) | Residual |
|------|------------|--------|--------------------------|----------|
| Unauthorised access to child routine data | Medium | High | Authz middleware, child/parent session separation, PIN lockout | Penetration test — separate security track |
| Professional share link leakage | Medium | High | Expiry, optional PIN, parent-initiated only, revoke | User education in privacy notice |
| Push token misuse | Low | Medium | Tokens tied to parent account; deleted on account delete | Platform processor trust |
| Analytics re-identification via family_id | Low | Medium | Pseudonymised family UUID; deleted on erasure; metadata whitelist | LDRA-B1 accepted |
| Processor breach (Neon, Resend, etc.) | Low | High | Processor DPAs, encryption in transit | **LDRA-A3 open** until DPAs filed |
| Marketing tags without consent | Medium | Medium | Default denied; GCM v2 + cookie banner | SE + EEA privacy aligned |
| Account deletion incomplete | Low | High | Explicit delete list incl. `analytics_events` | `admin_audit_log`, `contact_message` retained (disclosed) |
| OAuth email relay (Apple Hide My Email) | Low | Low | Store relay for transactional email only | Documented in privacy notice |

---

## 4. Consultation

| Stakeholder | Status |
|-------------|--------|
| Privacy owner (founder) | Internal sign-off per [`TRACK-1-SELF-SIGNOFF-REPORT.md`](../TRACK-1-SELF-SIGNOFF-REPORT.md) |
| Child users | Indirect via parent; child notice at `/en/eea/child-privacy` |
| Irish users (pilot) | After RC, before gate ON |

---

## 5. Decision

| Outcome | Condition |
|---------|-----------|
| **Proceed to internal sign-off** | This draft complete |
| **Proceed to `resolveLegalRoutes()` live** | LDRA-A3 + A4 closed + founder sign-off |
| **Proceed to `market_ie_open ON`** | Above + commercial track + RC |

**Sign-off:** See [`TRACK-1-SELF-SIGNOFF-REPORT.md`](../TRACK-1-SELF-SIGNOFF-REPORT.md)

---

## 6. Review cycle

Re-assess when: pedagog health fields expanded, child social features, new processors, or school/educator bulk deployment in IE.
