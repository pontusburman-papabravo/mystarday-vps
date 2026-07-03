# Human Approval Gate (HAG)

**COS v1.4 — escalation policy**  
**Not product truth — see `product-operating-system/`**

---

## Core rule

> **Ask humans only when the next step requires a human decision.**  
> **Never pause for routine completion.**

Delivery tiers are **checkpoints**, not **stopping points**.

---

## Delivery tiers (ARC → IRC → HRC)

```
ARC  Autonomous — commit, continue (no PR required)
 ↓
IRC  Internal Release Candidate — PR + docs, continue
 ↓
HRC  Human Release Candidate — escalate, continue other work
```

| Tier | PR | Morning report | Pause |
|------|----|----------------|-------|
| **ARC** | No | Optional log only | **Never** |
| **IRC** | Yes (draft) | Listed in IRC table | **Never** |
| **HRC** | When ready | Listed with **decision required** | Escalate only |

---

## Mandate check (every mission transition)

```
Can I continue according to my mandate?
  YES → Continue. Select next highest-value mission.
  NO  → Run blocked-ROI protocol (below). Do not idle.
```

**Forbidden question:** “Shall I proceed?” / “Do you want to review first?”

**Assume Product Owner is offline.** Optimize for uninterrupted autonomous execution.

**Strategic Intent** (`.ai/company/STRATEGIC_INTENT.md`) defines *what* to achieve.  
**AMQ** (`.ai/knowledge/MISSION_QUEUE.md`) ranks *how* — agent picks highest ROI.

**Forbidden:** Asking human to choose next mission.

---

## Blocked-ROI protocol

When a mission is blocked (HRC or technical):

```
1. Document blocker (HRC only if human decision required)
2. Ask: "Is there higher-ROI work I can do while waiting?"
3. Pick highest-value unblocked mission from backlog
4. Examples: tests · refactor · docs index · CI · prepare next slice
5. Never remain idle if productive autonomous work exists
```

**Rule:** Switching missions is not failure — idle is.

---

## Current authorization (standing)

Agents **may** without asking:

- Continue implementing Min Värld vertical slices
- Improve architecture, refactor, extend packs
- Create ADRs when architecture requires it
- Expand governance registry and tests
- Improve documentation and knowledge graph
- Spawn specialist agents
- Ship **ARC** and **IRC** continuously

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

## Escalate only when one of these is true (HRC)

| # | Trigger |
|---|---------|
| 1 | **Product Owner decision** required — behavior not in POS/ADR |
| 2 | **Canonical documentation conflict** — POS vs code vs ADR irreconcilable without human |
| 3 | **Creative direction** cannot be inferred from existing PCB/POS/docs |
| 4 | **Live deploy boundary** — live hosts, app stores, live migrations, live flags |
| 5 | **Business or legal** — payments, contracts, compliance, security incident |

If none apply → **continue autonomously**.

---

### Autonomous Release Candidate (ARC)

| | |
|--|--|
| **Created by** | Agent (any tier) |
| **Purpose** | Incremental repo value — invisible to human review queue |
| **PR** | **Not required** |
| **Human pause** | **None** |
| **Examples** | Refactor, new tests, doc index, code cleanup, CI tooling, internal scripts |

**ARC naming:** optional `ARC-NNN` in commit message or knowledge log.

### Internal Release Candidate (IRC)

| | |
|--|--|
| **Created by** | Agent when vertical slice or reviewable unit is complete |
| **Purpose** | Checkpoint, audit trail, morning report bundle |
| **PR** | Draft PR — **no wait for review** |
| **Human pause** | **None** |
| **Examples** | Pack refactor, feature slice, dev-flagged worlds, architecture milestone |

**IRC naming:** `IRC-NNN` in branch/PR title or report table.

### Human Release Candidate (HRC)

| | |
|--|--|
| **Created by** | Agent when HAG trigger is reached |
| **Purpose** | Package requiring explicit human decision |
| **Human pause** | Document blocker — **agent continues other missions** |
| **Examples** | Live deploy, store submission, live migration, live flag enable, unresolved POS conflict |

**HRC naming:** `HRC-NNN` — must list **exact human decision** required.

---

## Morning report contract

1. **Repository Value Score (RVS)** — [REPOSITORY_VALUE_SCORE.md](./REPOSITORY_VALUE_SCORE.md)
2. **Current Strategy** — objective, focus, why, alternatives rejected (not “next mission”)
3. **Nightly Review** — CTO Review, Kill Ideas, Opportunity Discovery — [NIGHTLY_REVIEW.md](./NIGHTLY_REVIEW.md)
4. **ARC log** (optional)
5. **IRC table**
6. **HRC table**
7. **Mission Queue snapshot** — top 5 ROI from AMQ

---

## Anti-patterns

- Pausing after every PR: “Want me to continue?”
- Treating draft PR as approval request
- Blocking next mission while waiting for IRC review
- Asking human to prioritize when backlog + POS already define order
- Idle waiting when productive autonomous work exists
- Optimizing for commit/PR count instead of RVS
- Asking human to pick next mission (use AMQ)

---

## Related

- [ORGANIZATION.md](./ORGANIZATION.md) — cells and tiers
- [REPOSITORY_VALUE_SCORE.md](./REPOSITORY_VALUE_SCORE.md) — nightly KPI
- [RELEASE_CANDIDATE_TEMPLATE.md](./RELEASE_CANDIDATE_TEMPLATE.md) — IRC vs HRC templates
- `.ai/runtime/MISSION_ENGINE.md` — escalation + blocked-ROI
