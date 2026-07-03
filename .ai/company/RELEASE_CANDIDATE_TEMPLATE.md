# Release Candidate Template

**COS v1.3 — Human Approval Gate**

Choose **ARC** (no PR), **IRC** (default PR), or **HRC** (human decision).

---

## Type

- [ ] **ARC** — Autonomous (commit only, no PR, no pause)
- [ ] **IRC** — Internal Release Candidate (draft PR, continue)
- [ ] **HRC** — Human Release Candidate (escalation required)

### HRC only — decision required

> [Exact human decision]

---

## Summary

[One paragraph: what changed and why]

## POS sections satisfied

- [ ] List rule IDs and POS doc sections

## Repository Value Score impact

[Which RVS dimensions improved — see REPOSITORY_VALUE_SCORE.md]

## Test results

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
REQUIRE_EMAIL_VERIFICATION=false npm run test:gate
npm run check:governance
```

## Recommended next autonomous mission

[ROI-ordered — no human wait]

---

**ARC / IRC:** Agent continues immediately.  
**HRC:** Agent documents and picks next unblocked mission.
