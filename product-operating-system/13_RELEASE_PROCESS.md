# 13 — Release Process

**Version:** 1.0  
**Authority:** How software reaches families safely

---

## Purpose

Define the release pipeline from merge to live users (web + native), including rollback, flags, and post-deploy verification.

## Scope

Web/VPS deploy via GitHub Actions, native iOS/Android release coordination, cache/service worker, database migrations.

## Definitions

| Term | Definition |
|------|------------|
| **main** | Release branch (live deploy) |
| **Deploy workflow** | `.github/workflows/deploy.yml` |
| **CI workflow** | `.github/workflows/ci.yml` |
| **SW** | Service worker `public/sw.js` CACHE_NAME |
| **Rollout** | Feature flag wave — `journey-rollout-advance.js` |

---

## Release North Star

> Families never see broken routines because we skipped CI or migration verification.

---

## Current State (verified)

### Pipeline

```
PR → CI (lint, css check, migrate, test:gate, migration rollback)
Merge to main → CI success triggers deploy workflow
Deploy SSH → git reset --hard → npm ci → migrate → systemd restart
Health: sleep 3 → curl /health (retries)
```

**Note:** Deploy triggers on **CI success**, not raw push alone.

### Build

`npm run build` = migrate + Tailwind CSS build (`scripts/css-build.mjs`)

### Native (iOS)

- Capacitor remote WebView — **web deploy IS app deploy** for UI
- Native binary required for: plugins, App Store review, push entitlements
- iOS patches: Apple Sign-In main thread — Podfile post_install
- Commands: `npm run cap:sync:ios`, Xcode archive, TestFlight

### Native (Android)

- `android/` generated — not in repo
- `npm run cap:sync:android`, `npm run android:aab`

### Cache busting

Commit `tailwind.build.css` + bump `public/sw.js` CACHE_NAME — CI enforces via `check:css`

### Ops reference

`AGENTS.md`, `.cursor/rules/*-deploy.mdc`, `docs/VPS-DEPLOY-GITHUB-ACTIONS.md`

---

## Target State

| Area | Target |
|------|--------|
| **Staging env** | Flag QA before prod waves |
| **Automated health** | Post-deploy smoke in workflow |
| **Gate expansion** | Matches [12_QA_SYSTEM.md](./12_QA_SYSTEM.md) |
| **Release notes** | Auto from PR labels + pillar tags |
| **Native cadence** | Decoupled binary releases documented |
| **Rollback** | One-command git revert + migrate down policy |

---

## Release Rules

**REL-01** No direct push to main without CI.  
**REL-02** Migrations must be backward-compatible for one deploy (rollback gate).  
**REL-03** SW version bump on any static JS/CSS change.  
**REL-04** Journey flag changes follow journey ops runbook in `docs/`.  
**REL-05** Native plugin changes require mobile QA gate.  
**REL-06** Email-heavy releases unset email API keys in test runs (see AGENTS.md).  
**REL-07** Post-deploy: health check + journalctl spot check.  
**REL-08** Version in `/health` should match release tag — Target (currently static).  
**REL-09** Constitution spot-check for UX releases — [12_QA_SYSTEM.md](./12_QA_SYSTEM.md).

---

## Release Types

| Type | Path |
|------|------|
| **Web hotfix** | PR → CI → auto deploy |
| **Schema change** | Migration + rollback test + deploy |
| **Flag rollout** | Admin/CLI rollout + monitor |
| **Native build** | Web deploy + binary submit when plugins change |
| **POS doc only** | No deploy required |

---

## Rollback

1. Revert commit on main (or reset to known good SHA)
2. Deploy pipeline runs automatically
3. If migration irreversible — restore DB backup (manual ops)
4. Disable feature flag if flag-related incident

---

## Pre-merge Checklist

- [ ] CI green
- [ ] test:gate locally for server changes
- [ ] check:css if Tailwind touched
- [ ] Migration reviewed for locking/downtime
- [ ] SW bumped if static changed
- [ ] Decision Log if architectural
- [ ] PR cites POS sections

---

## Post-deploy Checklist

- [ ] `GET /health` returns healthy
- [ ] Login smoke (parent + child)
- [ ] Journey flag state as intended
- [ ] Error rate in logs normal (5 min)
- [ ] Native: TestFlight smoke if binary changed

---

## Anti-patterns

- Deploy without migrate
- Bump only SW without rebuilding CSS when classes changed
- Enable journey flags without removing legacy coach mounts
- Manual VPS edit without commit to main

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [12_QA_SYSTEM.md](./12_QA_SYSTEM.md) | Test gates |
| [10_TECH_ARCHITECTURE.md](./10_TECH_ARCHITECTURE.md) | Stack |
| [11_AI_DEVELOPER_GUIDE.md](./11_AI_DEVELOPER_GUIDE.md) | Agent deploy rules |
| [14_DECISION_LOG.md](./14_DECISION_LOG.md) | Deploy ADRs |

---

## AI Instructions

Never SSH to prod for deploy if GitHub Actions available. After VPS restart: sleep 3, curl health per AGENTS.md.

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | Rollback clarity reduces incident fear |
| **CPO** | Flag rollout tied to ops doc |
| **CTO** | Pipeline matches workflows |
| **Principal Engineer** | REL-02 rollback gate referenced |
| **Senior Game Designer** | N/A |
| **UX Director** | Constitution check on UX release |
| **Art Director** | CSS/SW coupling documented |
| **QA Director** | Checklists complete |
| **Security Engineer** | No manual uncommitted prod edits |
| **AI Systems Architect** | Clear REL rules for agents |

**Approved:** All roles — v1.0.
