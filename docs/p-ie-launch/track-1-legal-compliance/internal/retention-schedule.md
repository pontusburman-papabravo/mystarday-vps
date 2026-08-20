# Retention Schedule

**Controller:** Papa Bravo AB · **Version:** 0.1 · **Date:** August 2026  
**Source:** code + [`implementation-baseline.md`](../implementation-baseline.md)

---

| Data category | Retention period | Trigger / mechanism | After retention |
|---------------|------------------|---------------------|-----------------|
| Parent & child account data | Until account deletion | User-initiated delete | Hard delete per `account.js` |
| Schedules, logs, stars, rewards | Until account deletion | Same transaction | Deleted |
| `analytics_events` (family-scoped) | Until account deletion | Deleted in delete-account | Removed |
| `analytics_daily_snapshots` | Indefinite aggregate | No family_id | Aggregate metrics only |
| `notification_log` | ~7 days | Midnight scheduler prune | Deleted |
| Refresh tokens | ~30 days TTL | Expiry | Invalid for auth |
| Professional share links | 7 days default (+ revoke) | `expires_at` / parent revoke | Link invalid |
| Email verification / password reset tokens | Short TTL | Auth flows | Expired rows |
| `contact_message` (support) | 3 years (internal default) | Not deleted on family delete | LDRA-B3 accepted |
| `admin_audit_log` | 7 years (internal default) | Not deleted on family delete | LDRA-B3 accepted |
| `win_back_email_log` | Deleted with parent on family delete | `account.js` | Removed |
| Cookie consent record | 1 year | `cc_consent` cookie | Re-prompt or renew |
| Newsletter opt-out tokens | Until unsubscribe + 30 days | `email_subscriptions` | Purged |
| PIN audit log | Until account deletion | Child scoped | Deleted with child |
| DB deploy snapshots (ops) | Ops policy (30 days rolling) | VPS `data/deploy/snapshots` | Not user data export |

---

## Erasure exceptions (documented)

On `DELETE /api/family/delete-account`:

- **Deleted:** operational family data including children, content, tokens, family-scoped analytics.
- **Not deleted:** `admin_audit_log`, `contact_message`, aggregated snapshots.

Disclosed in EEA and Swedish privacy notices.

---

## Review

Update when: new tables, new marketing tools, or statutory retention requirement changes.
