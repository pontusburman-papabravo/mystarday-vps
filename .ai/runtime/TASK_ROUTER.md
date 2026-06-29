# TASK_ROUTER

**Version:** 1.0  
**Role:** Deterministic role ownership for every task type  
**Invoked:** WORKFLOW Phase 1 · IMPLEMENTATION · REVIEW

---

## Purpose

Given a mission or sub-task, output **primary owner**, **mandatory reviewers**, and **optional consultants** — no ambiguity about who must act.

---

## Routing Algorithm

```
1. Parse mission type + affected surfaces (from Mission Brief)
2. Match first row in Primary Routing Table (top = highest priority match)
3. Attach Mandatory Reviewers from matrix
4. If blast radius = high → add Architect + Security
5. If child-facing → add Game Director + UX Director + PCB check
6. Output routing record
```

---

## Routing Record Template

```markdown
## Task Routing
- **Task:** …
- **Primary owner:** [role]
- **Secondary:** [roles]
- **Mandatory reviewers:** [list]
- **PCB world:** [slug | N/A]
- **COS playbooks:** [ids]
```

---

## Primary Routing Table

| Task pattern | Primary owner | Secondary | Mandatory reviewers |
|--------------|---------------|-----------|---------------------|
| Child dashboard / Idag | Frontend + Game Engineer | UX Reviewer | Game Director, UX Director, QA, A11y |
| Min värld / world / Skattkammaren | Game Engineer + Frontend | Art Director | Game Director, Creative Director, PCB, QA |
| Animation / celebration / motion | Frontend + Game Engineer | — | Game Director, UX Director, Performance |
| Illustration / visual craft | Art Director (Creative) | Frontend | Creative Director, CPO if brand-level |
| Parent Hem / dashboard | Frontend | UX Reviewer | UX Director, CPO lens, QA |
| Onboarding / First Success | Frontend + Backend | Product Manager | CPO, UX Director, QA |
| API / route / auth | Backend Engineer | Architect if new domain | Security, QA, Principal |
| Database / migration | Database Engineer | Backend | Security, CTO lens, QA |
| Schema / validation / Zod | Backend Engineer | — | Security, QA |
| Auth / PIN / child scope | Security Engineer | Backend | QA, CTO |
| Performance / bundle / p95 | Performance Engineer | Frontend/Backend | QA |
| Accessibility audit fix | Accessibility Reviewer | Frontend | UX Director, QA |
| Mobile / PWA / Capacitor | Mobile Engineer | Frontend | UX, QA, Performance |
| Push / email / notifications | Backend | Product Manager | CPO, Security |
| Analytics event | Backend + Frontend | — | Analytics playbook (COS 009), QA |
| Admin panel | Frontend + Backend | — | QA, Security |
| Release / deploy / SW bump | Release Manager | QA Director | CTO, Release Command |
| Refactor extract module | Principal Engineer | Domain engineer | QA, Architect |
| Test gap / flake fix | QA Engineer | Domain engineer | — |
| Product copy SV child | Product Manager | — | CPO, Game Director |
| Product copy SV parent | Product Manager | — | CPO, UX Director |
| Payment / IAP | Backend + Mobile | — | CEO, CTO, Security, QA |
| SEO / landing | Frontend | Growth (COS 008) | CPO, Creative |
| PCB world content only | Creative + Game Director | — | CPO, Art Director |
| Runtime / AI platform | AI Systems Architect | — | CTO, Principal |
| Dependency upgrade | Principal Engineer | Security | QA, Performance |

---

## Multi-Role Execution Order

When multiple owners:

```
Architect (if structural) → Backend/data → API contract → Frontend UI → Motion → Copy → Tests
```

**Rule TR-01:** Same person may embody sequential roles in one session — but **REVIEW_ENGINE still requires distinct review passes**.

---

## Examples (deterministic)

| User request | Primary | Reviewers |
|--------------|---------|-----------|
| "Fix child login PIN lockout" | Backend + Security | Security, QA, UX |
| "Add confetti to star earn" | Frontend + Game | Game Director, UX, A11y, Performance |
| "Extract dashboard modal" | Principal + Frontend | Principal, QA |
| "New world room per PCB Garage" | Game + Frontend + Art | Game, Creative, PCB, QA |
| "Co-parent invite banner copy" | Product Manager + Frontend | CPO, Growth optional |
| "Migration add column X" | Database + Backend | Security, QA, CTO |

---

## Escalation Ownership

| Escalation type | Owner role |
|-----------------|------------|
| Product undefined | Product Manager → CPO playbook |
| Architecture fork | Architect → CTO playbook |
| Ship date vs quality | QA Director → Release Command |
| Brand / visual | Creative Director |
| Child motivation | Game Director |
| Security incident | Security Engineer → CTO |

---

## Anti-Patterns

- Frontend alone on authz change  
- Backend alone on child animation  
- Skipping Game Director on any Min värld change  
- Skipping Security on any auth/data change  
- Release Manager implementing feature code  

---

## Cross-References

- Role definitions: `.ai/AGENTS.md`  
- Executive judgment: `.ai/company/` playbooks  
- Review execution: REVIEW_ENGINE  

---

## Completion

Routing complete when every in-scope task in Execution Plan has primary owner + mandatory reviewers listed.
