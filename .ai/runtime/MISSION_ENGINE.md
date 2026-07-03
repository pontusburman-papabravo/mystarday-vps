# MISSION_ENGINE

**Version:** 1.0  
**Role:** Interpret user intent · extract goals · resolve ambiguity · escalate  
**Invoked:** WORKFLOW_ENGINE Phase 0

---

## Purpose

Convert any user message — vague or precise — into a **Mission Brief** Composer executes without further founder input.

---

## Mission tier (COS v1.1 — assign in Step 0)

| Tier | When | Assurance depth |
|------|------|-----------------|
| **T0** | Research, org audit, knowledge update | Org Health only |
| **T1** | Hotfix, test fix, lint | Owner + Security + QA |
| **T2** | Standard feature, bugfix, refactor | TASK_ROUTER reviewers (3–5) |
| **T3** | Architecture, world, auth, IAP, irreversible | Full review + Executive Council → RC |

**Rule M-T01:** Default T2. Downgrade to T1 only with blast radius `low` and no product behavior change. Upgrade to T3 when auth, payments, world pack, or migration irreversible.

---

## Mission Brief Template (required output)

```markdown
## Mission Brief
- **ID:** mission-YYYYMMDD-HHMM (session-local)
- **Tier:** T0 | T1 | T2 | T3
- **Raw intent:** "[user words]"
- **Mission type:** feature | bugfix | refactor | debt | docs-runtime-only
- **Primary goal:** [one sentence]
- **Success criteria:** [3–5 testable bullets]
- **Audience:** child | parent | admin | system | mixed
- **Surfaces:** [routes · files · APIs if known]
- **POS docs required:** [list]
- **PCB world(s):** [world slug or N/A]
- **COS playbooks:** [numbers or N/A]
- **Ambiguity resolved:** [decisions made]
- **Escalations:** [none | question for founder]
- **Out of scope:** [explicit list]
```

---

## Interpretation Protocol

### Step 1 — Extract goals

| Signal | Action |
|--------|--------|
| User says "fix" / "bug" / "broken" | Type = `bugfix`; goal = restore expected behavior |
| User says "add" / "build" / "implement" | Type = `feature`; run CPO gate via DECISION_ENGINE |
| User says "refactor" / "split" / "extract" | Type = `refactor`; no behavior change unless stated |
| User says "debt" / "cleanup" | Type = `debt`; link SELF_IMPROVEMENT category |
| User references POS/AOS/COS/PCB only | Type = `docs-runtime-only` if no code |

**Primary goal** = single sentence answering: *What is true when this mission succeeds?*

### Step 2 — Map to frozen governance

| If mission touches… | Read (minimum) |
|---------------------|----------------|
| Child UI / world | POS 04, 06, 09 · PCB world bible · AOS 030, 050 |
| Parent UI | POS 05 · AOS 040 |
| Rewards / stars | POS 07 · COS 004 |
| Onboarding / First Success | POS 02 · COS 002, 008 |
| Auth / child scope | POS 04, 10 · AOS 120 |
| Ship / release | COS 010 · AOS 150, 190 |
| Visual / motion | POS 03A, 03B · COS 005 |
| Any user-facing change | POS 00, 00A, 00B, 15 |

**Rule M-01:** Never invent product behavior not grounded in POS + ADR. If missing → escalate.

### Step 3 — Identify affected systems

```
grep / glob / route inventory → list:
  - HTML pages (public/)
  - JS modules (public/js/)
  - Routes (src/routes/)
  - DB (migrations/, db/)
  - SW/cache (public/sw.js, config/cache-version.json)
```

Mark **blast radius:** low | medium | high (high → Architect role mandatory per TASK_ROUTER).

### Step 4 — Ambiguity resolution (deterministic defaults)

When user did not specify, apply **defaults** — do not ask founder unless BLOCK:

| Ambiguity | Default | Escalate if |
|-----------|---------|-------------|
| Target audience | Infer from surfaces | Conflicts child + parent on same screen |
| Mobile vs desktop priority | Mobile portrait first (AOS 060) | Desktop-only admin exception |
| Scope breadth | Smallest POS-aligned slice | CPO six-month test fails |
| Quality vs speed | Quality (DECISION_ENGINE) | P0 live incident |
| Test depth | test:gate + regression for touched auth/path | — |
| Feature flag | Prefer incremental ship if high risk | CEO rule in COS 001 |
| Copy language | Swedish child/parent; English only on EN pages | — |
| Analytics events | Server allowlist first | New event without spec |

**Rule M-02:** Log every default in Mission Brief `Ambiguity resolved`.

### Step 5 — Conflict detection

| Conflict type | Resolution path |
|---------------|-----------------|
| User request vs POS | **POS wins** — propose POS-aligned alternative in brief |
| User request vs PCB world fiction | **PCB wins** for child world; refactor request |
| User request vs COS | COS for priority; POS for product truth |
| Code vs POS | Change code (WORKFLOW Phase 4+) |
| Two user goals in one message | Split into mission A + B; execute A first unless P0 |

### Step 6 — Escalation (HAG v1.2)

**Mandate check:** Can the next step continue without human input?

**Stop and escalate (HRC)** only when `.ai/company/HUMAN_APPROVAL_GATE.md` triggers apply:

1. Product Owner decision not inferable from POS/COS/ADR/PCB  
2. Canonical documentation conflict without ADR path  
3. Creative direction not inferable from existing docs  
4. Live deploy boundary (live hosts, stores, live migration, live flags)  
5. Business or legal decision  
6. Missing secret/asset that cannot be stubbed  
7. User explicitly requested founder decision  

**Do not escalate** for: ARC completion, IRC completion, draft PR, test green, next backlog mission.

### Blocked-ROI (when mission blocked)

1. Document HRC if human decision required  
2. Ask: *"Is there higher-ROI work I can do while waiting?"*  
3. Execute highest-value unblocked mission — tests, refactor, docs, next slice prep  
4. **Never idle** if productive work exists

Otherwise: **proceed with defaults** — select next highest-value mission.

---

## Mission Classification Matrix

| Class | Planner depth | Review depth |
|-------|---------------|--------------|
| `feature` child-facing | Full PLANNING + PCB | Full REVIEW_ENGINE |
| `feature` parent-only | Full PLANNING | Full minus Game if N/A |
| `bugfix` P0 | Abbreviated plan | QA + Security focus |
| `bugfix` P2+ | Standard | Standard |
| `refactor` | Plan with behavior parity proof | Principal + domain reviewers |
| `debt` | Link improvement ID from SELF_IMPROVEMENT | QA + CTO |
| `docs-runtime-only` | Scope = files listed | AI Systems Architect only |

---

## POS Usage Rules

| Rule | Detail |
|------|--------|
| M-P01 | Cite POS section IDs in plan and PR — not paraphrase-only |
| M-P02 | Do not duplicate POS into runtime artifacts |
| M-P03 | Constitution Rules 1–6 are hard BLOCK |
| M-P04 | Feature requests run CPO six questions (COS 002) before Phase 4 |
| M-P05 | Child world work requires PCB world bible section refs |

---

## Anti-Patterns

- Starting code before Mission Brief exists  
- Treating SYSTEM_ANALYSIS as spec  
- Asking founder preference questions with clear POS answer  
- Combining unrelated missions without user consent  
- Skipping PCB for "small" child visual changes  

---

## Completion

Mission Engine complete when Mission Brief is written and WORKFLOW Phase 1 can start with zero open escalations — or founder answered BLOCK escalation.
