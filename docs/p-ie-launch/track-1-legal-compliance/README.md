# P-IE-LAUNCH — Track 1: Legal & Compliance Reality Build

**Status:** Founder sign-off complete (20 Aug 2026). **LDRA-A3 + A4 closed** (20 Aug 2026, VPS verification). **Not externally legally verified.**  
**Scope:** Ireland launch legal/compliance — **no product behaviour changes, no gates, no deploy** in this track  
**Source of truth for behaviour:** live deployed codebase + deployed architecture (not aspirational policy)

**Sign-off model:** Internal risk acceptance — **not externally legally verified**. See [`TRACK-1-SELF-SIGNOFF-REPORT.md`](./TRACK-1-SELF-SIGNOFF-REPORT.md).

---

## Deliverables

### Public documents (English EEA family — IE uses same routes until overlay ships)

| Document | URL | File |
|----------|-----|------|
| EEA Privacy Notice | `/en/eea/privacy` | `public/en/eea-privacy.html` |
| EEA Terms of Service | `/en/eea/terms` | `public/en/eea-terms.html` |
| Child Privacy Notice | `/en/eea/child-privacy` | `public/en/eea-child-privacy.html` |
| Tracking / privacy choices | `/en/tracking-choices` | `public/en/tracking-choices.html` |

Routing: `src/lib/legal-routing.js` · IE + en-GB → EEA family (`status: placeholder` until **internal sign-off** flips to `live` in a later PR).

### Internal registers (`internal/`)

| Register | File |
|----------|------|
| Implementation baseline (code facts) | [`implementation-baseline.md`](./implementation-baseline.md) |
| **Legal decisions & risk acceptance** | [`LEGAL_DECISIONS_AND_RISK_ACCEPTANCE.md`](./LEGAL_DECISIONS_AND_RISK_ACCEPTANCE.md) |
| **Self-signoff report** | [`TRACK-1-SELF-SIGNOFF-REPORT.md`](./TRACK-1-SELF-SIGNOFF-REPORT.md) |
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

---

## Principles (Track 1)

1. **Reality first** — describe what the app actually does today (verified in code).
2. **Minimal launch package** — complete enough for Ireland RC prep, not a generic policy library.
3. **Internal risk acceptance** — interpretive legal questions documented in [`LEGAL_DECISIONS_AND_RISK_ACCEPTANCE.md`](./LEGAL_DECISIONS_AND_RISK_ACCEPTANCE.md) with residual risk levels; external counsel optional.
4. **No gates / no deploy** — documents only; `market_ie_open` stays OFF.

---

## Known gaps

| Gap | Status |
|-----|--------|
| Processor/hosting verification (LDRA-A3) | ✅ **Closed** 2026-08-20 — VPS SSH verified |
| Transfer mechanisms filed (LDRA-A4) | ✅ **Closed** 2026-08-20 — vendor DPA/SCC links filed |
| RevenueCat prod enablement | **Open** — commercial track (not A3/A4 blocker) |
| Child wellbeing fields in Swedish privacy | Optional future SE update — LDRA-A2 Art. 9 guardrails apply in product regardless |

EEA English documents reflect **code reality**. Swedish `/privacy` cookies and hosting claim aligned in this PR.

---

## Internal sign-off checklist

Track 1 is launch-ready when:

- [x] No **HIGH** unresolved risks in [`LEGAL_DECISIONS_AND_RISK_ACCEPTANCE.md`](./LEGAL_DECISIONS_AND_RISK_ACCEPTANCE.md)
- [x] LDRA-A3 processor/hosting facts verified and filed
- [x] LDRA-A4 transfer mechanisms documented
- [x] Public docs match verified implementation
- [x] Child lawful bases documented
- [x] Irish IAP disclosures match paywall (commercial track)
- [x] Founder/controller sign-off on [`TRACK-1-SELF-SIGNOFF-REPORT.md`](./TRACK-1-SELF-SIGNOFF-REPORT.md) (20 Aug 2026)
- [ ] `resolveLegalRoutes()` `placeholder` → `live` (separate PR — **not** in Track 1)
- [ ] Commercial/store track + Ireland RC complete before `market_ie_open ON`

---

## Related

- `docs/international-expansion-v1-engineering-spec.md` (P-EEA framework)
- `docs/adr/ADR-018-family-market-jurisdiction.md`
- `src/lib/legal-routing.js`, `src/routes/family/account.js`, `src/routes/account/export.js`
