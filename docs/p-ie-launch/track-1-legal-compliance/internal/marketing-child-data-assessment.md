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
| Email newsletter | `email_subscriptions` | Parent email only | Double opt-in flow **`LEGAL_REVIEW_REQUIRED`** confirm |
| Win-back email | `win-back-scheduler.js` | Parent email; template may include child first name | **`LEGAL_REVIEW_REQUIRED`** marketing vs service |
| Push (parent) | APNs/FCM | Parent device; not child-targeted ads | Parent enables |
| Facebook page cross-post | Admin `dagens_nyhet` | Public news content, not user child data | N/A (B2C content) |

---

## 2. Child data in advertising — code review conclusion

| Check | Result |
|-------|--------|
| Child session sends events to `/api/analytics` whitelist | Child JWT may exist — events are product analytics, not ad pixels |
| Meta/Google tags in child dashboard HTML | Loaded via platform-html on parent pages; child view should not load marketing tags **`LEGAL_REVIEW_REQUIRED`** verify child-dashboard.html script list |
| Child completion → ad network | **No code path found** |
| Remarketing audiences from child behaviour | **Not implemented** |

**Operational recommendation:** Keep marketing tags off child routes (verify in Ireland RC).

---

## 3. Copy & targeting (Ireland)

| Topic | Status |
|-------|--------|
| Ads referencing children/NPF | **`LEGAL_REVIEW_REQUIRED`** — landing copy only, no child data in ad platforms |
| Lookalike / custom audiences | Not implemented |
| App Store / Play store listing | Commercial track — age rating & privacy nutrition labels |

---

## 4. Assessment outcome

| Risk | Level | Mitigation |
|------|-------|------------|
| Child data in ad tech | Low (current code) | Consent-gated tags; RC verification on child pages |
| Parent data in ad tech | Medium | Consent banner; privacy notice disclosure |
| Win-back with child name | Medium | **`LEGAL_REVIEW_REQUIRED`** |

**Proceed:** Draft public tracking notice reflects opt-in model.  
**Block launch if:** Counsel requires DPIA addendum for Meta/Google transfers or prohibits win-back child name without consent.
