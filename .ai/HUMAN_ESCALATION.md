# Human Escalation

**Version:** 1.0 · **Frozen** — changes via [GOVERNANCE.md](GOVERNANCE.md)
**Rule:** When a trigger fires, **stop all implementation** on that track. Document. Wait.

No "best guess." No "we can revert later." No silent product decisions.

---

## Mandatory Stop Triggers

### Product & Vision

| Trigger | Action |
|---------|--------|
| **Product vision affected** | Stop · write Level 4 question · tag human |
| **Constitution interpretation unclear** | Stop · cite rule · ask human |
| **POS internal contradiction** | Stop · document both cites · propose ADR or POS fix |
| **Behavior undefined in POS** | Stop · do not invent UX (QS-02) |

**Authority:** `docs/PRODUCT-CONSTITUTION.md` · `product-operating-system/00–02`

---

### Monetization

| Trigger | Action |
|---------|--------|
| Pricing, tiers, trial length | Stop |
| Paywall placement or gating | Stop |
| IAP scope, RevenueCat config | Stop |
| New revenue experiment | Stop |

**Authority:** POS · ADR-005 (no global paywall) · `.ai/roles/cpo.md`

---

### Child Safety

| Trigger | Action |
|---------|--------|
| New child-facing data collection | Stop |
| Child-to-parent boundary change | Stop |
| PIN / lockout policy change | Stop |
| Content moderation scope | Stop |
| Third-party SDK in child path | Stop |

**Authority:** POS 04 · `.cursor/rules/120-security.mdc` · `.ai/roles/security.md`

---

### Privacy & Legal

| Trigger | Action |
|---------|--------|
| GDPR / consent flow change | Stop |
| Data retention or deletion policy | Stop |
| Cross-border data transfer | Stop |
| New processor or sub-processor | Stop |
| Terms / privacy policy implications | Stop |

**Authority:** POS 00 · legal human required

---

### Architecture

| Trigger | Action |
|---------|--------|
| Architecture must break accepted ADR | Stop · draft superseding ADR |
| **Two ADRs contradict** | Stop · list both · human resolves |
| New system of record | Stop · Level 3 ADR |
| Client-only authorization | Stop (always forbidden) |

**Authority:** `product-operating-system/14_DECISION_LOG.md` · `.ai/roles/architect.md`

---

### Uncertainty

| Trigger | Action |
|---------|--------|
| **High uncertainty** — multiple valid directions | Stop · present options with tradeoffs |
| Missing API keys / credentials / assets | Stop · list required secrets |
| User-data migration risk | Stop · plan + human approval |
| Live incident without runbook | Stop · escalate emergency workflow |

---

## Escalation Message Template

```markdown
## ⛔ Escalation — Human Required

**Trigger:** [category from above]
**Level:** 4
**Work stopped:** [branch/task]

### Context
[What was being attempted]

### Why stopped
[Specific rule / ADR / POS cite]

### Options (if applicable)
| Option | Pros | Cons |
|--------|------|------|
| A | | |
| B | | |

### Recommendation
[Agent preference — clearly labeled as non-binding]

### Unblock requires
[Exact human decision needed]
```

---

## What Agents Must NOT Do While Escalated

- Merge PR
- Implement "interim" product behavior
- Choose monetization or legal defaults
- Weaken security to unblock
- Ship with known Constitution violation

---

## Resolution

Human response types:

| Response | Agent action |
|----------|--------------|
| Explicit decision | Document in PR · proceed at assigned level |
| ADR accepted | Implement per ADR |
| Scope cut | Re-plan · update SPEC |
| Defer | Close PR or mark draft · MORNING_REPORT Blockers |

---

## Emergency Exception

P0 child safety or data breach: follow [workflows/emergency.md](workflows/emergency.md). Escalate **in parallel** with mitigation — do not wait for reply before containing harm.
