# RoPA — Record of Processing Activities

**Controller:** Papa Bravo AB · **Version:** 0.1 · **Date:** August 2026  
**Scope:** Processing relevant to Ireland (`country_code=IE`) — same processing stack as SE/EU today

---

## Controller contact

| Field | Value |
|-------|-------|
| Name | Papa Bravo AB |
| Contact | `/en/contact` (public) |
| DPO | Not mandatory at current scale (LDRA-B5) — founder handles privacy |

---

## Processing activities summary

| Ref | Activity | Purpose | Categories of data subjects | Key data | Recipients | Transfers | Retention | Security |
|-----|----------|---------|----------------------------|----------|------------|-----------|-----------|----------|
| P-01 | Account registration & login | Provide service | Parents | Email, name, auth credentials | Processors (Neon, Resend) | See transfer register | Until delete | HTTPS, bcrypt |
| P-02 | Child profile management | Child routine UX | Children | Nickname, emoji, PIN, optional avatar/birthday | Neon, R2 | See transfer register | Until delete | Authz, PIN lockout |
| P-03 | Routines & rewards | Core product | Children, parents | Schedules, logs, stars | Neon | See LDRA-A3 | Until delete | Role-based access |
| P-04 | Push notifications | Alerts to parents | Parents | Push tokens | Apple APNs, Google FCM | LDRA-A4 | Until logout/delete | Token hygiene |
| P-05 | Transactional email | Account comms | Parents | Email, name | Resend | LDRA-A4 | Until delete | TLS |
| P-06 | Optional marketing/analytics cookies | Site measurement | Web visitors | Cookie IDs, page events | Google, Meta | LDRA-A4 (consent) | Consent store 1y | Consent default deny |
| P-07 | Product analytics | Improve product | Families (UUID) | event_type, metadata | Neon | EEA storage (verify A3) | Until family delete | No IP in beacon route |
| P-08 | IAP subscriptions | Paid access | Parents | rc_customer_id, status | RevenueCat, Apple, Google | LDRA-A4 | Until delete + statutory |
| P-09 | Professional share links | Parent-chosen disclosure | Children (via parent) | Selected stats | Anyone with link | May leave EEA if recipient abroad | 7d default | PIN optional |
| P-10 | Support & contact | Customer support | Users | Email, message | Internal, email | LDRA-B3 | See retention schedule | Access control |
| P-11 | Account export | GDPR access/portability | Parents | Full family export ZIP | Parent device only | N/A | Ephemeral download | Rate limit 24h |
| P-12 | Account deletion | GDPR erasure | Parents, children | All family data | None (deleted) | N/A | Immediate except audit tables | Transactional delete |

**LDRA** = see [`LEGAL_DECISIONS_AND_RISK_ACCEPTANCE.md`](../LEGAL_DECISIONS_AND_RISK_ACCEPTANCE.md)

---

## Technical & organisational measures (summary)

- Access control: parent/child/admin roles server-enforced
- Encryption in transit (HTTPS)
- Password/PIN hashing
- CSRF on destructive operations
- Optional maintenance mode; IAP webhook exempt for entitlement sync
- Incident runbook: [`runbooks/breach-notification.md`](./runbooks/breach-notification.md)

---

## Related registers

- Lawful basis: [`lawful-basis-register.md`](./lawful-basis-register.md)
- Processors: [`processor-register.md`](./processor-register.md)
- Transfers: [`transfer-register.md`](./transfer-register.md)
- Retention: [`retention-schedule.md`](./retention-schedule.md)
