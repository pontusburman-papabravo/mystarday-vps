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
| Target age | Family routine tool; no hard minimum age gate in registration | **`LEGAL_REVIEW_REQUIRED`:** which child-processing activities rely on consent such that Article 8 and Ireland’s age-16 threshold applies? (see A1) |
| Parent as account holder | Parent registers, accepts terms, can delete entire family | Parent is contractual counterparty |
| Child assent | No separate child click-through acceptance flow | Covered under A1 — adequacy for Irish DPC expectations |

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
| Mood/sleep/behaviour | Optional, **parent/pedagog** forms in reports | `pedagog_notes`, `child_observation` — not child-entered |

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

**`LEGAL_REVIEW_REQUIRED`:** Whether child may exercise rights directly in IE and how to respond.

---

## 6. Design standards (UK ICO Children's Code / Irish alignment)

| Standard | Status |
|----------|--------|
| Best interests | Product POS: child protagonist, no dark patterns (POS review separate) |
| Data minimisation | Implemented for child profile fields |
| Detrimental use | No streak punishment paywalls in scope doc |
| Parental controls | Parent manages all child config |
| Profiling / targeted ads | No child ad profiling in code |
| Nudge techniques | **`LEGAL_REVIEW_REQUIRED`** review of celebrations/gamification for vulnerable children |
| Connected toys / geolocation | N/A |

---

## 7. Conclusion

| Decision | Rationale |
|----------|-----------|
| **Proceed with external child-data review** | Processing is parent-mediated and minimised, but Ireland launch requires counsel sign-off on age/consent model and optional wellbeing notes |

**Not a blocker for completing draft documents** — blocker for **`market_ie_open ON`**.
