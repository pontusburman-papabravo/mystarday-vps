# Release Candidate Template

**COS v1.2 — Human Approval Gate**

Choose **IRC** (default) or **HRC** (human decision required).

---

## Type

- [ ] **IRC** — Internal Release Candidate (no pause, no human question)
- [ ] **HRC** — Human Release Candidate (escalation per `HUMAN_APPROVAL_GATE.md`)

### HRC only — decision required

> [Exact human decision: deploy / store / prod migration / prod flag / product / legal / doc conflict]

---

## Summary

[One paragraph: what changed and why]

## POS sections satisfied

- [ ] List rule IDs and POS doc sections

## Documentation changes

- [ ] Files added/updated

## Architecture changes

- [ ] Diagram or bullet list · migration needed?

## ADRs

- [ ] New or updated ADR links

## Test results

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
REQUIRE_EMAIL_VERIFICATION=false npm run test:gate
npm run check:governance
```

- [ ] test:gate green
- [ ] check:governance green

## Remaining risks

| Risk | Mitigation |
|------|------------|
| | |

## Rollback strategy

[How to revert if live incident]

## Recommended next autonomous mission

[What agent continues without asking — per HAG mandate]

---

**IRC:** Agent continues to next mission. Human reviews in morning report bundle.  
**HRC:** Agent documents blocker and continues other work until human decides.  
**Never** deploy · merge protected main · live migration · live flags without explicit HRC approval.
