# 010 — Release Command

**Role:** Cross-functional release authority — ship cadence, go/no-go, coordination.  
**Composition:** Release owner (chair), QA Director (veto), CTO (technical), CPO (scope), CEO (exception only).

This is the **operating manual for getting trustworthy releases out** — not a deploy runbook (see AGENTS.md + AOS Release role for commands).

---

## Mission

Ship **predictable, reversible releases** that never trade child trust for calendar pressure.

Release Command is the last human-aligned gate before families receive changes.

---

## Core principles

1. **QA veto on P0/P1** — non-negotiable.
2. **Scope frozen at code freeze** — only release blockers after.
3. **Reversible** — feature flags preferred; DB migrations backward-safe; SW cache version bumped.
4. **One release train** — avoid orphan hotfix culture; batch with discipline.
5. **Communicate** — admin-visible changes noted; dagens nyhet if user-facing delight.
6. **No Friday deploys** (Europe/Stockholm) unless P0 fix — rollback capacity reduced.
7. **POS §15 satisfied** — quality standard not abbreviated for speed.
8. **Deploy path** — merge to `main` → GitHub Actions preferred; manual VPS fallback documented in AGENTS.md.

---

## Decision framework

### Release types

| Type | Scope | Process |
|------|-------|---------|
| **Standard** | Planned sprint batch | Full matrix |
| **Hotfix** | P0/P1 prod | Abbreviated; QA + CTO only; CEO notify |
| **Config-only** | Flags, copy, admin | QA smoke + allowlist check |
| **Migration** | DB schema | CTO extra review; backup confirm |

### Go / no-go checklist

| # | Gate | Owner | Required |
|---|------|-------|----------|
| 1 | test:gate green | CTO | ✅ |
| 2 | P0/P1 = 0 | QA Director | ✅ veto |
| 3 | Manual child path pass | QA | ✅ |
| 4 | SW/cache version bumped if static | Release | ✅ |
| 5 | Migration applied staging | CTO | if applicable |
| 6 | Rollback plan stated | CTO | ✅ |
| 7 | Scope matches PR / release notes | CPO | ✅ |
| 8 | Analytics events verified | Analytics | if new events |
| 9 | No open security findings | Security | ✅ |
| 10 | CEO exception | CEO | only if skipping 2–3 |

### Code freeze rules

- **T-48h:** feature freeze; only bugfixes.
- **T-24h:** test:gate must be green.
- **T-2h:** go/no-go meeting (async acceptable if all ✅).
- **T-0:** deploy; health check; smoke.

### Rollback triggers (first 30 minutes)

- Health check fail
- Error rate spike (>2× baseline)
- P0/P1 reported internally
- Auth or stars/rewards integrity doubt

**Action:** revert deploy or flip flag; incident channel; postmortem within 48h.

---

## Quality bar

- Every standard release has **written release notes** (internal minimum; user-facing for visible changes).
- **Health:** `GET /health` 200 after deploy (+ sleep 3s on VPS per deploy rule).
- **Zero** known child-facing regressions.
- **Post-release smoke** within 15 minutes on prod (read-only paths).
- **Hotfix** within 24h of P0 if discovered post-ship.

---

## Anti-patterns

| Anti-pattern | Result |
|--------------|--------|
| "Just this once" skip QA | Incidents |
| Release without SW bump | Stale client caches |
| Multiple unrelated changes one hotfix | Hard rollback |
| Deploy Friday 17:00 CET | Weekend firefight |
| CEO overrides P0 ship | Trust collapse — document dissent |
| Skip health check | Blind deploy |
| Migration without rollback script | Extended outage |
| Release Command = one engineer alone | Missing veto voices |

---

## Escalation rules

| Situation | Path |
|-----------|------|
| QA veto vs CEO date | CEO may delay, not force P0 ship |
| CTO can't rollback | Pause deploy; fix plan first |
| Scope creep at freeze | CPO cuts or slips release |
| Prod incident | Hotfix track; Release chair coordinates |
| Third-party outage (Neon, R2) | CTO; communicate status page if needed |

---

## KPIs

| Metric | Target |
|--------|--------|
| Release success rate (no rollback) | ↑ >95% |
| P0 escape to prod | 0 |
| Mean time to rollback when needed | <15 min |
| Releases meeting full checklist | 100% standard |
| Hotfix rate | ↓ trend |
| Post-release incident count | ↓ |
| Time from merge to prod (standard) | Stable, not rushed |

---

## Examples of good decisions

**Good:** Slip release 24h for onboarding P1 — QA veto honored.

**Good:** Split DB migration to prior release — reduce combined risk.

**Good:** Bump SW v322 with SEO pages — cache coherence.

**Good:** Post-deploy smoke: child-login + star on prod read path.

**Good:** Hotfix Apple Sign In iPad only — scoped PR, full auth regression.

---

## Examples of bad decisions

**Bad:** Ship admin-only broken JS that blocks entire admin panel parse — user-facing ops impact.

**Bad:** Batch 40 frontend changes without SW version — users on old bundle.

**Bad:** Run full test suite on live VPS with email keys — operational anti-pattern per AGENTS.md.

**Bad:** Force release with open star desync bug — data integrity P0.

**Bad:** Skip co-parent smoke because "unchanged" — shared regression risk.

---

## Release Command meeting agenda (template)

1. **Version / tag** — name and scope
2. **QA report** — matrix results, open defects
3. **CTO report** — migrations, infra, rollback
4. **CPO report** — user-visible changes, support prep
5. **Analytics** — new events verified (if any)
6. **Go / no-go** — explicit vote; QA veto recorded
7. **Post-deploy owner** — who watches 30 min

---

## Relationship to POS & AOS

| Layer | Release Command uses |
|-------|---------------------|
| POS §15 | Quality gate |
| AOS Release role | Technical steps |
| 007_QA | Veto authority |
| 003_CTO | Technical go |
| 002_CPO | Scope truth |
| 001_CEO | Exception only |
| AGENTS.md | Environment, health, deploy targets |

**Hierarchy reminder:** POS > COS (this doc) > AOS > code.

---

## Review checklist (self)

- [ ] All ten checklist gates assigned owners
- [ ] No contradiction with QA Director veto policy
- [ ] Rollback documented for this release
- [ ] Aligned with Definition of Done (AOS 190)
