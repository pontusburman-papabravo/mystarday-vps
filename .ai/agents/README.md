# AI Agent Organization

**Version:** 1.1  
**Type:** Competency profiles for COS Delivery Cells and Assurance  
**COS charter:** `.ai/company/ORGANIZATION.md`

---

## What This Is

**WHO agents are** — not a permanent meeting roster. Mission Control spawns profiles per TASK_ROUTER; Assurance scales by tier (T1: 3, T2: 3–5, T3: up to 16).

Company mind: `.ai/brain/` — judgment layer.

---

## Cells (COS v1.1)

| Cell | Agents |
|------|--------|
| **Mission Control** | Orchestrator (uses MISSION_ENGINE, TASK_ROUTER) |
| **Product Alignment** | CPO |
| **Engineering** | Principal, Frontend, Backend, Mobile |
| **Creative** | Game, Creative, Art, UX Directors |
| **Assurance** | QA Director, Security, Accessibility, Performance |
| **Platform** | Release Manager |
| **Org Health** | AI Systems Architect |
| **Executive Council** | CEO, CTO (+ convened members) |

---

## Agent Roster

| Agent | File | Domain |
|-------|------|--------|
| CEO | [CEO.md](./CEO.md) | Company · focus · trust |
| CPO | [CPO.md](./CPO.md) | Product · First Success |
| CTO | [CTO.md](./CTO.md) | Architecture · ten-year |
| Principal Engineer | [PrincipalEngineer.md](./PrincipalEngineer.md) | Maintainability · dedupe |
| Frontend Lead | [FrontendLead.md](./FrontendLead.md) | Client · mobile UI |
| Backend Lead | [BackendLead.md](./BackendLead.md) | API · server truth |
| Mobile Lead | [MobileLead.md](./MobileLead.md) | PWA · native |
| Game Director | [GameDirector.md](./GameDirector.md) | Child emotion · fair play |
| Creative Director | [CreativeDirector.md](./CreativeDirector.md) | Visual identity |
| Art Director | [ArtDirector.md](./ArtDirector.md) | Composition · motion craft |
| UX Director | [UXDirector.md](./UXDirector.md) | Flows · calm |
| Accessibility Lead | [AccessibilityLead.md](./AccessibilityLead.md) | WCAG · inclusion |
| Security Lead | [SecurityLead.md](./SecurityLead.md) | Auth · Security 10 |
| Performance Lead | [PerformanceLead.md](./PerformanceLead.md) | Speed · jank |
| QA Director | [QADirector.md](./QADirector.md) | Ship veto |
| Release Manager | [ReleaseManager.md](./ReleaseManager.md) | Deploy · rollback |
| AI Systems Architect | [AISystemsArchitect.md](./AISystemsArchitect.md) | Org health |

Executive playbooks (`.ai/company/`) remain frozen reference — agents **operationalize** them in session.

---

## Session Bootstrap

```
1. .ai/brain/PROJECT_BRAIN.md        (~10 min — company mind)
2. .ai/runtime/WORKFLOW_ENGINE.md    (frozen — pipeline)
3. .ai/runtime/MISSION_ENGINE.md     (Mission Brief)
4. .ai/agents/[owners from TASK_ROUTER]
5. Execute → Quality Index → agent reviews → QA Director
```

---

## How Agents Collaborate

### Phase map

| Workflow phase | Lead agent(s) | Mandatory consult |
|----------------|---------------|-------------------|
| Mission intake | CPO + CEO lens | AI Systems Architect if org change |
| Planning | CPO + Planner role | UX, Game if child |
| Architecture | CTO + Principal | Security |
| Implementation | Domain Leads | Art/UX/Game as surface requires |
| Testing | QA Director | Security always |
| Craft review | Game + Creative + UX + Art | Accessibility |
| Ship | QA Director + Release Manager | CEO if exception |

### One Composer session

Composer **embodies agents sequentially** — each pass uses that agent's checklist and scores Quality Index dimensions. Same person, different hat; **vetoes are real**.

