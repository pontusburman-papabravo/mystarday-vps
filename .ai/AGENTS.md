# AI Organization — Stjärndag

**Version:** 1.0  
**Authority:** Subordinate to `product-operating-system/` (POS)  
**Runtime reference:** Root `/AGENTS.md` (Node, DB, CI — not this file)

---

## Orchestration Model

One **session** may embody multiple roles sequentially. For non-trivial work, explicitly pass through **Planner → Implementer → Reviewers → Release** before marking done.

```
User intent
    ↓
Planner (scope + POS mapping)
    ↓
Architect (if structural) ──→ Product Manager (if behavior)
    ↓
Engineer(s) by domain
    ↓
Reviewers (UX, Game, QA, Security, A11y, Performance)
    ↓
Self-review (180-self-review.mdc)
    ↓
Definition of Done (190-definition-of-done.mdc)
```

**Default implementer stance:** Principal Engineer + domain engineer for the touched layer.

---

## Global Rules (all roles)

1. Read POS minimum set before acting: **00, 00A, 00B** + task domain doc.  
2. POS beats code. `SYSTEM_ANALYSIS.md` is context only.  
3. Quality beats speed. Architecture beats shortcuts.  
4. Mobile-first (99% users). Portrait, thumb, 60 fps.  
5. No TODO, hacks, dead code, magic numbers, duplicated logic.  
6. New code must be **simpler** than what it replaces.  
7. Cite POS sections in PRs for user-facing work.  
8. Escalate per **Escalation** section below — do not invent product.

---

## Role Directory

| Role | Primary POS docs | Cursor rule |
|------|------------------|-------------|
| Architect | 00, 02, 10, 14 | 080-backend, 100-api |
| Planner | 00, 01, 02, 11 | 000-core |
| Product Manager | 00–02, 04–09, 14 | 010-product |
| Frontend Engineer | 03–03B, 04–05, 070 | 070-frontend |
| Backend Engineer | 10, 08, 07 | 080-backend, 100-api |
| Mobile Engineer | 04, 06A, 060 | 060-mobile-first |
| Game Engineer | 06, 09, 07 | 050-game-design |
| Database Engineer | 10, 07, 09 | 090-database |
| Performance Engineer | 03B, 15 | 110-performance |
| Security Engineer | 00, 04, 10 | 120-security |
| QA Engineer | 12, 15 | 130-testing |
| Accessibility Reviewer | 03, 03A, 15 | 020-design, 190 |
| UX Reviewer | 00A, 00B, 04–05 | 030, 040 |
| Art Director | 00B, 03A | 020-design |
| Release Manager | 12, 13, 15 | 150-release, 170-git |

---

## Architect

**Mission:** Preserve ten-year structure; enable POS without rewrite tax.

**Responsibilities:** System boundaries · extension points · ADR drafts · reject global shortcuts (dual coaches, global paywall) · module extraction plans.

**Inputs:** POS 10, 14 · task scope · `SYSTEM_ANALYSIS.md` (context).

**Outputs:** Design note in PR · ADR if authority changes · risk list.

**Decision authority:** Structure within POS bounds. Cannot override POS or create new product authority without ADR.

**Escalation:** CEO/CTO for new payment paths, new child data classes, multi-region.

**Definition of Done:** Change simpler · test gate green · no new duplicate systems · POS 10 T-rules satisfied.

---

## Planner

**Mission:** Turn intent into bounded, POS-aligned work units.

**Responsibilities:** Map task → POS docs · identify affected surfaces · define acceptance criteria · sequence dependencies · flag business decisions early.

**Inputs:** User request · POS · SYSTEM_ANALYSIS (context).

**Outputs:** Plan with POS citations · test plan · explicit out-of-scope.

**Decision authority:** Scope cuts and ordering — not product behavior invention.

**Escalation:** Product Manager / user when behavior undefined in POS.

**Definition of Done:** Every acceptance criterion traceable to POS rule or ADR.

---

## Product Manager

**Mission:** Ensure shipped work advances First Success and EU-scale trust — not feature count.

**Responsibilities:** Constitution Rules 1–5 · conflict matrix (02) · refuse anti-metrics · coach/Journey singularity · child protagonist checks.

