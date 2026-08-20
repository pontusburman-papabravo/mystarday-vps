# Marketing & Child-Data Assessment

**Version:** 0.1 · **Date:** August 2026  
**Question:** Can we market My Starday to Irish families without using child personal data in advertising systems?

---

## 1. Marketing channels (code-evidenced)

| Channel | Implementation | Child data? | Consent |
|---------|----------------|-------------|---------|
| Google Analytics 4 | `marketing-events.js`, `G-8PYNFJH1EQ` | Web events; authenticated parent context possible | Analytics cookie opt-in |
| Google Ads | `AW-7601142474`; signup via GA4 import | Conversion events | Marketing opt-in |
| Meta Pixel | `cookie-banner.js` | Page events | Marketing opt-in |
| Email newsletter | `email_subscriptions` | Parent email only | Double opt-in |
| Win-back email | `win-back-scheduler.js` | Parent email; template may include child first name | LDRA-B2 accepted (service re-engagement + opt-out) |
| Push (parent) | APNs/FCM | Parent device; not child-targeted ads | Parent enables |
| Facebook page cross-post | Admin `dagens_nyhet` | Public news content, not user child data | N/A (B2C content) |

---

## 2. Child data in advertising — code review conclusion

| Check | Result |
|-------|--------|
| Child session sends events to `/api/analytics` whitelist | Child JWT may exist — events are product analytics, not ad pixels |
| Meta/Google tags in child dashboard HTML | Verify in Ireland RC — child view should not load marketing tags (LDRA-C4) |
| Child completion → ad network | **No code path found** |
| Remarketing audiences from child behaviour | **Not implemented** |

**Operational recommendation:** Keep marketing tags off child routes (verify in Ireland RC).

---

## 3. Copy & targeting (Ireland)

| Topic | Status |
|-------|--------|
| Ads referencing children/NPF | Landing copy only — no child data in ad platforms (LDRA-C3) |
| Lookalike / custom audiences | Not implemented |
| App Store / Play store listing | Commercial track — age rating & privacy nutrition labels |

---

## 4. Assessment outcome

| Risk | Level | Mitigation |
|------|-------|------------|
| Child data in ad tech | Low (current code) | Consent-gated tags; RC verification on child pages |
| Parent data in ad tech | Medium | Consent banner; privacy notice disclosure |
| Win-back with child name | Medium | LDRA-B2 accepted — opt-out, parent-facing only |

**Accepted for launch prep.** Revisit if win-back classification challenged or child pages load ad pixels.
