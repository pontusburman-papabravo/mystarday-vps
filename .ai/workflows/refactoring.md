# Workflow — Refactoring

**Version:** 1.0  
**Roles:** CTO · Architect · QA Director  
**Rule:** Behavior preserved unless bug fix explicitly in scope

---

## Input

- Refactor goal (dedupe · extract · rename · split file)
- Files affected
- Proof no product behavior change (or cite bug fix)

---

## Steg

| # | Step | Action |
|---|------|--------|
| 1 | **Baseline** | Gate green before start |
| 2 | **Scope lock** | No feature additions in refactor PR |
| 3 | **Incremental** | Small commits · easier review |
| 4 | **Extract** | New modules per large-file rules (`.cursor/rules/large-files.mdc`) |
| 5 | **Preserve API** | Public routes · `window.*` exports stable |
| 6 | **TEST** | Gate must stay green throughout |
| 7 | **Simpler** | Line count ↓ or complexity ↓ — document metric |
| 8 | **PR** | Title `refactor:` · before/after note |

---

## Output

- Smaller/simpler modules
- Zero behavior change (unless documented bug fix)
- Green gate

---

## Quality Gates

- [ ] `npm run test:gate` green before and after
- [ ] No new `window.*` globals without need
- [ ] No POS/product changes smuggled in
- [ ] New code simpler than replaced (global rule)

---

## Stop Conditions

- Refactor reveals product bug → split PR or document as fix
- Requires API break → Level 3 ADR · not a pure refactor
- Gate fails mid-refactor → revert chunk · do not ship partial
- Night shift: OK for internal refactors within allowed list
