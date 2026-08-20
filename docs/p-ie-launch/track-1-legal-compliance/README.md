# P-IE-LAUNCH — Track 1: Legal & Compliance Reality Build

**Status:** Draft internal package (code-derived, August 2026)  
**Scope:** Ireland launch legal/compliance — **no product changes, no gates, no deploy**  
**Source of truth for behaviour:** live deployed codebase + deployed architecture (not aspirational policy)

---

## Deliverables

### Public documents (English EEA family — IE uses same routes until overlay ships)

| Document | URL | File |
|----------|-----|------|
| EEA Privacy Notice | `/en/eea/privacy` | `public/en/eea-privacy.html` |
| EEA Terms of Service | `/en/eea/terms` | `public/en/eea-terms.html` |
| Child Privacy Notice | `/en/eea/child-privacy` | `public/en/eea-child-privacy.html` |
| Tracking / privacy choices | `/en/tracking-choices` | `public/en/tracking-choices.html` |

Routing: `src/lib/legal-routing.js` · IE + en-GB → EEA family (`status: placeholder` until legal sign-off flips to `live` in a later PR).

### Internal registers (`internal/`)

| Register | File |
|----------|------|
| Implementation baseline (code facts) | [`implementation-baseline.md`](./implementation-baseline.md) |
| DPIA | [`internal/dpia.md`](./internal/dpia.md) |
| Child Data Assessment | [`internal/child-data-assessment.md`](./internal/child-data-assessment.md) |
| Lawful Basis Register | [`internal/lawful-basis-register.md`](./internal/lawful-basis-register.md) |
| RoPA (Record of Processing Activities) | [`internal/ropa.md`](./internal/ropa.md) |
| Processor Register | [`internal/processor-register.md`](./internal/processor-register.md) |
| Transfer Register | [`internal/transfer-register.md`](./internal/transfer-register.md) |
| Retention Schedule | [`internal/retention-schedule.md`](./internal/retention-schedule.md) |
| Ireland Country Overlay | [`internal/ie-country-overlay.md`](./internal/ie-country-overlay.md) |
| Marketing & child-data assessment | [`internal/marketing-child-data-assessment.md`](./internal/marketing-child-data-assessment.md) |
| DSAR runbook | [`internal/runbooks/dsar.md`](./internal/runbooks/dsar.md) |
| Account deletion runbook | [`internal/runbooks/account-deletion.md`](./internal/runbooks/account-deletion.md) |
| Breach notification runbook | [`internal/runbooks/breach-notification.md`](./internal/runbooks/breach-notification.md) |
| **External review queue** | [`LEGAL_REVIEW_REQUIRED.md`](./LEGAL_REVIEW_REQUIRED.md) |

---

## Principles (Track 1)

1. **Reality first** — describe what the app actually does today (verified in code).
2. **Minimal launch package** — complete enough for Ireland RC prep, not a generic policy library.
3. **`LEGAL_REVIEW_REQUIRED`** — any legal conclusion not derivable from code is explicitly flagged for external counsel.
4. **No gates / no deploy** — documents only; `market_ie_open` stays OFF.

---

## Known code ↔ policy gaps (documented, not fixed in Track 1)

| Gap | Code reality | Swedish public policy today |
|-----|--------------|----------------------------|
| Marketing/analytics cookies | Optional GA4, Meta Pixel, Google Ads via `cookie-banner.js` (consent-gated) | `public/privacy.html` states “no tracking cookies” |
| Payment | RevenueCat + Apple/Google IAP (no card data in app DB) | Privacy says “we do not handle payments directly” (still true for card data) |
| Child wellbeing fields | Optional `pedagog_notes` mood/sleep/behaviour | Not mentioned in Swedish privacy (parent-entered, not child forms) |

EEA English documents in this track reflect **code reality**. Aligning Swedish `/privacy` is out of scope for P-IE-LAUNCH Track 1.

---

## Sign-off checklist (before `market_ie_open ON`)

- [ ] External counsel review of [`LEGAL_REVIEW_REQUIRED.md`](./LEGAL_REVIEW_REQUIRED.md) items closed or accepted
- [ ] Public docs reviewed; `resolveLegalRoutes()` status `placeholder` → `live` (separate PR)
- [ ] Processor DPAs / transfer mechanisms filed
- [ ] DPC / Irish consumer law overlay signed (`ie-country-overlay.md`)
- [ ] Commercial/store track (EUR, stores, RevenueCat) complete
- [ ] Ireland RC on physical devices

---

## Related

- `docs/international-expansion-v1-engineering-spec.md` (P-EEA framework)
- `docs/adr/ADR-018-family-market-jurisdiction.md`
- `src/lib/legal-routing.js`, `src/routes/family/account.js`, `src/routes/account/export.js`