---

## Conflict Resolution

### Authority order

```
1. POS (product law)
2. COS playbooks (executive judgment)
3. Brain (company mind)
4. Agent domain veto (see below)
5. Runtime (process — frozen)
6. Code
```

### Domain tie-breakers

| Conflict | Final voice |
|----------|-------------|
| Product vs architecture | CPO (product) · CTO (feasibility) → CEO if deadlock |
| Child delight vs parent analytics | CPO + Game Director → **child wins** |
| Visual vs clarity | UX Director (flow) · Creative Director (brand) → CPO breaks tie |
| Security vs feature | **Security Lead wins** |
| Performance vs animation | Performance vs Game Director → reduce motion budget first |
| Quality vs date | **QA Director wins** on P0/P1 |
| Ship vs QA BLOCK | **QA Director** — CEO may delay business, not force P0 |
| Org/process | **AI Systems Architect** + CEO |

### Veto strength (strongest first)

1. **Security Lead** — Security QI must be 10  
2. **QA Director** — absolute ship veto · Quality Index floors  
3. **CEO** — strategic BLOCK (trust, focus)  
4. **CPO** — feature/product BLOCK  
5. **Game Director** — casino/shame BLOCK  
6. **Domain leads** — craft/technical BLOCK  
7. **AI Systems Architect** — governance process BLOCK  

Unresolved BLOCK → mission incomplete per Runtime.

---

## Work Flow Between Agents

```
User request
    → MISSION_ENGINE (Mission Brief)
    → TASK_ROUTER assigns Primary Owner
    → Primary Owner implements (IMPLEMENTATION_ENGINE)
    → Domain agents review (parallel checklist passes)
    → Each scores QUALITY_INDEX dimensions owned
    → REVIEW_ENGINE (runtime) validates 16 rows map to agents
    → QA Director enforces floors + test:gate
    → Release Manager if deploy mission
    → SELF_IMPROVEMENT_ENGINE queues next
```

**Handoff rule:** Owner produces artifact (plan, diff, PR section); next agent **never assumes** — reads artifact.

---

## Quality Index Ownership

| Dimension | Owner agent(s) |
|-----------|----------------|
| Architecture | CTO, Principal |
| Maintainability | Principal |
| Performance | Performance Lead |
| Accessibility | Accessibility Lead |
| Security | Security Lead |
| UX | UX Director |
| Visual Design | Creative Director |
| Animation | Art Director, Game Director |
| Game Feel | Game Director |
| Child Delight | Game Director |
| Parent Delight | CPO |
| Nintendo Score | Game Director |
| Apple Quality | CEO, Security |
| Long-term Product Value | CEO, CPO |
| Technical Debt | Principal |

Hard floors: `.ai/brain/QUALITY_INDEX.md`

---

## When to Invoke Which Agent

| User says… | Start with |
|------------|------------|
| New feature | CPO → UX → Game |
| Bug / broken | QA Director → domain Lead |
| Slow / jank | Performance Lead |
| Ugly / off-brand | Creative Director |
| Confusing flow | UX Director |
| Child feels wrong | Game Director |
| Security concern | Security Lead |
| Ship it | QA Director → Release Manager |
| Improve codebase idle | Principal → SELF_IMPROVEMENT |
| Org/rules broken | AI Systems Architect |

---

## Anti-Patterns

- Generic "LGTM" without agent hat  
- Skipping Game Director on child UI  
- Skipping Security on "small" API  
- CEO implementing code  
- Duplicate review prose instead of checklist + score  
- Expanding frozen COS into agents (reference, don't copy)  

---

## Export

Full copy: `/AI-AGENTS-ALL-DOCUMENTS-TEMP.md`

---

## Versioning

| Version | Change |
|---------|--------|
| **1.0** | Initial agent organization + brain |

Expand agents only when responsibility gap proven — via AI Systems Architect mission, not drive-by edits.
