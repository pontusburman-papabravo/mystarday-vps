# REVIEW_ENGINE

**Version:** 1.0  
**Role:** 16-perspective self-review · every reviewer can BLOCK · resolve before complete  
**Invoked:** WORKFLOW Phases 9–10 · before PR merge

---

## Purpose

Simulate a world-class product org review in one Composer session. **Any BLOCK veto stops completion** until resolved or waived per QA_ENGINE rules.

---

## Review Table Template (required in PR)

```markdown
| Reviewer | Verdict | BLOCK? | Notes |
|----------|---------|--------|-------|
| CEO | pass/fail/waive | Y/N | |
| CPO | … | | |
| … | | | |
```

**Verdicts:** `pass` · `fail` (BLOCK) · `waive` (P2+ only, documented) · `n/a`

---

## Reviewers (all mandatory unless n/a justified)

| # | Reviewer | Lens | BLOCK if… | Primary refs |
|---|----------|------|-----------|--------------|
| 1 | **CEO** | Trust · focus · ten-year product | Vanity growth · trust betrayal · scope creep vs mission | COS 001 |
| 2 | **CPO** | First Success · feature gate · coach singularity | Feature fails 6 questions · fragments journey | COS 002, POS 02 |
| 3 | **CTO** | Architecture · ten-year · auth | Client-only security · migration risk · global paywall | COS 003, POS 10 |
| 4 | **Principal Engineer** | Simplicity · dedupe · craft | Complexity up · duplicate systems · untested auth path | AOS 000, 140 |
| 5 | **Senior Frontend Engineer** | UI modules · mobile · state | Monolith growth · broken portrait · state desync | AOS 070, 060 |
| 6 | **Senior Backend Engineer** | Routes · validation · SQL | Missing authz · N+1 · error swallow | AOS 080, 100 |
| 7 | **Senior Mobile Engineer** | PWA · WebView · native gaps | iOS/Android broken path · safe-area · touch | AOS 060 |
| 8 | **Game Director** | Motivation · fair play · world as reward | Login bonus · shame · casino · grind | COS 004, POS 06 |
| 9 | **Creative Director** | Handcrafted · 03A · premium | Cheap UI · stock art · style drift | COS 005, POS 03A |
| 10 | **Art Director** | Illustration · color · composition | AD violations · neon clutter · mixed styles | POS 03A, 00B |
| 11 | **UX Director** | Flow · load · child clarity | Dead ends · modal stacks · icon-only child nav | COS 006, POS 04 |
| 12 | **Accessibility Specialist** | WCAG · motor · cognitive | Critical a11y fail · no reduced motion | POS 03, 15 |
| 13 | **QA Director** | Severity · regression · ship | P0/P1 open · test:gate red · child path untested | COS 007 |
| 14 | **Security Engineer** | Auth · data · secrets | Authz hole · PII leak · secret committed | AOS 120 |
| 15 | **Performance Engineer** | p95 · bundle · battery | Hot path regression · huge assets | AOS 110 |
| 16 | **AI Systems Architect** | Runtime · governance boundary | Expanded frozen docs · skipped workflow · non-determinism | `.ai/runtime/` |

---

## Review Protocol (per reviewer)

For each row, execute **60-second structured pass**:

```
1. Read diff scope (files touched)
2. Apply reviewer BLOCK if table above
3. Run DECISION_ENGINE seven questions from that lens
4. Record pass | fail | n/a (one sentence evidence)
5. If fail → tag fix owner via TASK_ROUTER
```

**Rule R-01:** `n/a` requires: "No touch to [domain]" — not laziness.

---

## Child-Facing Missions (expanded pass)

When `audience` includes child, reviewers **8–12 cannot be n/a**.

When Min värld / PCB: reviewers **8–10** must cite PCB section.

---

## Backend-Only Missions (n/a allowed)

| Reviewer | n/a when |
|----------|----------|
| Game Director | Zero child/motivation effect |
| Creative Director | Zero visual/copy |
| Art Director | Zero visual |
| UX Director | Zero flow/copy |
| A11y | Zero UI |
| Mobile | Zero client |
| Frontend | Zero client (pure API) |

CEO, CPO, CTO, Principal, Backend, Security, QA, Performance, AI Architect — still review.

---

## Conflict Resolution

When reviewers disagree:

```
1. Identify BLOCK vs ADVISE (only BLOCK stops ship)
2. Apply authority: POS > COS > PCB > AOS > Runtime > code
3. Domain tie-breakers:
   - Child delight vs parent analytics → CPO (child protagonist)
   - Speed vs architecture → CTO unless P0 live
   - Visual vs clarity → UX Director breaks tie on flows; Creative on brand
   - Security vs feature → Security wins
   - QA vs scope date → QA Director wins on P0/P1
4. Document resolution in PR review table
5. Re-run affected gates (QA_ENGINE)
```

**Rule R-02:** Unresolved BLOCK = mission incomplete — no founder bypass in runtime.

---

## Disagreement Examples (deterministic outcomes)

| Conflict | Winner | Action |
|----------|--------|--------|
| CPO wants feature · Game Director BLOCK casino loop | Game + POS G-03 | Cut mechanic |
| Creative wants dense UI · UX BLOCK cognitive load | UX + POS C-03 | Simplify |
| Frontend wants client authz · Security BLOCK | Security + W-01 | Server enforce |
| CTO wants rewrite · CEO scope focus | CEO | Defer rewrite to debt mission |
| Performance BLOCK bundle · CPO wants animation | Performance unless core delight | Reduce motion budget |

---

## Self-Review Integration

Maps to `180-self-review.mdc` eight roles — REVIEW_ENGINE is **superset** for PRs. Both must pass.

---

## Waivers

- Only **P2+** issues  
- CEO + affected reviewer hat documented  
- Expiry date required  
- Never waiving: Security BLOCK on auth · QA P0/P1 · POS Constitution  

---

## Anti-Patterns

- All-pass table without reading diff  
- n/a every creative reviewer on child UI  
- Ignoring Performance on "small" JS change to child path  
- Skipping AI Systems Architect on `.ai/` changes  

---

## Completion

REVIEW_ENGINE complete when:

1. All 16 rows filled  
2. Zero unresolved BLOCK  
3. Waivers documented per QA_ENGINE  
4. Re-run test:gate after fixes from review  
