# Release Candidate Template

**COS v1.1 — Human Approval Gate**  
Use for Tier T3 missions and any live-deploy-touching work.

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
# Override deploy-mode shell env — see root AGENTS.md
REQUIRE_EMAIL_VERIFICATION=false npm run test:gate  # pragma: allowlist secret
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

## Recommended next step

[What human should approve or do next]

---

**STOP:** No deploy · no live migration · no live flags until explicit human approval.
