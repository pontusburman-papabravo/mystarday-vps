# Morning Report

**Version:** 1.0  
**Purpose:** Standard handoff format from night (or multi-session) AI work to humans  
**Where:** PR description body · issue comment · `.ai/reports/YYYY-MM-DD.md` (optional)

---

## When Required

- End of every **night shift** session
- End of any session that opens a PR without human present
- Multi-day agent work at logical checkpoints

---

## Template (copy into PR)

```markdown
## Morning Report — YYYY-MM-DD

**Shift:** Night | Day  
**Branch:** `cursor/...`  
**Agent session:** [brief identifier if available]

---

### Vad byggdes
<!-- Bullet list of features, fixes, refactors shipped in this session -->
-

### Vad testades
<!-- Tests written, test suites run, manual checks -->
-

### Vad verifierades
<!-- Lint, gate, perf, security, a11y — with pass/fail -->
-

### Buggar funna
<!-- New issues discovered — link issue/line if possible -->
-

### Buggar fixade
<!-- Closed/fixed in this session -->
-

### PR skapade
<!-- Links to PRs opened or updated -->
-

### Blockers
<!-- Level 3–4 items waiting on human · missing secrets · failing env -->
-

### Risker
<!-- Technical debt introduced · partial fixes · areas needing human eyes -->
-

### Rekommenderat nästa steg
<!-- Prioritized list for human or next agent session -->
1.
```

---

## Section Guidance

### Vad byggdes
Concrete deliverables only. File paths or PR scopes. No vague "improved codebase."

### Vad testades
- `npm run test:gate` result
- New test files and what they cover
- Manual QA if UI touched

### Vad verifierades
| Check | Command / method | Result |
|-------|------------------|--------|
| Lint | `npm run lint` | pass/fail |
| Gate | `npm run test:gate` | pass/fail |
| SW bump | if static assets changed | yes/no |

### Buggar funna
Honest list — including issues not fixed. Tag severity: P0/P1/P2/P3.

### Buggar fixade
Link commit or describe fix. If regression test added, note it.

### PR skapade
Full GitHub PR URLs. Mark draft vs ready.

### Blockers
Anything that stopped forward progress. Be specific: *"Need ADR for new child data field X"* not *"need decision."*

### Risker
- Behavior changes without full E2E coverage
- Performance unmeasured
- Touching auth without security review
- Partial ADR implementation

### Rekommenderat nästa steg
Ordered by impact. First item should be actionable in <30 min human time if possible.

---

## Quality Bar

A Morning Report is **incomplete** if:

- [ ] Any section is empty without "Inget" / "N/A" justification
- [ ] PR links missing when code was pushed
- [ ] Blockers omit Level 3–4 classification
- [ ] Test gate failure not listed under Blockers or Risker
