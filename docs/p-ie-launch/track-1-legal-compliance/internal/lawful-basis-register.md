# Lawful Basis Register — My Starday (EEA / Ireland)

**Version:** 0.1 · **Date:** August 2026  
**Controller:** Papa Bravo AB

Legend: **C** = Contract · **L** = Legitimate interests · **CO** = Consent · **LG** = Legal obligation · **RV** = **`LEGAL_REVIEW_REQUIRED`**

---

| # | Processing activity | Data categories | Data subjects | Basis | Explanation (code/product fact) | RV |
|---|---------------------|-----------------|---------------|-------|----------------------------------|-----|
| 1 | Parent account & auth | Email, name, password hash, OAuth IDs | Parents | **C** | Required to provide registered service | |
| 2 | Family jurisdiction | country_code, market_region, timezone, locale | Parents | **C** | Required for correct legal terms, schedules, gates | |
| 3 | Child profile & PIN login | Nickname, emoji, username, PIN hash, optional birthday/avatar | Children (via parent) | **C** / **RV** | Core child view; parent creates account | **RV:** child-specific basis wording for IE |
| 4 | Schedules, completions, stars | Activity logs, schedules, rewards | Children + parents | **C** | Core app functionality | |
| 5 | Transactional email | Email, name | Parents | **C** | Verification, password reset, account messages | |
| 6 | Push notifications | Device tokens, preferences | Parents | **CO** | Opt-in subscription in settings | |
| 7 | Optional web analytics (GA4) | Client events, consent state | Website visitors / parents | **CO** | Default denied until banner opt-in | |
| 8 | Optional marketing tags (Meta, Google Ads) | Cookie IDs, page events | Website visitors | **CO** | Default denied | |
| 9 | Product analytics (`analytics_events`) | family_id UUID, event_type, metadata | Families (parents) | **L** / **RV** | Service improvement; deleted on erasure | **RV:** confirm LI balancing test documented |
| 10 | Newsletter / marketing email | Email, opt-in token | Parents | **CO** | `email_subscriptions` | |
| 11 | Win-back email | Parent email, child first name in template | Lapsed parents | **L** / **RV** | Re-engagement; can opt out | **RV:** marketing vs service email classification |
| 12 | Professional share link | Selected child stats, optional PIN | Children (disclosed by parent) | **C** + **CO** (parent action) | Parent-initiated disclosure | |
| 13 | Pedagog notes / observations | Mood, sleep, meals, notes | Children | **C** / **RV** | Optional parent/pedagog feature | **RV:** sensitivity if health-adjacent |
| 14 | IAP / subscriptions | rc_customer_id, entitlement status | Parents | **C** | Access to paid features | |
| 15 | Support contact form | Name, email, message | Any visitor | **L** / **C** | Respond to inquiry | **RV** |
| 16 | Security logging | IP in some forms (waitlist/professional interest) | Visitors | **L** | Abuse prevention | **RV:** confirm fields & retention |
| 17 | Admin audit log retention after delete | Metadata may reference deleted family | Admins | **LG** / **L** | Security audit | **RV** |
| 18 | Account deletion | All family data | Parents | **C** (facilitating erasure request) | Art. 17 fulfilment | |

---

## Items requiring Legitimate Interest Assessment (LIA)

| ID | Activity | RV |
|----|----------|-----|
| 9 | Internal product analytics | **`LEGAL_REVIEW_REQUIRED`** — document LIA, opt-out if required |
| 11 | Win-back emails | **`LEGAL_REVIEW_REQUIRED`** |
| 15 | Support retention | **`LEGAL_REVIEW_REQUIRED`** |
| 16 | IP in lead forms | **`LEGAL_REVIEW_REQUIRED`** |

---

## Sign-off

External counsel to confirm basis table for Ireland launch and update public Privacy Notice Article 13/14 disclosures accordingly.