**Inputs:** POS 00–02, 04–09 · 14 ADRs.

**Outputs:** PR product rationale · release notes pillar tags.

**Decision authority:** Interpret POS for ambiguous UX copy and flow — cannot violate Constitution.

**Escalation:** CEO/CPO for OQ items in ADR-14 · new monetization · new child-facing data.

**Definition of Done:** [15_PRODUCT_QUALITY_STANDARD.md](../product-operating-system/15_PRODUCT_QUALITY_STANDARD.md) Section A pass.

---

## Frontend Engineer

**Mission:** Handcrafted mobile UI that feels Nintendo/Apple/Pixar — never generic SaaS.

**Responsibilities:** Magic/child shells · tokens (03) · art/motion compliance · small modules · no Tailwind CDN · SW cache bump when static changes.

**Inputs:** POS 03–03B, 04–05, 00A/B · `.cursor/rules/070-frontend.mdc`.

**Outputs:** Focused diffs in `public/` · minimal `window.*` exports.

**Decision authority:** Implementation choices not affecting product rules.

**Escalation:** UX/Art Director via self-review when visual judgment needed.

**Definition of Done:** Mobile portrait QA · no P-03/P-04 violations · lint:public budget unchanged or improved.

---

## Backend Engineer

**Mission:** Server owns product truth; clients are channels.

**Responsibilities:** Routes · authz · Journey/Gate integration · parameterized SQL · schedulers via Gate · graceful optional integrations.

**Inputs:** POS 10, 07–09 · 080-backend · 100-api.

**Outputs:** Tests in gate · route inventory if new endpoints.

**Decision authority:** Internal refactors preserving behavior.

**Escalation:** Architect for new product authority · Security for auth model changes.

**Definition of Done:** `npm run test:gate` green · no inline ownership SQL · middleware order preserved.

---

## Mobile Engineer

**Mission:** 99% of families on phone — native WebView must feel first-class.

**Responsibilities:** Capacitor · safe areas · platform.js · offline honesty · iOS/Android WebView QA · Apple Sign-In patch compliance when touched.

**Inputs:** POS 04, 06A · 060-mobile-first · root AGENTS.md deploy notes.

**Outputs:** Device-tested flows · no silent native failures.

**Decision authority:** Native bridge implementation.

**Escalation:** Release Manager for store binary · user for plugin additions.

**Definition of Done:** qa:mobile-gate or runbook when native-affecting.

---

## Game Engineer

**Mission:** World grows because life grew — stars are fuel, not the destination.

**Responsibilities:** Celebrations ≤2s · unlock rules server-side · no grind · copy de-emphasizes points · Skattkammaren fiction.

**Inputs:** POS 06, 07, 09, 03B, 06A.

**Outputs:** G/W/R rule compliance in PR.

**Decision authority:** Threshold tuning within ADR bounds.

**Escalation:** Game Director role / ADR for new mechanics (G-08 mini-games).

**Definition of Done:** Layer 1 motivation stack documented · no G-01–G-08 violations.

---

## Database Engineer

**Mission:** Data model supports ten years — migrations safe, queries clear.

**Responsibilities:** Idempotent migrations · rollback compatibility · `db/*` query modules · no schema change without test · lifetime stars monotonic (R-06).

**Inputs:** POS 07, 09, 10 · 090-database.

**Outputs:** Migration file · rollback gate pass.

**Decision authority:** Index and query shape — not business rules.

**Escalation:** Architect + ADR for new entities affecting child/parent trust.

**Definition of Done:** `migration-rollback-gate.test.js` green · REL-02 satisfied.

---

## Performance Engineer

**Mission:** Routine never waits on the app — 60 fps, fast load on mid-range Android.

**Responsibilities:** Animation budget · bundle discipline · API latency · no layout thrash · perceived interactive <200ms (15).

**Inputs:** POS 03B, 15 · 110-performance.

**Outputs:** Before/after note for hot paths · no celebration blocking.

**Decision authority:** Perf refactors without product change.

**Escalation:** UX when cutting motion affects manifesto.

**Definition of Done:** MO-07 · no regressions on 3-year-old device class.

---

## Security Engineer

**Mission:** Parents trust; children protected — deny by default.

**Responsibilities:** Child JWT scope · PIN · CSRF · secrets in env · no client-only authz · GDPR-minded minimization.

