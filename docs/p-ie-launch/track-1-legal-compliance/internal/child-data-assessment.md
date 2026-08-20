# Child Data Assessment — My Starday (Ireland)

**Version:** 0.1 · **Date:** August 2026  
**Scope:** Children using My Starday via parent-managed accounts in Ireland (EEA legal bucket)

---

## 1. Do we offer services to children?

**Yes.** Children authenticate with username + PIN in a dedicated child view (`/child-login`, child dashboard). Parents create and manage child profiles.

Children do **not** register independently; no child email collection.

---

## 2. Age & parental role

| Topic | Code / product fact | Assessment |
|-------|---------------------|------------|
| Target age | Family routine tool; no hard minimum age gate | **LDRA-A1 accepted:** Art. 8 consent threshold (16 in IE) applies only where we rely on **consent** for ISS offered directly to the child. Core processing = **contract** on parent account. |
| Parent as account holder | Parent registers, accepts terms, can delete entire family | Parent is contractual counterparty |
| Child assent | No separate child click-through acceptance flow | Parent-managed model documented in child privacy notice |

---

## 3. Data collected from / about children

| Category | Collected? | Notes |
|----------|------------|-------|
| Name (full) | No — first name/nickname only | `child.name` |
| Contact details | No | |
| Location | No GPS | |
| Photos | Optional avatar (parent upload) | R2/local |
| Routine completions | Yes | Core function |
| Stars / rewards | Yes | Core function |
| Health/diagnosis | Not requested in child UI | |
| Mood/sleep/behaviour | Optional, **parent/pedagog** forms in reports | LDRA-A2 — Art. 9 guardrails; not health-data positioning; enhanced protection if user writes sensitive content |

---

## 4. Uses involving children

| Use | Child data used? | Advertising? |
|-----|------------------|--------------|
| Display daily schedule | Yes | No |
| Star economy | Yes | No |
| Push to parent device | Parent data primarily | No child push targeting in code review |
| Web analytics (GA4) | Not tied to child session events in whitelist review | Consent-gated on **parent/marketing web** |
| Professional share link | Parent selects fields | Parent-initiated export |

**Code assertion:** `ALLOWED_CLIENT_EVENTS` and marketing scripts operate in parent/web context; no implementation found that sends child completion payloads to Meta/Google ad endpoints.

---

## 5. Children's rights

| Right | How supported |
|-------|---------------|
| Access | Parent export (`/api/account/export-data`) includes child activity CSVs |
| Erasure | Parent deletes account → all children deleted |
| Information | Child privacy notice `/en/eea/child-privacy` (plain language) |

Direct child requests (without parent): respond case-by-case; parent is primary account holder. Document in DSAR runbook.

---

## 6. Design standards (UK ICO Children's Code / Irish alignment)

| Standard | Status |
|----------|--------|
| Best interests | Product POS: child protagonist, no dark patterns (POS review separate) |
| Data minimisation | Implemented for child profile fields |
| Detrimental use | No streak punishment paywalls in scope doc |
| Parental controls | Parent manages all child config |
| Profiling / targeted ads | No child ad profiling in code |
| Nudge techniques | LDRA-C6 — POS review of celebrations/gamification |
| Connected toys / geolocation | N/A |

---

## 7. Conclusion

| Decision | Rationale |
|----------|-----------|
| **Accepted for Ireland launch prep** (LDRA-A1, A2) | Parent-mediated model; Art. 9 guardrails on optional observations; MEDIUM residual risk on voluntary free text |

**Blocker for `market_ie_open ON`:** commercial + RC + launch control — not external counsel.
