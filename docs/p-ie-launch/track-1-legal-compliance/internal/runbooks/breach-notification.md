# Runbook — Personal data breach notification

**Version:** 0.1 · **Status:** Template — **`LEGAL_REVIEW_REQUIRED`** for legal sign-off

---

## 1. Definition trigger

Activate when personal data breach is suspected or confirmed: confidentiality, integrity, or availability compromise affecting My Starday user data.

---

## 2. Immediate response (0–24h)

| Step | Owner | Action |
|------|-------|--------|
| 1 | On-call / founder | Contain: rotate secrets, disable compromised admin accounts, block IPs if attack |
| 2 | Engineering | Preserve logs: systemd application logs, nginx, DB audit **`LEGAL_REVIEW_REQUIRED`** |
| 3 | Privacy lead | Classify data categories & number of users affected |
| 4 | Engineering | Assess if child data involved — escalate priority |

Reference: [`docs/ops-incident-runbook.md`](../../../ops-incident-runbook.md) for technical kill switches.

---

## 3. Assessment (24–72h)

| Question | Notes |
|----------|-------|
| Risk to individuals? | High if child data, credentials, or large-scale exposure |
| Processor breach? | Notify processor; they may have parallel obligations |
| Encrypted data? | Key compromise = breach |
| Can data be restored? | Ransomware / integrity breach |

Document timeline in incident record **`LEGAL_REVIEW_REQUIRED`** template.

---

## 4. Notification obligations

| Audience | Threshold | Deadline |
|----------|-----------|----------|
| **DPC (Ireland)** | If risk to rights/freedoms | 72 hours of awareness **`LEGAL_REVIEW_REQUIRED`** |
| **IMY (Sweden)** | If controller established SE | **`LEGAL_REVIEW_REQUIRED`** lead authority |
| **Affected users** | High risk to individuals | Without undue delay **`LEGAL_REVIEW_REQUIRED`** |
| **Processors** | As per DPA | **`LEGAL_REVIEW_REQUIRED`** |

---

## 5. User communication template (draft)

> We are writing to inform you of a security incident affecting My Starday. [Describe what happened]. [Describe data types]. [Actions taken]. [Steps users should take]. Contact: `/en/contact`.

**`LEGAL_REVIEW_REQUIRED`:** Counsel must approve before send.

---

## 6. Post-incident

- Root cause analysis
- Update DPIA / RoPA if new risk
- Processor review
- **`LEGAL_REVIEW_REQUIRED`** report to board

---

## 7. Preventive controls (existing)

- HTTPS, authz hardening flag `AUTHZ_HARDENING_ENABLED`
- Rate limiting
- CSRF on destructive routes
- No passwords in logs (verify in incident)

---

## 8. Contacts

| Role | Contact |
|------|---------|
| Engineering | Founder / on-call **`LEGAL_REVIEW_REQUIRED`** |
| Privacy counsel | **`LEGAL_REVIEW_REQUIRED`** |
| DPC | https://www.dataprotection.ie |
