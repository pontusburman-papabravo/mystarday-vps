# Runbook — Data Subject Access Requests (DSAR)

**Version:** 0.1 · **Applies to:** Papa Bravo AB / My Starday · **Ireland & EEA**

---

## 1. Intake channels

| Channel | Action |
|---------|--------|
| `/en/contact` form | Primary |
| Email to controller (privacy owner) | Route to founder |
| In-app | Direct user to Settings or contact |

**SLA:** 30 days (GDPR Art. 12 — one month)

---

## 2. Verify identity

| User type | Verification |
|-----------|--------------|
| Logged-in parent | Session + optional password re-auth for sensitive requests |
| Non-account email request | Verify ownership (reply from registered email, or ID check for erasure) |

Do not disclose child data to third parties without parent verification.

---

## 3. Self-service access (preferred)

| Tool | Details |
|------|---------|
| **Export** | Settings → Export data → `GET /api/account/export-data` |
| Output | ZIP with CSV files (profile, children, schedules, logs, rewards, ratings, manual stars) |
| Rate limit | 1 export per 24 hours per parent (`export.js`) |
| Locale | Export column headers use family `preferred_locale` |

Document in response: export may not include server logs, support tickets (`contact_message`), or admin audit entries.

---

## 4. Manual DSAR (if export insufficient)

1. Confirm account email matches requester.
2. Query family_id from `parent`.
3. Run export path or admin tooling — no ad-hoc SQL on prod without founder approval.
4. Redact other family members if multi-parent (policy: export is family-scoped to requesting parent).
5. Deliver via encrypted channel (password-protected ZIP or secure link).

---

## 5. Rights mapping

| Right | Response |
|-------|----------|
| Access | Export ZIP + link to privacy notice |
| Rectification | Guide to in-app settings |
| Erasure | [`account-deletion.md`](./account-deletion.md) |
| Restriction / object (marketing) | Cookie settings; unsubscribe link |
| Portability | Same as export (structured CSV) |
| Complaint | DPC (IE) / IMY (SE) — see overlay |

---

## 6. Log DSAR

Maintain internal register (date, requester, type, outcome, deadline) — LDRA-C2.

---

## 7. Escalation

Engage external counsel if: child direct request without parent, legal hold, law enforcement, or cross-border complexity beyond internal playbook.
