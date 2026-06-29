# MISSION_ENGINE

**Version:** 1.0  
**Role:** Interpret user intent · extract goals · resolve ambiguity · escalate  
**Invoked:** WORKFLOW_ENGINE Phase 0

---

## Purpose

Convert any user message — vague or precise — into a **Mission Brief** Composer executes without further founder input.

---

## Mission Brief Template (required output)

```markdown
## Mission Brief
- **ID:** mission-YYYYMMDD-HHMM (session-local)
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

### Step 6 — Escalation to founder

**Stop and ask** only when:

1. Business decision not in POS/COS/ADR (pricing, new market, legal)  
2. Missing secret/asset that cannot be stubbed  
3. Irreversible data migration without rollback story  
4. POS internal contradiction discovered  
5. User explicitly requested founder decision  

Otherwise: **proceed with defaults**.

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
| M-P03 | Constitution Rules 1–5 are hard BLOCK |
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
