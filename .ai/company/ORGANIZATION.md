# AI Development Organization

**COS v1.2 — organizational charter**  
**Not product truth — see `product-operating-system/`**

---

## Mandate

Continuously improve product, architecture, documentation, tests, and the organization itself — under POS, with humans as sole live-deploy authority.

---

## Mission tiers

| Tier | Examples | Assurance |
|------|----------|-----------|
| **T0** | Research, org audit, knowledge | Org Health |
| **T1** | Hotfix, test fix | Owner + Security + QA |
| **T2** | Feature, refactor | TASK_ROUTER (3–5) |
| **T3** | Architecture, world, auth, IAP | Full + Council → RC |

---

## Cells

### Mission Control

| | |
|--|--|
| **Owner** | Orchestrator |
| **Inputs** | User intent, backlog, knowledge index |
| **Outputs** | Mission Brief, tier, routing record |
| **Stop** | BLOCK ambiguity, missing POS for product work |

Engines: `MISSION_ENGINE`, `TASK_ROUTER`

### Product Alignment Office

| | |
|--|--|
| **Owner** | CPO lens |
| **Inputs** | Mission Brief, POS docs |
| **Outputs** | Rule ID map, Open Questions, BLOCK if POS violation |
| **Stop** | Cannot invent product behavior |

### Delivery Cells (spawn on demand)

| Cell | Mandate | Agent profiles |
|------|---------|----------------|
| **Engineering** | API, data, client, migrations | Backend, Frontend, Mobile, Principal |
| **Creative** | Child emotion, world, visual, UX | Game, Creative, Art, UX Directors |
| **Platform** | Release, CI, native, perf | Release Manager, Performance Lead |
| **Research** | Audit, mapping, gap analysis | Orchestrator + domain expert |

**Handoff rule:** Next cell reads artifact — never assumes.

### Assurance Cell

| | |
|--|--|
| **Owner** | QA Director |
| **Inputs** | Diff, Mission Brief, tier |
| **Outputs** | Gate results, review table, BLOCK/waive |
| **Veto** | QA ship · Security 10 on auth/data · Game on casino/shame |

Engines: `QA_ENGINE`, `REVIEW_ENGINE` (tier-scaled)

### Executive Council

| | |
|--|--|
| **Members** | CEO, CPO, CTO (+ Game at child/world, Release at deploy) |
| **Convenes** | Tier T3, deadlock, Release Candidate, trust risk |
| **Outputs** | Strategic approve/BLOCK, RC package |

Playbooks: `001_*` through `010_*`

### Org Health

| | |
|--|--|
| **Owner** | AI Systems Architect |
| **Inputs** | Repo state, governance registry, contradictions |
| **Outputs** | Org improvements, COS proposals, knowledge updates |
| **Veto** | Governance expansion without ADR · skipped tier gates |

---

## Decision rights

| Decision | Authority | Overridable by |
|----------|-----------|----------------|
| Product behavior | POS → CPO interpretation | Human (ADR) |
| Ship quality | QA Director | — on P0 |
| Security | Security Lead | — |
| Child ethics | Game Director | CPO on product conflict |
| Architecture (T3) | CTO + Principal | Council |
| Live deploy | — | **Human only (HRC)** |

---

## Human Approval Gate (v1.2)

Detail: [HUMAN_APPROVAL_GATE.md](./HUMAN_APPROVAL_GATE.md)

- **IRC** — internal checkpoint; agent continues immediately
- **HRC** — human decision required; agent documents and picks next unblocked mission
- **Never ask** “shall I proceed?” when mandate allows continuation

---

## Agent spawn contract

Every spawned agent receives:

1. Mission · 2. Scope · 3. Authority · 4. Inputs · 5. Outputs · 6. Success criteria · 7. Stop conditions · 8. Review process · 9. Handoff

Profiles: `.ai/agents/*.md` — competencies, not mandatory meeting attendees.

---

## Operating rhythm

```
Intent → Mission Control (brief + tier)
      → Product Alignment (if product-touching)
      → Delivery Cell (implement)
      → Assurance (gates + tier review)
      → [Council if T3] → IRC checkpoint (HRC only if HAG trigger)
      → Org Health updates knowledge + backlog
      → Next mission (no pause for IRC)
```

---

## Anti-patterns

- 16 reviewers on every lint fix  
- CEO implementing code  
- COS duplicating POS  
- Permanent specialist agents  
- Documentation volume as success metric  
- Pausing for IRC review (“shall I proceed?”)
