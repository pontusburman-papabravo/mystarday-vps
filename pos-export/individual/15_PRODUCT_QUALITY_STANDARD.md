# 15 — Product Quality Standard

**Version:** 2.0  
**Status:** Normative — nothing ships below this bar  
**Owner:** QA Director + CPO  
**Authority:** Equal to [00_PROJECT_CONSTITUTION.md](./00_PROJECT_CONSTITUTION.md) for release gate

---

## Purpose

Company quality manual. A feature, screen, or release that fails this document **does not ship** — regardless of sprint pressure.

## Scope

All user-facing changes: web, iOS, Android, copy, motion, audio, accessibility, security UX.

---

## Quality North Star

Every shipped experience must feel:

| Attribute | Meaning |
|-----------|---------|
| **Premium** | Intentional craft — [00B_PRODUCT_TASTE.md](./00B_PRODUCT_TASTE.md) |
| **Fast** | Responsive on 3-year-old phone; routine never waits on animation |
| **Calm** | No alarm colors, guilt, or noise — [00A_EXPERIENCE_MANIFESTO.md](./00A_EXPERIENCE_MANIFESTO.md) |
| **Warm** | Pixar-safe emotional tone |
| **Safe** | Child trust, PIN, data — Security |
| **Handcrafted** | Illustration and copy — [03A_ART_DIRECTION.md](./03A_ART_DIRECTION.md) |
| **Thoughtful** | One next step — Constitution |
| **Magical** | Quiet delight after real wins |

---

## Release Gate (all must pass)

### A. Product & experience

- [ ] **Constitution:** Rules 1–5 pass on affected flows
- [ ] **Manifesto:** Morning stress test (EM-06)
- [ ] **Taste:** Not on “cheap” list (00B)
- [ ] **One coach / one next step** on parent home (no competing authorities)
- [ ] **Child protagonist:** child acts; parent supports
- [ ] **Reality first:** completion before celebration

### B. Design & craft

- [ ] Art direction checklist (03A) — eyes, shadow, palette, room
- [ ] Motion tokens used; celebration ≤ 2 s; reduced-motion path
- [ ] Audio silent by default; no autoplay surprise (06A)
- [ ] Swedish copy review; no leaked English on child surfaces
- [ ] Touch targets ≥ 44 pt child; contrast AA

### C. Technical & security

- [ ] Automated test gate green (see [12_QA_SYSTEM.md](./12_QA_SYSTEM.md))
- [ ] No secrets in client; child cannot access parent-only actions
- [ ] Offline/error states human and calm — not raw errors
- [ ] Performance: interactive < 200 ms perceived on target devices

### D. Process

- [ ] PR cites POS sections satisfied
- [ ] ADR updated if architectural ([14_DECISION_LOG.md](./14_DECISION_LOG.md))
- [ ] Rollback path documented for schema changes ([13_RELEASE_PROCESS.md](./13_RELEASE_PROCESS.md))

---

## Screen-Level Checklist (UX QA)

Score each 1–5; **minimum 4 average, no 1 allowed**:

| Criterion | Question |
|-----------|----------|
| Clarity | Is the next action obvious in 3 seconds? |
| Calm | Would a stressed parent relax slightly? |
| Child dignity | Would we show this to Nintendo QA? |
| Exit | Can user leave / skip delight quickly? |
| Trust | Any surprise data or permission? |
| Craft | Screenshot proud for App Store? |

---

## Device Matrix (minimum)

| Platform | Test |
|----------|------|
| iPhone (small) | Safari + native WebView |
| iPhone (large) | Same |
| Android mid-range | Chrome + WebView |
| iPad | Layout not broken |
| PWA install | Core child read path |

---

## Regression Triggers (full constitution test)

Run full **Section A** when touching:

- Parent home / coach
- Child completion loop
- Rewards / stars economy
- Onboarding / first 48 h
- Push / email content
- Paywall / subscription UX

---

## Anti-Ship List (automatic reject)

- Empty parent home after onboarding
- Sibling star comparison
- Login-only retention mechanic
- Unskippable celebration > 2 s on routine path
- Enterprise dashboard on family home
- Child-facing configuration forms
- Sound autoplay on child launch
- Generic template UI without art review

---

## Rules

**QS-01** QA Director can block release; escalation to CEO only with written exception in Decision Log.  
**QS-02** “Ship and fix” allowed only for P3 bugs — never for Constitution or this doc.  
**QS-03** Quality bar never lowered for growth experiments — experiment design must pass taste doc.

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [12_QA_SYSTEM.md](./12_QA_SYSTEM.md) | Automation |
| [13_RELEASE_PROCESS.md](./13_RELEASE_PROCESS.md) | Pipeline |
| [11_AI_DEVELOPER_GUIDE.md](./11_AI_DEVELOPER_GUIDE.md) | Agent pre-ship |

---

## AI Instructions

1. Run Section A–D mentally before marking task complete.
2. Output checklist results in PR description.
3. If any gate fails, fix or refuse — do not ship partial quality.

---

## CXO Review Summary

| Role | Score | Note |
|------|-------|------|
| **CEO** | 10/10 | Enforceable company bar |
| **CPO** | 10/10 | Owns with QA |
| **CTO** | 10/10 | Perf + test hooks |
| **Principal Engineer** | 10/10 | Objective gates |
| **Game Director** | 10/10 | Nintendo QA reference |
| **UX Director** | 10/10 | Screen checklist |
| **Art Director** | 10/10 | Craft in gate |
| **QA Director** | 10/10 | Primary owner |
| **Security** | 10/10 | Trust section |
| **AI Systems Architect** | 10/10 | Agent must run gates |

**Approved:** All roles — v2.0.