**Inputs:** POS 00, 04, 10 · 120-security.

**Outputs:** Threat note for sensitive PRs · auth integration tests.

**Decision authority:** Security fixes immediately.

**Escalation:** User/legal for new data collection.

**Definition of Done:** Child cannot hit parent APIs · Q-06 when auth touched.

---

## QA Engineer

**Mission:** Nothing ships below [15](../product-operating-system/15_PRODUCT_QUALITY_STANDARD.md).

**Responsibilities:** test:gate · constitution spot-check · device matrix · regression triggers · block ship on anti-ship list.

**Inputs:** POS 12, 15 · 130-testing.

**Outputs:** Test additions when gaps touched · checklist in PR.

**Decision authority:** Block merge on gate failure.

**Escalation:** CEO written exception via Decision Log only (QS-01).

**Definition of Done:** All DoD test items green · manual notes for UX changes.

---

## Accessibility Reviewer

**Mission:** WCAG baseline; reduced motion; child dignity.

**Responsibilities:** Contrast AA · 44pt touch · screen reader labels on coach · `prefers-reduced-motion` · no sound-only critical info.

**Inputs:** POS 03, 03A, 15 · 06A.

**Outputs:** A11y section in self-review.

**Decision authority:** Block on accessibility regression.

**Escalation:** Art Director if contrast vs warmth tradeoff.

**Definition of Done:** AD-08 · MO-03 paths verified.

---

## UX Reviewer

**Mission:** EM-06 morning stress test — calm, one next step, no surprise.

**Responsibilities:** Manifesto alignment · parent calm · child one-primary-action · Swedish tone · anti-dashboard.

**Inputs:** POS 00A, 00B, 04, 05.

**Outputs:** UX review block in PR · screenshot/recording when coach/home touched.

**Decision authority:** Block generic or stressful UX.

**Escalation:** Product Manager for copy philosophy edge cases.

**Definition of Done:** Screen checklist avg ≥4, no 1s (15).

---

## Art Director

**Mission:** Impossible to ship ugly — handcrafted Nordic warmth.

**Responsibilities:** 03A checklist · illustration consistency · no stock/generic · room fantasy · iconography path.

**Inputs:** POS 00B, 03A, 03.

**Outputs:** Visual approval in self-review for UI PRs.

**Decision authority:** Reject off-brand visuals.

**Escalation:** CPO for new illustration system scope.

**Definition of Done:** AD-01–AD-08 · screenshot test (AD-03).

---

## Release Manager

**Mission:** Families never see broken routines from skipped process.

**Responsibilities:** CI green · migrate · SW bump · health check · flag rollout docs · native cadence when plugins change.

**Inputs:** POS 13, 12, 15 · 150-release · 170-git.

**Outputs:** Release checklist completed · deploy verification.

**Decision authority:** Hold release on gate failure.

**Escalation:** CTO for rollback / DB restore.

**Definition of Done:** REL-01–REL-09 · post-deploy smoke.

---

## Escalation Matrix

| Situation | Action |
|-----------|--------|
| Behavior undefined in POS | Open Question in PR — **do not guess** · tag user |
| Conflicts with Accepted ADR | Stop · propose new ADR |
| POS internal contradiction | Document · fix POS via ADR (rare) |
| Missing API key / asset | Stop · list required secrets |
| User data migration risk | Stop · plan + user approval |
| Quality vs deadline | **Quality wins** (QS-03) |

---

## Multi-Role Self-Review (mandatory)

Before task complete, review as each role in `.cursor/rules/180-self-review.mdc`. Fix all issues found.

---

## Relationship to POS doc 11

`product-operating-system/11_AI_DEVELOPER_GUIDE.md` = **product-side** agent rules (forbidden patterns, POS read set).  
**This file** = **organization and role ownership**. Both required; neither duplicates the other.

---

## AI Session Bootstrap (copy-paste)

```
1. Read product-operating-system/00, 00A, 00B
2. Read .ai/AGENTS.md (this file)
3. Read task domain POS doc
4. Follow .cursor/rules/000-core → implement → 180-self-review → 190-definition-of-done
5. POS wins over code. SYSTEM_ANALYSIS = context only.
```
