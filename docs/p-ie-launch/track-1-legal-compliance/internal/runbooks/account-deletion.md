# Runbook — Account deletion

**Version:** 0.1 · **Verified against:** `src/routes/family/account.js` (August 2026)

---

## 1. User-initiated deletion (primary path)

| Step | Detail |
|------|--------|
| Entry | App **Settings → Delete account** (parent session only) |
| API | `DELETE /api/family/delete-account` |
| Auth | Parent JWT + CSRF token |
| Child sessions | Blocked by `requireParent` |

User must confirm with password or OAuth re-auth per UI flow.

---

## 2. Data removed (family scope)

Single DB transaction deletes (non-exhaustive — see code):

- Children, parents, schedules, daily logs, rewards, redemptions
- Push subscriptions, refresh tokens, notification preferences/logs (parent)
- PIN lockout/audit, pedagog notes, observations, share links
- Family invites, system messages, email subscriptions
- **`analytics_events` WHERE family_id**
- Avatars (R2/local via `deleteAvatarsForFamily`)
- Family row last

Cookies cleared: `access_token`, `refresh_token`, `token`.

---

## 3. Data **not** removed

| Data | Reason |
|------|--------|
| `admin_audit_log` | Admin audit (LDRA-B3) |
| `contact_message` | Support retention (LDRA-B3) |
| `analytics_daily_snapshots` | Aggregated, no family_id |

Disclosed in privacy notices.

---

## 4. Support-assisted deletion

If user cannot log in:

1. Verify identity (reply from registered email).
2. Founder manual deletion — no self-service admin delete in Track 1.
3. Confirm email when complete.

---

## 5. Post-deletion verification

| Check | How |
|-------|-----|
| Login fails | Attempt `/api/auth/login` |
| Family gone | DB query on prod (founder access only) |
| IAP | RevenueCat customer cleanup — LDRA-C5 (verify RC API on delete) |

---

## 6. Timing

Deletion is **immediate** on success response — no cooling-off queue in code.

---

## 7. Related

- DSAR: [`dsar.md`](./dsar.md)
- Retention: [`../retention-schedule.md`](../retention-schedule.md)
