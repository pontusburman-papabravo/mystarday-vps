# Lawful Basis Register — My Starday (EEA / Ireland)

**Version:** 0.1 · **Date:** August 2026  
**Controller:** Papa Bravo AB

Legend: **C** = Contract · **L** = Legitimate interests · **CO** = Consent · **LG** = Legal obligation · **LDRA** = see [`LEGAL_DECISIONS_AND_RISK_ACCEPTANCE.md`](../LEGAL_DECISIONS_AND_RISK_ACCEPTANCE.md)

---

| # | Processing activity | Data categories | Data subjects | Basis | Explanation (code/product fact) | LDRA |
|---|---------------------|-----------------|---------------|-------|----------------------------------|------|
| 1 | Parent account & auth | Email, name, password hash, OAuth IDs | Parents | **C** | Required to provide registered service | |
| 2 | Family jurisdiction | country_code, market_region, timezone, locale | Parents | **C** | Required for correct legal terms, schedules, gates | |
| 3 | Child profile & PIN login | Nickname, emoji, username, PIN hash, optional birthday/avatar | Children (via parent) | **C** | Parent is contractual counterparty; child view under parent account | A1 |
| 4 | Schedules, completions, stars | Activity logs, schedules, rewards | Children + parents | **C** | Core app functionality — not child consent | A1 |
| 5 | Transactional email | Email, name | Parents | **C** | Verification, password reset, account messages | |
| 6 | Push notifications | Device tokens, preferences | Parents | **CO** | Opt-in subscription in settings | |
| 7 | Optional web analytics (GA4) | Client events, consent state | Website visitors / parents | **CO** | Default denied until banner opt-in | |
| 8 | Optional marketing tags (Meta, Google Ads) | Cookie IDs, page events | Website visitors | **CO** | Default denied | |
| 9 | Product analytics (`analytics_events`) | family_id UUID, event_type, metadata | Families (parents) | **L** | Service improvement; deleted on erasure; pseudonymised | B1 |
| 10 | Newsletter / marketing email | Email, opt-in token | Parents | **CO** | `email_subscriptions` | |
| 11 | Win-back email | Parent email, child first name in template | Lapsed parents | **L** | Re-engagement; can opt out | B2 |
| 12 | Professional share link | Selected child stats, optional PIN | Children (disclosed by parent) | **C** + parent action | Parent-initiated disclosure | B4 |
| 13 | Pedagog notes / observations | Mood, sleep, meals, notes, free text | Children | **C** (routine notes only) | Optional parent/pedagog feature — **not** positioned as health-data collection | A2 |
| 14 | IAP / subscriptions | rc_customer_id, entitlement status | Parents | **C** | Access to paid features | A6 |
| 15 | Support contact form | Name, email, message | Any visitor | **L** / **C** | Respond to inquiry | B3 |
| 16 | Security logging | IP in some forms (waitlist/professional interest) | Visitors | **L** | Abuse prevention | |
| 17 | Admin audit log retention after delete | Metadata may reference deleted family | Admins | **LG** / **L** | Security audit | B3 |
| 18 | Account deletion | All family data | Parents | **C** (facilitating erasure request) | Art. 17 fulfilment | |

---

## Legitimate Interest Assessments (internal)

| ID | Activity | LDRA | Summary |
|----|----------|------|---------|
| 9 | Internal product analytics | B1 | Family UUID pseudonymisation, whitelist, delete on erasure — MEDIUM risk accepted |
| 11 | Win-back emails | B2 | Service re-engagement with opt-out — MEDIUM risk accepted |
| 15–17 | Support / audit retention | B3 | Disclosed exceptions — LOW risk accepted |

---

## Article 9 guardrails (LDRA-A2)

Optional `pedagog_notes` / `child_observation` (mood, sleep, behaviour, free text):

- **Ireland V1:** Product does **not** solicit diagnoses, medical information, or other special-category data.
- **If content is Article 9 health data:** Art. 6 contract **alone** is not sufficient — an Art. 9(2) exception would be required before treating such collection as lawful.
- **Voluntary free-text health content:** Enhanced protection — never analytics, marketing, profiling, or AI inference.
- **Before any feature explicitly collects health data:** Separate Art. 9 decision + Art. 9(2) exception required.

---

## Sign-off

Internal acceptance per [`TRACK-1-SELF-SIGNOFF-REPORT.md`](../TRACK-1-SELF-SIGNOFF-REPORT.md). Not externally legally verified.
