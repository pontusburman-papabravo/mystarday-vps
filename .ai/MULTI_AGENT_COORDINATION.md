# Multi-Agent Coordination

**Version:** 1.0  
**Owner:** AI Operations Lead · [roles/ai-operations.md](roles/ai-operations.md)  
**Applies to:** Any number of concurrent AI agents (Cursor, Cloud Agents, CLI, future models)

---

## Mission

Multiple agents work in parallel without corrupting each other's work, product truth, or live routines.

---

## Core Rules

1. **One branch per agent per mission** — never commit to another agent's branch without handoff  
2. **One PR owner per PR** — reviewer agents comment; only owner pushes  
3. **Canonical truth is shared** — POS/ADR/Team OS; working knowledge is not  
4. **Conflicts escalate** — do not force-push over another agent  
5. **Human merges** — agents never merge to `main` or frozen Team OS without [GOVERNANCE.md](GOVERNANCE.md) process

---

## Branch Ownership

| Rule | Detail |
|------|--------|
| **Naming** | `cursor/<descriptive>-<id>` or tool-equivalent prefix |
| **Claim** | First push establishes ownership |
| **Handoff** | Owner documents state in PR + Morning Report; next agent continues same branch only if assigned |
| **Abandon** | Close draft PR · note in `.ai/reports/` or issue |

---

## Folder Ownership (soft locks)

No hard filesystem locks. Use **dependency graph** + communication:

| Area | Typical owner | Parallel rule |
|------|---------------|---------------|
| `src/routes/auth/` | One agent per PR | Others wait or different subdomain |
| `public/js/dashboard*.js` | One agent | High conflict — coordinate via issue |
| `migrations/` | One agent per migration timestamp | **Never** two agents add migrations same millisecond prefix |
| `.ai/` Team OS | One agent per PR | Serialize doc changes |
| `test/` | Shared | Add files; avoid editing same test file |

**When two agents want the same file:** second agent **waits** or takes a different issue. Exception: reviewer agent does not push code.

---

## Agent Locking (convention)

Declare intent in PR description or issue comment:

```markdown
## Agent Lock
- **Agent:** cloud-agent-3915 / session-abc
- **Branch:** cursor/feature-x-3915
- **Folders:** src/routes/rewards/, test/rewards/
- **Until:** PR ready or YYYY-MM-DD HH:00 UTC
```

Second agent sees lock → **waits** or asks human to reassign.

No lock on read-only review or bug-hunt on unrelated paths.

---

## Parallel Execution

```
Agent A ── branch A ── PR A ──┐
Agent B ── branch B ── PR B ──┼── human review ── merge (human)
Agent C ── branch C ── PR C ──┘
```

**Allowed in parallel:**
- Different routes/modules
- Tests-only vs backend-only
- Docs-only vs code (different files)
- Bug fix vs refactor (zero overlap)

**Forbidden in parallel:**
- Same migration series
- Same large file (`dashboard.js`, `schedule.js`)
- Competing ADR drafts for same decision
- One agent merging while another rebases same branch

---

## Dependency Graph

Before starting, agent declares:

```markdown
## Dependencies
- **Blocked by:** PR #123 (auth refactor)
- **Blocks:** none
- **Touches:** weekly_schedule, family routes
```

Update when state changes. Agent **waits** if `Blocked by` is open and conflicting.

---

## Conflict Resolution

| Situation | Resolution |
|-----------|------------|
| Two PRs touch same file | Human prioritizes; loser rebases after winner merges |
| Contradicting implementations | Stop both · human picks · one PR closed |
| ADR draft conflicts | Architect hat reviews · single ADR |
| Agent pushed to wrong branch | Revert · cherry-pick to correct branch · notify human |
| Stale branch (>7 days) | Owner refreshes or closes; issue reopened |

**Winner:** Quality + POS alignment — not first-to-PR.

---

## PR Ownership

| Role | May push | May merge |
|------|----------|-----------|
| PR owner agent | Yes, own branch | No |
| Reviewer agent | No | No |
| Human | Yes | Yes |

Review agents leave comments and requested changes — they do not commit fixes unless explicitly assigned ownership handoff.

---

## Review Ownership

- **Code review workflow:** [workflows/code-review.md](workflows/code-review.md)  
- One primary reviewer hat sequence per PR (self-review multi-hat on owner)  
- External reviewer agent: read-only unless handoff documented  

---

## Communication Protocol

| Channel | Use |
|---------|-----|
| PR description | Scope · locks · dependencies · Morning Report |
| PR comments | Review · blockers · handoff |
| Issue | Mission assignment · locks · dependencies |
| `.ai/reports/YYYY-MM-DD.md` | Daily aggregate when multiple night agents |
| Escalation template | [HUMAN_ESCALATION.md](HUMAN_ESCALATION.md) |

**Handoff minimum:**

```markdown
## Agent Handoff
- **From:** agent/session id
- **To:** next agent or human
- **Branch:** ...
- **State:** done | partial | blocked
- **Next action:** one concrete step
- **Locks released:** yes/no
```

---

## When to Wait vs Continue

| Condition | Action |
|-----------|--------|
| Lock on your target folder | **Wait** or different task |
| Level 4 escalation open | **Wait** for human |
| Dependency PR unmerged + file overlap | **Wait** |
| Read-only review | **Continue** |
| Different subsystem, no lock | **Continue** |
| Night shift + forbidden category | **Stop** (not wait) |

---

## Morning Report (multi-agent)

- **One report per agent per session** in own PR  
- **Optional daily rollup:** `.ai/reports/YYYY-MM-DD.md` — AI Operations or last agent links all PRs  
- Template: [MORNING_REPORT.md](MORNING_REPORT.md) — include `Agent ID` field  

---

## References

- Shifts: [NIGHT_SHIFT.md](NIGHT_SHIFT.md) · [DAY_SHIFT.md](DAY_SHIFT.md)  
- Metrics: [AI_METRICS.md](AI_METRICS.md)  
- Knowledge: [KNOWLEDGE_MANAGEMENT.md](KNOWLEDGE_MANAGEMENT.md)
