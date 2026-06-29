# IMPLEMENTATION_ENGINE

**Version:** 1.0  
**Role:** How features are built — mandatory sequence and craft bar  
**Invoked:** WORKFLOW Phase 4

---

## Purpose

Define **exact build behavior** so implementation is consistent, minimal, and reversible.

---

## Mandatory Sequence

No step may be skipped. Loop back on failure.

```
1. Understand      ← Mission Brief + Plan
2. Research        ← grep · read touched files (chunk large files per large-files.mdc)
3. Design          ← design note · DECISION_ENGINE on fork
4. Risk Analysis   ← data · auth · child · perf table
5. Implementation  ← code · minimal diff
6. Testing         ← unit/integration per QA_ENGINE
7. Visual QA       ← 375px portrait mental pass · key flows
8. Accessibility   ← contrast · target size · reduced motion path
9. Performance     ← no hot-path regression
10. Refactoring    ← simplify touched code · dedupe
11. Documentation  ← comments only if non-obvious · ADR if architecture · PR body
12. Commit         ← 170-git-workflow.mdc
```

**Rule I-01:** Steps 6–9 re-run after any change in 5 or 10.

---

## Pre-Implementation Gates

Before writing code:

- [ ] Mission Brief exists  
- [ ] Execution Plan exists  
- [ ] TASK_ROUTER roles assigned  
- [ ] DECISION_ENGINE pre-check pass  
- [ ] POS domain docs read (listed in brief)  
- [ ] PCB world bible read if child world  
- [ ] Large files: grep first, chunk read (`.cursor/rules/large-files.mdc`)  

---

## Implementation Rules

### Scope

| Rule | Detail |
|------|--------|
| I-S01 | Smallest diff that satisfies acceptance criteria |
| I-S02 | No drive-by refactors outside plan |
| I-S03 | New features in new small files when file >2500 tokens trend |
| I-S04 | Match surrounding naming, patterns, error handling |
| I-S05 | No new dependency without DECISION_ENGINE + CTO |

### Child surfaces

| Rule | Detail |
|------|--------|
| I-C01 | One primary action per screen (POS C-03) |
| I-C02 | Celebrations ≤2s, skippable (03B) |
| I-C03 | No forms except PIN (C-01) |
| I-C04 | Server enforces scope — never client-only (C-08) |
| I-C05 | PCB visual/audio/motion language respected |

### Parent surfaces

| Rule | Detail |
|------|--------|
| I-P01 | Build on Planering, run on Hem (POS 08 B-08) |
| I-P02 | Destructive confirms plain Swedish |
| I-P03 | Mobile-first density with clear hierarchy |

### Backend

| Rule | Detail |
|------|--------|
| I-B01 | Parameterized SQL · authz helpers per route |
| I-B02 | Zod validate on inputs |
| I-B03 | Unlock/progression server-side (W-01) |
| I-B04 | Errors logged server-side; safe messages client-side |

### Frontend

| Rule | Detail |
|------|--------|
| I-F01 | Prefer extend module over monolith growth |
| I-F02 | SW/cache version if static assets change |
| I-F03 | No inline secrets or env in public/ |

---

## Visual QA Protocol (step 7)

Checklist for touched UI:

- [ ] 375×667 portrait — primary action visible without scroll?  
- [ ] Loading / empty / error states exist  
- [ ] Swedish copy · no English leaks on child surfaces  
- [ ] Touch targets child ≥44px  
- [ ] Matches 03A / 00B — not on "cheap" list  
- [ ] Motion per 03B · reduced motion path  
- [ ] No duplicate nav / confused icons (historical class)  

---

## Accessibility Protocol (step 8)

- [ ] Contrast AA on text/buttons touched  
- [ ] Focus order sane on parent flows  
- [ ] Reduced motion disables non-essential animation  
- [ ] Not color-only state encoding  

---

## Performance Protocol (step 9)

- [ ] No new sync heavy work on child Today path  
- [ ] Images sized appropriately  
- [ ] No N+1 queries on hot routes  
- [ ] Large DOM avoided on schedule views  

---

## Refactoring Protocol (step 10)

After green tests:

- Remove duplication introduced  
- Extract only if reuse ≥2 call sites **in plan**  
- Delete dead code touched  
- Rename for clarity if confusing  

**Rule I-02:** Refactor must not expand scope — behavior parity required.

---

## Documentation Protocol (step 11)

| Change type | Document |
|-------------|----------|
| Architecture / authority | ADR in POS 14 (founder review) |
| New route | route inventory if batch |
| User-facing | PR body + release notes fragment |
| Runtime only | PR body |

Do **not** create new governance docs (frozen v1.0).

---

## Commit Protocol (step 12)

- Imperative subject ≤72 chars  
- Body: what · why · POS refs · test commands  
- One logical change per commit when possible  
- Secret scanner clean  

---

## Anti-Patterns

- Code before design note  
- Full read of schedule.js / dashboard.js  
- Client-only permission checks  
- Global subscription middleware  
- Child settings screen  
- Star inflation / login bonus  
- Commit without tests when tests exist for area  

---

## Completion

Implementation Engine complete when sequence 1–12 done for plan scope and WORKFLOW hands off to QA_ENGINE Phase 5.
