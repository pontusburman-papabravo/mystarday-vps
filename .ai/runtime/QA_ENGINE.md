# QA_ENGINE

**Version:** 1.0  
**Role:** Automated and procedural quality gates — nothing complete until all pass  
**Invoked:** WORKFLOW Phases 5–7 · final gate before PR

---

## Purpose

Convert quality standards into **binary pass/fail gates**. No subjective "looks okay."

---

## Master Gate Checklist

**Mission incomplete if ANY unchecked.**

### Tests

- [ ] **G-TEST-01** `npm run test:gate` exit 0  
- [ ] **G-TEST-02** New behavior has regression test when touching auth, paywall, IAP, child scope, journey  
- [ ] **G-TEST-03** Flaky tests not ignored — fix or quarantine with owner  
- [ ] **G-TEST-04** DB tests use advisory lock pattern when applicable  

**Command (Cloud VM):**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false \
  env -u RESEND_API_KEY -u RESEND_API_KEY_WEEKLY \
  npm run test:gate
```

### Static analysis

- [ ] **G-LINT-01** `npm run lint` — 0 errors (warnings unchanged budget OK)  
- [ ] **G-LINT-02** `npm run check:css` if Tailwind/classes changed  

### POS compliance

- [ ] **G-POS-01** Constitution Rules 1–5 satisfied  
- [ ] **G-POS-02** Applicable domain rules (04–09, 03A/B, 06A) satisfied  
- [ ] **G-POS-03** `15_PRODUCT_QUALITY_STANDARD.md` applicable sections pass  
- [ ] **G-POS-04** POS citations in PR for user-facing work  

### AOS compliance

- [ ] **G-AOS-01** Applicable `.cursor/rules/*.mdc` satisfied  
- [ ] **G-AOS-02** `190-definition-of-done.mdc` all boxes true  
- [ ] **G-AOS-03** `180-self-review.mdc` eight roles addressed  

### COS compliance

- [ ] **G-COS-01** CPO feature gate passed (features only)  
- [ ] **G-COS-02** QA Director severity — no open P0/P1  
- [ ] **G-COS-03** Release Command checklist if release mission  

### PCB compliance

- [ ] **G-PCB-01** Child world changes match world bible fiction (or N/A)  
- [ ] **G-PCB-02** No generic asset-store world aesthetic (00B)  

### Code quality

- [ ] **G-CODE-01** No duplicated logic in touched code  
- [ ] **G-CODE-02** No dead code introduced  
- [ ] **G-CODE-03** No TODO / FIXME / hacks  
- [ ] **G-CODE-04** No magic numbers without named constants  
- [ ] **G-CODE-05** New code simpler than replaced (subjective → Principal review if dispute)  

### UX

- [ ] **G-UX-01** No obvious broken flows on touched surfaces  
- [ ] **G-UX-02** Empty/error states handled  
- [ ] **G-UX-03** Child: one primary action preserved  
- [ ] **G-UX-04** No dark patterns (COS 001)  

### Accessibility

- [ ] **G-A11Y-01** No new critical contrast failures  
- [ ] **G-A11Y-02** Touch targets child ≥44px on touched screens  
- [ ] **G-A11Y-03** Reduced motion path for new animations  
- [ ] **G-A11Y-04** Not color-only critical state  

### Mobile

- [ ] **G-MOB-01** 375px portrait layout sane  
- [ ] **G-MOB-02** No desktop-only assumptions on parent primary flows  
- [ ] **G-MOB-03** PWA SW bumped if static assets changed  

### Performance

- [ ] **G-PERF-01** No deliberate hot-path blocking work added  
- [ ] **G-PERF-02** No large unoptimized assets added  
- [ ] **G-PERF-03** Query count not regressed on touched API without reason  

### Security

- [ ] **G-SEC-01** Authz on new/changed routes  
- [ ] **G-SEC-02** No secrets in repo  
- [ ] **G-SEC-03** Child data scope enforced server-side  
- [ ] **G-SEC-04** No PII in analytics metadata  

---

## Severity → Gate Mapping

| COS QA severity | Gate behavior |
|-----------------|---------------|
| P0 | **BLOCK** merge |
| P1 | **BLOCK** merge |
| P2 | Merge only with CPO + QA written waive in PR |
| P3/P4 | Track · fix or batch |

---

## Gate Execution Order

```
1. G-TEST-* (must be first — blocks all)
2. G-LINT-*
3. G-CODE-*
4. G-SEC-*
5. G-POS-* / G-AOS-* / G-COS-* / G-PCB-*
6. G-UX-* / G-A11Y-* / G-MOB-*
7. G-PERF-*
```

---

## Failure Loop

```
fail gate → diagnose → fix → re-run from failed category → document in PR
```

Max iterations: unlimited until pass or escalate BLOCK to founder.

---

## Waivers

Only **P2+** waivers allowed. Template in PR:

```markdown
**Waiver:** G-UX-02 empty state deferred
**Severity:** P2
**Approver:** CPO + QA Director (self-review hats)
**Expiry:** next release
**Ticket:** …
```

P0/P1 waivers forbidden except CEO written ADR for live incident.

---

## Anti-Patterns

- Skipping test:gate "docs only" when SW precache changed  
- Lint errors ignored  
- "Manual test only" without checklist  
- Waiving G-SEC-* without Security review pass  

---

## Completion

QA Engine complete when every applicable checkbox in Master Gate Checklist is checked or valid waiver attached.
