# Decision Model

**Version:** 1.0 · **Frozen** — changes via [GOVERNANCE.md](GOVERNANCE.md)
**Purpose:** Classify every agent decision by autonomy level  
**Rule:** When in doubt, classify **up** (more restrictive)

---

## Levels

### Level 1 — Agent Decides Alone

**Autonomy:** Full. No documentation required.

**Examples:**
- Variable naming within conventions
- Internal function extraction
- Test assertion style
- Import order, formatting
- Bug fix that restores documented/POS-specified behavior
- Performance optimization with identical behavior
- Comment and dev-doc fixes

**Gate:** Must pass standards in `.ai/standards/` and `.cursor/rules/`.

---

### Level 2 — Agent Decides, Must Document

**Autonomy:** Full implementation. **PR note required.**

**Examples:**
- Library choice within existing stack (no new dependency without note)
- Error message wording (non-user-facing)
- Refactor scope (which files)
- Test strategy for a module
- Retry/backoff values for non-product thresholds
- CI configuration tweaks

**Documentation:** Short rationale in PR description under "Decisions."

---

### Level 3 — ADR Required

**Autonomy:** Agent may **draft** ADR and **prototype** on branch — **must not merge** until ADR accepted in `product-operating-system/14_DECISION_LOG.md`.

**Examples:**
- New API endpoint with new product authority
- New database table / entity
- New integration (payment, push, analytics event class)
- Breaking API or schema change
- New architectural layer or module boundary
- Changing authz model
- New child-facing data collection
- Replacing a major library or pattern
- Contradicting or superseding an existing ADR

**Process:**
1. Draft ADR using POS 14 template
2. List alternatives considered
3. Stop implementation at merge boundary OR complete behind feature flag only if ADR pre-approved
4. Link ADR PR in implementation PR

---

### Level 4 — Human Decision Required

**Autonomy:** **Stop.** Do not implement. Document question. Wait.

**Examples:**
- Constitution rule change or interpretation shift
- Product vision or positioning change
- UX principle change (manifesto, taste)
- Game design mechanic change
- Parent experience flow change not in POS
- Monetization: pricing, paywall, IAP scope
- Security policy: new data class, retention, third-party sharing
- Legal / GDPR / COPPA interpretation
- Architecture that breaks accepted ADR without supersession plan
- Two ADRs contradict — no clear winner
- High uncertainty: multiple valid product directions, no POS cite
- User-data migration or deletion at scale
- Live deploy rollback with data impact

**Process:** See [HUMAN_ESCALATION.md](HUMAN_ESCALATION.md).

---

## Classification Flowchart

```
Does it change Constitution, vision, UX principles, game design,
parent experience, monetization, or security policy?
  YES → Level 4

Does it need new architecture, schema, API contract, or contradict ADR?
  YES → Level 3

Is it a meaningful engineering choice future agents should know?
  YES → Level 2

Otherwise → Level 1
```

---

## Shift Interaction

| Level | Night shift | Day shift |
|-------|-------------|-----------|
| 1 | ✅ Proceed | ✅ Proceed |
| 2 | ✅ Proceed + PR note | ✅ Proceed + PR note |
| 3 | ⛔ Stop unless ADR already accepted | Draft ADR → human → implement |
| 4 | ⛔ Stop | ⛔ Stop → ask human |

---

## Relation to Other Docs

- **Governance:** [GOVERNANCE.md](GOVERNANCE.md) — changing levels requires MAJOR version + Executive Review
- **Seven Questions** (`.ai/runtime/DECISION_ENGINE.md`) — qualitative pass/fail within a level (legacy deep ref)
- **Escalation triggers** ([HUMAN_ESCALATION.md](HUMAN_ESCALATION.md)) — automatic Level 4
- **POS 14** — ADR format and acceptance process

Do not duplicate ADR content here. Reference POS 14 for templates.
