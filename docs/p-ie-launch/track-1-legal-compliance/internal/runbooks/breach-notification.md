# Runbook — Personal data breach notification

**Version:** 0.1 · **Status:** Internal template — LDRA-B6 accepted (not externally legally verified)

---

## 1. Definition trigger

Activate when personal data breach is suspected or confirmed: confidentiality, integrity, or availability compromise affecting My Starday user data.

---

## 2. Immediate response (0–24h)

| Step | Owner | Action |
|------|-------|--------|
| 1 | On-call / founder | Contain: rotate secrets, disable compromised admin accounts, block IPs if attack |
| 2 | Engineering | Preserve logs: systemd application logs, nginx, DB audit trail |
| 3 | Privacy lead (founder) | Classify data categories & number of users affected |
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

Document timeline in incident record (internal template TBD).

---

## 4. Notification obligations

| Audience | Threshold | Deadline |
|----------|-----------|----------|
| **Lead SA (IMY)** | If risk to rights/freedoms (Art. 33) | 72 hours of awareness |
| **DPC (Ireland)** | If Irish users affected and risk to rights/freedoms | 72 hours of awareness |
| **Affected users** | High risk to individuals (Art. 34) | Without undue delay |
| **Processors** | As per DPA | Per contract |

---

## 5. User communication template (draft)

> We are writing to inform you of a security incident affecting My Starday. [Describe what happened]. [Describe data types]. [Actions taken]. [Steps users should take]. Contact: `/en/contact`.

Founder reviews before send. Engage external counsel only if HIGH-risk or regulator contact.

---

## 6. Post-incident

- Root cause analysis
- Update DPIA / RoPA if new risk
- Processor review
- Report to board if material

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
| Engineering | Founder / on-call |
| Privacy owner | Founder |
| DPC | https://www.dataprotection.ie |
| IMY | https://www.imy.se |
