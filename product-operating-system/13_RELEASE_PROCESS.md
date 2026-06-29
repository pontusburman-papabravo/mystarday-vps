# 13 — Release Process

**Version:** 2.0  
**Owner:** CTO + QA Director  
**Authority:** Safe path to families

---

## Purpose

Merge → CI → deploy → verify. Native binaries when plugins/permissions change.

---

## Pipeline (conceptual)

```
PR → CI (lint, css, migrate, test gate, migration rollback)
Merge main → deploy → migrate → restart → health check
Capacitor UI updates with web deploy; store binary when native changes
```

Detail: `AGENTS.md`, deploy workflows — operational, not product.

---

## Rules

**REL-01** No merge without CI  
**REL-02** Backward-compatible migrations one release  
**REL-03** Cache bust static assets on change  
**REL-04** Journey flag waves follow ops runbook  
**REL-05** Native plugin → mobile QA  
**REL-06** Email-heavy tests without live keys  
**REL-07** Post-deploy health + log spot check  
**REL-08** UX releases → constitution test ([12](./12_QA_SYSTEM.md))  
**REL-09** Must pass [15](./15_PRODUCT_QUALITY_STANDARD.md)

---

## Rollback

Revert on main → pipeline redeploys. Irreversible migration → DB restore procedure. Flag off for flag incidents.

---

## Checklists

**Pre-merge:** CI green · gate local if server · migration reviewed · quality standard · ADR if needed

**Post-deploy:** health · login smoke · flags as intended · logs clean · TestFlight if binary changed

---

## Anti-Patterns

Deploy without migrate · enable Journey without retiring duplicate coaches · uncommitted VPS edits

---

## AI Instructions

Prefer GitHub Actions deploy over manual SSH. Health check after restart per AGENTS.md.

---

## CXO Review Summary

All roles **10/10** — v2.0.
