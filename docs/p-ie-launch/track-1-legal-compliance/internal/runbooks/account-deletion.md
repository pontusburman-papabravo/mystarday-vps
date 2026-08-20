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
| `admin_audit_log` | Admin audit |
| `contact_message` | Support/legal retention |
| `analytics_daily_snapshots` | Aggregated, no family_id |

Disclose in privacy notice. **`LEGAL_REVIEW_REQUIRED`** statutory periods.

---

## 4. Support-assisted deletion

If user cannot log in:

1. Verify identity **`LEGAL_REVIEW_REQUIRED`** procedure.
2. Founder/admin manual deletion **`LEGAL_REVIEW_REQUIRED`** — no self-service admin delete documented in Track 1.
3. Confirm email when complete.

---

## 5. Post-deletion verification

| Check | How |
|-------|-----|
| Login fails | Attempt `/api/auth/login` |
| Family gone | DB query on prod **`LEGAL_REVIEW_REQUIRED`** access policy |
| IAP | **`LEGAL_REVIEW_REQUIRED`** RevenueCat customer cleanup |

---

## 6. Timing

Deletion is **immediate** on success response — no cooling-off queue in code.

---

## 7. Related

- DSAR: [`dsar.md`](./dsar.md)
- Retention: [`../retention-schedule.md`](../retention-schedule.md)
