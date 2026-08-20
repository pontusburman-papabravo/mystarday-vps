# Runbook — Data Subject Access Requests (DSAR)

**Version:** 0.1 · **Applies to:** Papa Bravo AB / My Starday · **Ireland & EEA**

---

## 1. Intake channels

| Channel | Action |
|---------|--------|
| `/en/contact` form | Primary |
| Email to controller **`LEGAL_REVIEW_REQUIRED`** dedicated privacy inbox | Route to privacy owner |
| In-app | Direct user to Settings or contact |

**SLA:** **`LEGAL_REVIEW_REQUIRED`** (typically 30 days GDPR / 1 month)

---

## 2. Verify identity

| User type | Verification |
|-----------|--------------|
| Logged-in parent | Session + optional password re-auth for sensitive requests |
| Non-account email request | **`LEGAL_REVIEW_REQUIRED`** — verify ownership before export |

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
3. Run export path or admin tooling **`LEGAL_REVIEW_REQUIRED`** — no ad-hoc SQL on prod without founder approval.
4. Redact other family members if multi-parent **`LEGAL_REVIEW_REQUIRED`** policy.
5. Deliver encrypted channel **`LEGAL_REVIEW_REQUIRED`**.

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

**`LEGAL_REVIEW_REQUIRED`:** Maintain internal register (date, requester, type, outcome, deadline).

---

## 7. Escalation

Privacy counsel if: child direct request, legal hold, law enforcement, or cross-border complexity.
