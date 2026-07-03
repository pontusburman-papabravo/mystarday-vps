# Human Approval Gate (HAG)

**COS v1.2 — escalation policy**  
**Not product truth — see `product-operating-system/`**

---

## Core rule

> **Ask humans only when the next step requires a human decision.**  
> **Never pause for routine completion.**

Release Candidates are **checkpoints**, not **stopping points**.

---

## Mandate check (every mission transition)

```
Can I continue according to my mandate?
  YES → Continue. Select next highest-value mission.
  NO  → Escalate. Document blocker. Switch mission if blocked.
```

**Forbidden question:** “Shall I proceed?” / “Do you want to review first?”

**Assume Product Owner is offline.** Optimize for uninterrupted autonomous execution.

---

## Current authorization (standing)

Agents **may** without asking:

- Continue implementing Min Värld vertical slices
- Improve architecture, refactor, extend packs
- Create ADRs when architecture requires it
- Expand governance registry and tests
- Improve documentation and knowledge graph
- Spawn specialist agents
- Create **Internal Release Candidates** continuously

Agents **may not** without explicit human approval:

- Deploy to live environments
- Publish App Store / Google Play builds
- Merge protected release branches (`main` deploy path)
- Execute live database migrations
- Enable live feature flags
- Product decisions not inferable from POS + ADR
- Business or legal decisions
- Override canonical documentation conflicts without ADR

---

## Escalate only when one of these is true

| # | Trigger |
|---|---------|
| 1 | **Product Owner decision** required — behavior not in POS/ADR |
| 2 | **Canonical documentation conflict** — POS vs code vs ADR irreconcilable without human |
| 3 | **Creative direction** cannot be inferred from existing PCB/POS/docs |
| 4 | **Live deploy boundary** — live hosts, app stores, live migrations, live flags |
| 5 | **Business or legal** — payments, contracts, compliance, security incident |

If none apply → **continue autonomously**.

---

## Two Release Candidate types

### Internal Release Candidate (IRC)

| | |
|--|--|
| **Created by** | Agent (any tier) |
| **Purpose** | Checkpoint, audit trail, morning report bundle |
| **Human pause** | **None** |
| **Human question** | **None** |
| **Examples** | Pack refactor, tests, docs, architecture prep, dev-flagged features |

**IRC naming:** `IRC-NNN` in branch/PR title or report table. Draft PRs are IRC by default.

### Human Release Candidate (HRC)

| | |
|--|--|
| **Created by** | Agent when HAG trigger is imminent or reached |
| **Purpose** | Package requiring explicit human decision |
| **Human pause** | Only at HRC boundary — document, do not block other work |
| **Examples** | Live deploy, store submission, live migration, live flag enable, unresolved POS conflict |

**HRC naming:** `HRC-NNN` — must list **exact human decision** required.

---

## Morning report contract

When multiple IRCs accumulate overnight:

1. List **all IRCs** (branch, PR link, one-line summary)
2. List **HRCs** separately with **decision required**
3. List **blockers** only for true HAG triggers
4. **Top autonomous missions** — what agent will do next without asking
5. **Top human decisions** — only items matching escalate table above

---

## Anti-patterns

- Pausing after every PR: “Want me to continue?”
- Treating draft PR as approval request
- Blocking next mission while waiting for IRC review
- Asking human to prioritize when backlog + POS already define order
- Idle waiting when productive autonomous work exists

---

## Related

- [ORGANIZATION.md](./ORGANIZATION.md) — cells and tiers
- [RELEASE_CANDIDATE_TEMPLATE.md](./RELEASE_CANDIDATE_TEMPLATE.md) — IRC vs HRC templates
- `.ai/runtime/MISSION_ENGINE.md` — escalation field in Mission Brief
