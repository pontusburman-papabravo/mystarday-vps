# ALL DOCUMENTS — Autonomous AI Development Platform v1.0
# Temp export — copy entire file (Cmd+A, Cmd+C)


================================================================================
FILE: .ai/runtime/README.md
================================================================================

# Autonomous AI Development Platform — Runtime

**Version:** 1.0  
**Status:** Controls how Cursor Composer 2.5 develops Stjärndag  
**Type:** Runtime control plane — **not** product governance (frozen v1.0)

---

## What This Is

The **runtime layer** that turns a feature request into a shipped PR **without founder prompts**. Governance defines *what* and *why*; runtime defines *how Composer executes*.

| Layer | Location | Frozen? |
|-------|----------|---------|
| POS | `product-operating-system/` | v1.0 ✓ |
| COS | `.ai/company/` | v1.0 ✓ |
| PCB | `product-content-bible/` | v1.0 ✓ |
| AOS | `.ai/` + `.cursor/rules/` (000–190) | v1.0 ✓ |
| **Runtime** | `.ai/runtime/` (here) | v1.0 — this platform |

**Do not expand frozen layers.** Runtime may only reference them. Fix contradictions via ADR in POS `14` — not silent edits.

---

## Session Bootstrap (every Composer start)

```
1. Read WORKFLOW_ENGINE.md          ← master pipeline
2. Read MISSION_ENGINE.md           ← if user gave intent
3. Load TASK_ROUTER.md              ← assign roles
4. Execute phases via engines below
5. Exit only when QA_ENGINE + REVIEW_ENGINE pass
```

| Engine | Purpose |
|--------|---------|
| [WORKFLOW_ENGINE.md](./WORKFLOW_ENGINE.md) | End-to-end deterministic pipeline |
| [MISSION_ENGINE.md](./MISSION_ENGINE.md) | Interpret requests · extract goals · escalate |
| [PLANNING_ENGINE.md](./PLANNING_ENGINE.md) | Scope · POS map · acceptance criteria |
| [DECISION_ENGINE.md](./DECISION_ENGINE.md) | Deterministic approve/veto framework |
| [TASK_ROUTER.md](./TASK_ROUTER.md) | Role ownership by task type |
| [IMPLEMENTATION_ENGINE.md](./IMPLEMENTATION_ENGINE.md) | Build sequence · craft bar |
| [QA_ENGINE.md](./QA_ENGINE.md) | Automated gates — nothing ships without pass |
| [REVIEW_ENGINE.md](./REVIEW_ENGINE.md) | 16-perspective self-review · veto resolution |
| [SELF_IMPROVEMENT_ENGINE.md](./SELF_IMPROVEMENT_ENGINE.md) | Idle debt · polish · next improvement |

---

## Authority on Conflict

```
POS > COS > PCB > AOS > Runtime > code
```

Runtime **never overrides** governance. When a reviewer disagrees, apply [REVIEW_ENGINE.md § Conflict Resolution](./REVIEW_ENGINE.md#conflict-resolution).

---

## Completion Definition

A mission is **complete** when:

1. `QA_ENGINE` — all gates green  
2. `REVIEW_ENGINE` — zero unresolved BLOCK vetoes  
3. `DECISION_ENGINE` — all seven questions pass or N/A documented  
4. Commit pushed · PR opened · self-review artifact in PR body  

---

## Export

Combined copy file: `/AI-RUNTIME-ALL-DOCUMENTS-TEMP.md`

---

## Versioning

| Version | Change |
|---------|--------|
| **1.0** | Initial runtime platform |

Expand runtime only when execution gaps found — not to duplicate governance.

================================================================================
FILE: .ai/runtime/WORKFLOW_ENGINE.md
================================================================================

# WORKFLOW_ENGINE

**Version:** 1.0  
**Role:** Master deterministic pipeline for every mission  
**Invoked:** Start of every Composer session with work intent

---

## Purpose

Define **exactly** how Composer behaves from mission start until PR is ready. No shortcuts. No skipped reviews. No assumptions.

---

## Pipeline (mandatory order)

```
PHASE 0  MISSION_INTAKE          → MISSION_ENGINE
PHASE 1  PLANNING                → PLANNING_ENGINE + TASK_ROUTER
PHASE 2  RESEARCH                → Read POS · grep codebase · SYSTEM_ANALYSIS (context)
PHASE 3  ARCHITECTURE            → Design note · risks · DECISION_ENGINE pre-check
PHASE 4  IMPLEMENTATION          → IMPLEMENTATION_ENGINE
PHASE 5  TEST_EXECUTION          → QA_ENGINE (tests)
PHASE 6  STATIC_ANALYSIS         → QA_ENGINE (lint)
PHASE 7  SPECIALIST REVIEWS      → Performance · A11y · Mobile UX · Security
PHASE 8  GOVERNANCE REVIEWS      → POS · AOS · COS · PCB alignment
PHASE 9  EXECUTIVE REVIEWS       → CTO · CPO · Game · UX · Art · QA
PHASE 10 REVIEW_ENGINE           → 16 perspectives · resolve vetoes
PHASE 11 REFACTOR                → Simplify · dedupe · no behavior change unless fix
PHASE 12 COMMIT_PUSH             → Conventional message · POS cites
PHASE 13 PR                      → Template body · checklist
PHASE 14 SELF_IMPROVEMENT        → SELF_IMPROVEMENT_ENGINE (next item or idle)
```

**Rule W-01:** Cannot enter phase N+1 while phase N has an open **BLOCK**.

**Rule W-02:** Phases 5–10 may iterate in a loop (`fix → re-run`) until green.

**Rule W-03:** Single-phase hotfix (P0) may skip phases 8–9 only with QA Director + CTO BLOCK waived in writing in PR — never skip 5–7 or 10.

---

## Phase Detail

### PHASE 0 — Mission intake

| Step | Action | Output |
|------|--------|--------|
| 0.1 | Parse user message | Raw intent string |
| 0.2 | Run MISSION_ENGINE | Mission brief |
| 0.3 | If BLOCK ambiguity | Escalate or default per MISSION_ENGINE |
| 0.4 | Classify mission type | `feature` · `bugfix` · `refactor` · `debt` · `docs-runtime-only` |

### PHASE 1 — Planning

| Step | Action | Output |
|------|--------|--------|
| 1.1 | TASK_ROUTER → primary + secondary roles | Role assignment |
| 1.2 | PLANNING_ENGINE → scope in/out | Plan artifact |
| 1.3 | List affected systems | File/route/surface list |
| 1.4 | Acceptance criteria | Testable bullets with POS refs |

### PHASE 2 — Research

| Step | Action | Output |
|------|--------|--------|
| 2.1 | Read POS minimum + domain docs | Citation list |
| 2.2 | Read PCB if child/world surface | World bible ref or N/A |
| 2.3 | Read COS playbook if executive decision | Playbook ref or N/A |
| 2.4 | Grep codebase for symbols/routes | Existing implementation map |
| 2.5 | Read SYSTEM_ANALYSIS.md | Context only — never authority |

### PHASE 3 — Architecture

| Step | Action | Output |
|------|--------|--------|
| 3.1 | Propose design (minimal diff) | Design note |
| 3.2 | Risk analysis | Risk table (data · auth · child · perf) |
| 3.3 | DECISION_ENGINE pre-check | Pass or BLOCK before code |

### PHASE 4 — Implementation

Follow IMPLEMENTATION_ENGINE exactly.

### PHASE 5 — Test execution

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false \
  env -u RESEND_API_KEY -u RESEND_API_KEY_WEEKLY \
  npm run test:gate
```

Add/adjust tests per QA_ENGINE. Loop until green.

### PHASE 6 — Static analysis

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
npm run lint
```

If Tailwind/classes touched: `npm run check:css` when applicable.

### PHASE 7 — Specialist reviews (checklists)

| Review | Engine section | BLOCK triggers |
|--------|----------------|----------------|
| Performance | QA_ENGINE § Performance | p95 regression · bundle bloat on child path |
| Accessibility | QA_ENGINE § A11y | Critical WCAG on child/parent primary path |
| Mobile UX | QA_ENGINE § Mobile | <44px child targets · broken portrait |
| Security | QA_ENGINE § Security | Authz gap · secret · child scope leak |

### PHASE 8 — Governance reviews

| Source | Question |
|--------|----------|
| POS | Violates Constitution · domain rules · QS-15? |
| AOS | Violates 000-core · 190 DoD · applicable .mdc? |
| COS | CPO/CEO veto rules triggered? |
| PCB | World fiction drift? |

Any **BLOCK** → fix before phase 10.

### PHASE 9 — Executive reviews (lightweight)

Apply DECISION_ENGINE seven questions from CPO/CTO/Game/UX/Art/QA lens. Document in PR review table.

### PHASE 10 — REVIEW_ENGINE

Full 16-reviewer pass. Resolve all BLOCK vetoes.

### PHASE 11 — Refactor

- Remove duplication introduced or touched  
- No new scope  
- Must stay green through phase 5–6  

### PHASE 12 — Commit & push

Per `.cursor/rules/170-git-workflow.mdc`. Message includes POS refs for user-facing work.

### PHASE 13 — PR

Body must include:

- Summary (1 paragraph)  
- POS citations  
- QA_ENGINE checklist (all checked)  
- REVIEW_ENGINE table (16 rows)  
- Test commands run  

### PHASE 14 — Self-improvement

If mission complete and capacity remains → SELF_IMPROVEMENT_ENGINE picks next item. Else stop.

---

## Mission Type Shortcuts (allowed only where noted)

| Type | Phases skippable | Never skip |
|------|------------------|------------|
| `bugfix` P0 | 9 (exec) if QA approves | 5–7, 10 |
| `refactor` | 8 PCB if no child UI | 5–6, 10, DECISION |
| `debt` | 8–9 if backend-only | 5–6, 10 |
| `docs-runtime-only` | 4–7 if no code | PLANNING, REVIEW_ENGINE doc row |

---

## Determinism Rules

| ID | Rule |
|----|------|
| W-D01 | Same mission brief + same codebase → same phase order |
| W-D02 | BLOCK always beats speed |
| W-D03 | "Looks fine" is not a gate pass — command output or checklist required |
| W-D04 | Founder silence ≠ approval; only gates = approval |
| W-D05 | One mission per branch unless user specifies batch |

---

## Artifacts (per mission)

Create in working memory / PR — not necessarily committed files:

1. **Mission brief** (MISSION_ENGINE template)  
2. **Plan** (PLANNING_ENGINE template)  
3. **Risk table**  
4. **Review table** (REVIEW_ENGINE)  
5. **QA checklist** (QA_ENGINE)  

---

## Cross-References

- Intake: MISSION_ENGINE  
- Roles: TASK_ROUTER  
- Build: IMPLEMENTATION_ENGINE  
- Gates: QA_ENGINE  
- Vetoes: REVIEW_ENGINE  
- Judgment: DECISION_ENGINE  
- Next work: SELF_IMPROVEMENT_ENGINE  

---

## Completion

Workflow complete when PHASE 13 PR is open and PHASE 10 has zero BLOCK rows.

================================================================================
FILE: .ai/runtime/MISSION_ENGINE.md
================================================================================

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

================================================================================
FILE: .ai/runtime/PLANNING_ENGINE.md
================================================================================

# PLANNING_ENGINE

**Version:** 1.0  
**Role:** Scope · dependencies · acceptance criteria · POS traceability  
**Invoked:** WORKFLOW_ENGINE Phase 1

---

## Purpose

Turn Mission Brief into an **executable plan** every role can follow without reinterpretation.

---

## Plan Template (required output)

```markdown
## Execution Plan
- **Mission ID:** [from brief]
- **Primary role(s):** [TASK_ROUTER]
- **Blast radius:** low | medium | high

### In scope
1. …

### Out of scope
1. …

### Affected systems
| System | Files/routes | Change type |
|--------|--------------|-------------|

### POS traceability
| Acceptance criterion | POS ref | Verify by |
|----------------------|---------|-----------|

### Dependencies
- [ ] DB migration? …
- [ ] SW bump? …
- [ ] New analytics event? …

### Test plan
| Test | Command / manual |
|------|------------------|

### Risks (preview)
| Risk | Severity | Mitigation |
|------|----------|------------|

### Sequence
1. …
```

---

## Planning Protocol

### Step 1 — Scope bounding

Apply **minimum shippable slice**:

- One primary user outcome per mission  
- Defer "nice" to SELF_IMPROVEMENT backlog  
- If CPO six-month test fails → cut scope or stop  

### Step 2 — System identification

Use deterministic search order:

1. `docs/route-inventory-pre-split.md` or `npm run dump:routes`  
2. Grep feature keywords in `src/` and `public/js/`  
3. Check `public/*.html` for page ownership  
4. Note `public/sw.js` if static assets change  

Record **change type:** add | modify | delete | extract

### Step 3 — Acceptance criteria

Each criterion must be:

- **Testable** — pass/fail observable  
- **POS-linked** — section or rule ID  
- **Owned** — which QA check verifies it  

Minimum counts:

| Mission type | Min criteria |
|--------------|--------------|
| feature | 3 |
| bugfix | 1 (regression + fix) |
| refactor | 2 (parity + tests green) |
| debt | 2 |

### Step 4 — Dependency checklist

| Dependency | Trigger |
|------------|---------|
| Migration | Schema change |
| SW / cache version | Any `public/` JS/CSS/HTML precache |
| Feature flag | Risky rollout |
| Email template | New parent email |
| Analytics allowlist | New client event |
| PCB art | New child world asset |
| i18n | New user-visible string batch |

### Step 5 — Sequence design

Default implementation order:

```
shared lib / schema → API → server logic → client data layer → UI → motion → copy → tests
```

Child-facing: wireframe mentally at 375px **before** desktop.

### Step 6 — Plan approval (self)

Plan approved when:

- [ ] DECISION_ENGINE pre-check passes on stated scope  
- [ ] No unresolved TASK_ROUTER role gaps  
- [ ] Test plan covers every acceptance criterion  
- [ ] Out of scope explicitly includes adjacent temptations  

---

## CPO Feature Gate (embedded)

For `feature` missions, plan must answer COS 002:

| # | Question | Plan section |
|---|----------|--------------|
| 1 | Why does this exist? | In scope #1 |
| 2 | Reduce parent stress? | POS traceability |
| 3 | Increase child independence? | POS traceability |
| 4 | Delight children? | PCB / POS 04 |
| 5 | Delight parents? | POS 05 |
| 6 | Six months test? | Out of scope or justify |

Any **no** without ADR → BLOCK plan.

---

## Anti-Patterns

- Plans without file paths  
- "Update UI" without surface name  
- Missing test plan  
- Scope creep hidden in "also fix"  
- Parallel systems (new route tree duplicating old)  

---

## Completion

Planning complete when Execution Plan exists and WORKFLOW Phase 2 research list is derivable from Affected systems table.

================================================================================
FILE: .ai/runtime/DECISION_ENGINE.md
================================================================================

# DECISION_ENGINE

**Version:** 1.0  
**Role:** Deterministic approve / veto for every significant choice  
**Invoked:** PLANNING (pre-check) · IMPLEMENTATION (per decision) · REVIEW (final)

---

## Purpose

Remove founder judgment from routine decisions. Every choice passes the **Seven Questions** or receives an explicit **BLOCK** with resolution path.

---

## The Seven Questions (mandatory)

Each decision record must answer all seven. **Fail any applicable = BLOCK.**

| # | Question | Pass condition | N/A when |
|---|----------|----------------|----------|
| Q1 | **Is this better for the child?** | Improves capability, independence, delight, or safety; never guilt/shame/comparison | Pure admin/backend with zero child effect |
| Q2 | **Is this better for the parent?** | Reduces stress, confusion, or nagging; builds trust | Pure child delight with no parent surface |
| Q3 | **Does this align with POS?** | Cite section; no Constitution violation | Never N/A for user-facing |
| Q4 | **Does it reduce complexity?** | Fewer concepts, files, or branches vs status quo | Replacement requires temporary dual path — must have expiry |
| Q5 | **Does it improve long-term maintainability?** | Easier to test, read, extend in 2 years | — |
| Q6 | **Would Apple ship this?** | Privacy clear · no dark patterns · native-quality polish on touched surfaces | Backend-only |
| Q7 | **Would Nintendo be proud of this?** | Fair · no casino · child respected · delight skippable | Non-child non-game backend |

**Rule D-01:** N/A requires one-sentence justification in decision log.

---

## Decision Record Template

```markdown
### Decision: [short title]
- **Context:** …
- **Options considered:** A · B · C
- **Chosen:** B
| Q1 | Q2 | Q3 | Q4 | Q5 | Q6 | Q7 |
|----|----|----|----|----|----|-----|
| ✓ | ✓ | ✓ | ✓ | ✓ | N/A | ✓ |
- **POS refs:** …
- **Reviewer flags:** none | [role]: concern
```

---

## Deterministic Scoring

When multiple options pass all questions, tie-break **in order**:

1. **Smaller diff** (lines + files)  
2. **Fewer new dependencies**  
3. **Better test coverage path**  
4. **POS-explicit pattern** over novel pattern  
5. **Deletion** over addition  

**Rule D-02:** If still tied → choose option that removes duplicate system.

---

## Automatic BLOCK Triggers

No scoring — immediate BLOCK:

| Trigger | Source |
|---------|--------|
| Violates Constitution Rules 1–5 | POS 00 |
| G-01–G-08 violation | POS 06 |
| W-01–W-05 violation | POS 09 |
| C-01–C-08 violation | POS 04 |
| Global paywall on child path | ADR / COS 003 |
| Client-only auth or unlock | AOS 120, COS 003 |
| Login reward / loot box / shame streak | COS 004 |
| Secret in repo | AOS 120 |
| Duplicated coach / journey brain | POS 02, COS 002 |
| PCB world fiction break | PCB world bible |
| Adds TODO/hack without ticket | AOS 000 |

---

## Escalation Matrix

| Situation | Escalate to | Runtime action |
|-----------|-------------|----------------|
| Q3 fail but user insists | Founder + ADR draft | Stop Phase 4 |
| Q6/Q7 conflict (parent analytics vs child) | CPO lens in REVIEW | CPO wins child |
| Q4 vs Q5 conflict (quick hack vs maintainable) | CTO lens | Maintainable wins unless P0 |
| New monetization | CEO playbook | Stop |
| New child data field | CEO + Security | Stop |

---

## Decision Points (when to invoke)

| When | Required |
|------|----------|
| Scope approval | All 7 on mission scope |
| Architecture fork (2+ designs) | Per option + tie-break |
| Dependency add (npm, service) | All 7 + CTO |
| UX copy child-facing | Q1, Q3, Q7 |
| UX copy parent-facing | Q2, Q3 |
| Delete vs deprecate | Q4, Q5 |
| Ship with known P2 | QA + CPO waive documented |

---

## Integration

- **MISSION_ENGINE** — defaults must pass Q1–Q3  
- **PLANNING_ENGINE** — plan blocked if scope fails  
- **IMPLEMENTATION_ENGINE** — mid-build forks re-run engine  
- **REVIEW_ENGINE** — reviewers cite Q1–Q7 failures as BLOCK  
- **QA_ENGINE** — automatic BLOCK triggers overlap  

---

## Anti-Patterns

- "We'll fix complexity later" (Q4 fail)  
- "Parents asked for dashboard" without Q2 stress proof  
- "Industry standard" without Q3 POS cite  
- Waiving Q7 for "just this once" on child UI  

---

## Completion

Decision Engine satisfied when every recorded decision in mission has seven answers and zero unresolved BLOCK triggers.

================================================================================
FILE: .ai/runtime/TASK_ROUTER.md
================================================================================

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

================================================================================
FILE: .ai/runtime/IMPLEMENTATION_ENGINE.md
================================================================================

# IMPLEMENTATION_ENGINE

**Version:** 1.0  
**Role:** How features are built — mandatory sequence and craft bar  
**Invoked:** WORKFLOW Phase 4

---

## Purpose

Define **exact build behavior** so implementation is consistent, minimal, and reversible.

---

## Mandatory Sequence

No step may be skipped. Loop back on failure.

```
1. Understand      ← Mission Brief + Plan
2. Research        ← grep · read touched files (chunk large files per large-files.mdc)
3. Design          ← design note · DECISION_ENGINE on fork
4. Risk Analysis   ← data · auth · child · perf table
5. Implementation  ← code · minimal diff
6. Testing         ← unit/integration per QA_ENGINE
7. Visual QA       ← 375px portrait mental pass · key flows
8. Accessibility   ← contrast · target size · reduced motion path
9. Performance     ← no hot-path regression
10. Refactoring    ← simplify touched code · dedupe
11. Documentation  ← comments only if non-obvious · ADR if architecture · PR body
12. Commit         ← 170-git-workflow.mdc
```

**Rule I-01:** Steps 6–9 re-run after any change in 5 or 10.

---

## Pre-Implementation Gates

Before writing code:

- [ ] Mission Brief exists  
- [ ] Execution Plan exists  
- [ ] TASK_ROUTER roles assigned  
- [ ] DECISION_ENGINE pre-check pass  
- [ ] POS domain docs read (listed in brief)  
- [ ] PCB world bible read if child world  
- [ ] Large files: grep first, chunk read (`.cursor/rules/large-files.mdc`)  

---

## Implementation Rules

### Scope

| Rule | Detail |
|------|--------|
| I-S01 | Smallest diff that satisfies acceptance criteria |
| I-S02 | No drive-by refactors outside plan |
| I-S03 | New features in new small files when file >2500 tokens trend |
| I-S04 | Match surrounding naming, patterns, error handling |
| I-S05 | No new dependency without DECISION_ENGINE + CTO |

### Child surfaces

| Rule | Detail |
|------|--------|
| I-C01 | One primary action per screen (POS C-03) |
| I-C02 | Celebrations ≤2s, skippable (03B) |
| I-C03 | No forms except PIN (C-01) |
| I-C04 | Server enforces scope — never client-only (C-08) |
| I-C05 | PCB visual/audio/motion language respected |

### Parent surfaces

| Rule | Detail |
|------|--------|
| I-P01 | Build on Planering, run on Hem (POS 08 B-08) |
| I-P02 | Destructive confirms plain Swedish |
| I-P03 | Mobile-first density with clear hierarchy |

### Backend

| Rule | Detail |
|------|--------|
| I-B01 | Parameterized SQL · authz helpers per route |
| I-B02 | Zod validate on inputs |
| I-B03 | Unlock/progression server-side (W-01) |
| I-B04 | Errors logged server-side; safe messages client-side |

### Frontend

| Rule | Detail |
|------|--------|
| I-F01 | Prefer extend module over monolith growth |
| I-F02 | SW/cache version if static assets change |
| I-F03 | No inline secrets or env in public/ |

---

## Visual QA Protocol (step 7)

Checklist for touched UI:

- [ ] 375×667 portrait — primary action visible without scroll?  
- [ ] Loading / empty / error states exist  
- [ ] Swedish copy · no English leaks on child surfaces  
- [ ] Touch targets child ≥44px  
- [ ] Matches 03A / 00B — not on "cheap" list  
- [ ] Motion per 03B · reduced motion path  
- [ ] No duplicate nav / confused icons (historical class)  

---

## Accessibility Protocol (step 8)

- [ ] Contrast AA on text/buttons touched  
- [ ] Focus order sane on parent flows  
- [ ] Reduced motion disables non-essential animation  
- [ ] Not color-only state encoding  

---

## Performance Protocol (step 9)

- [ ] No new sync heavy work on child Today path  
- [ ] Images sized appropriately  
- [ ] No N+1 queries on hot routes  
- [ ] Large DOM avoided on schedule views  

---

## Refactoring Protocol (step 10)

After green tests:

- Remove duplication introduced  
- Extract only if reuse ≥2 call sites **in plan**  
- Delete dead code touched  
- Rename for clarity if confusing  

**Rule I-02:** Refactor must not expand scope — behavior parity required.

---

## Documentation Protocol (step 11)

| Change type | Document |
|-------------|----------|
| Architecture / authority | ADR in POS 14 (founder review) |
| New route | route inventory if batch |
| User-facing | PR body + release notes fragment |
| Runtime only | PR body |

Do **not** create new governance docs (frozen v1.0).

---

## Commit Protocol (step 12)

- Imperative subject ≤72 chars  
- Body: what · why · POS refs · test commands  
- One logical change per commit when possible  
- Secret scanner clean  

---

## Anti-Patterns

- Code before design note  
- Full read of schedule.js / dashboard.js  
- Client-only permission checks  
- Global subscription middleware  
- Child settings screen  
- Star inflation / login bonus  
- Commit without tests when tests exist for area  

---

## Completion

Implementation Engine complete when sequence 1–12 done for plan scope and WORKFLOW hands off to QA_ENGINE Phase 5.

================================================================================
FILE: .ai/runtime/QA_ENGINE.md
================================================================================

# QA_ENGINE

**Version:** 1.0  
**Role:** Automated and procedural quality gates — nothing complete until all pass  
**Invoked:** WORKFLOW Phases 5–7 · final gate before PR

---

## Purpose

Convert quality standards into **binary pass/fail gates**. No subjective "looks okay."

---

## Master Gate Checklist

**Mission incomplete if ANY unchecked.**

### Tests

- [ ] **G-TEST-01** `npm run test:gate` exit 0  
- [ ] **G-TEST-02** New behavior has regression test when touching auth, paywall, IAP, child scope, journey  
- [ ] **G-TEST-03** Flaky tests not ignored — fix or quarantine with owner  
- [ ] **G-TEST-04** DB tests use advisory lock pattern when applicable  

**Command (Cloud VM):**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false \
  env -u RESEND_API_KEY -u RESEND_API_KEY_WEEKLY \
  npm run test:gate
```

### Static analysis

- [ ] **G-LINT-01** `npm run lint` — 0 errors (warnings unchanged budget OK)  
- [ ] **G-LINT-02** `npm run check:css` if Tailwind/classes changed  

### POS compliance

- [ ] **G-POS-01** Constitution Rules 1–5 satisfied  
- [ ] **G-POS-02** Applicable domain rules (04–09, 03A/B, 06A) satisfied  
- [ ] **G-POS-03** `15_PRODUCT_QUALITY_STANDARD.md` applicable sections pass  
- [ ] **G-POS-04** POS citations in PR for user-facing work  

### AOS compliance

- [ ] **G-AOS-01** Applicable `.cursor/rules/*.mdc` satisfied  
- [ ] **G-AOS-02** `190-definition-of-done.mdc` all boxes true  
- [ ] **G-AOS-03** `180-self-review.mdc` eight roles addressed  

### COS compliance

- [ ] **G-COS-01** CPO feature gate passed (features only)  
- [ ] **G-COS-02** QA Director severity — no open P0/P1  
- [ ] **G-COS-03** Release Command checklist if release mission  

### PCB compliance

- [ ] **G-PCB-01** Child world changes match world bible fiction (or N/A)  
- [ ] **G-PCB-02** No generic asset-store world aesthetic (00B)  

### Code quality

- [ ] **G-CODE-01** No duplicated logic in touched code  
- [ ] **G-CODE-02** No dead code introduced  
- [ ] **G-CODE-03** No TODO / FIXME / hacks  
- [ ] **G-CODE-04** No magic numbers without named constants  
- [ ] **G-CODE-05** New code simpler than replaced (subjective → Principal review if dispute)  

### UX

- [ ] **G-UX-01** No obvious broken flows on touched surfaces  
- [ ] **G-UX-02** Empty/error states handled  
- [ ] **G-UX-03** Child: one primary action preserved  
- [ ] **G-UX-04** No dark patterns (COS 001)  

### Accessibility

- [ ] **G-A11Y-01** No new critical contrast failures  
- [ ] **G-A11Y-02** Touch targets child ≥44px on touched screens  
- [ ] **G-A11Y-03** Reduced motion path for new animations  
- [ ] **G-A11Y-04** Not color-only critical state  

### Mobile

- [ ] **G-MOB-01** 375px portrait layout sane  
- [ ] **G-MOB-02** No desktop-only assumptions on parent primary flows  
- [ ] **G-MOB-03** PWA SW bumped if static assets changed  

### Performance

- [ ] **G-PERF-01** No deliberate hot-path blocking work added  
- [ ] **G-PERF-02** No large unoptimized assets added  
- [ ] **G-PERF-03** Query count not regressed on touched API without reason  

### Security

- [ ] **G-SEC-01** Authz on new/changed routes  
- [ ] **G-SEC-02** No secrets in repo  
- [ ] **G-SEC-03** Child data scope enforced server-side  
- [ ] **G-SEC-04** No PII in analytics metadata  

---

## Severity → Gate Mapping

| COS QA severity | Gate behavior |
|-----------------|---------------|
| P0 | **BLOCK** merge |
| P1 | **BLOCK** merge |
| P2 | Merge only with CPO + QA written waive in PR |
| P3/P4 | Track · fix or batch |

---

## Gate Execution Order

```
1. G-TEST-* (must be first — blocks all)
2. G-LINT-*
3. G-CODE-*
4. G-SEC-*
5. G-POS-* / G-AOS-* / G-COS-* / G-PCB-*
6. G-UX-* / G-A11Y-* / G-MOB-*
7. G-PERF-*
```

---

## Failure Loop

```
fail gate → diagnose → fix → re-run from failed category → document in PR
```

Max iterations: unlimited until pass or escalate BLOCK to founder.

---

## Waivers

Only **P2+** waivers allowed. Template in PR:

```markdown
**Waiver:** G-UX-02 empty state deferred
**Severity:** P2
**Approver:** CPO + QA Director (self-review hats)
**Expiry:** next release
**Ticket:** …
```

P0/P1 waivers forbidden except CEO written ADR for live incident.

---

## Anti-Patterns

- Skipping test:gate "docs only" when SW precache changed  
- Lint errors ignored  
- "Manual test only" without checklist  
- Waiving G-SEC-* without Security review pass  

---

## Completion

QA Engine complete when every applicable checkbox in Master Gate Checklist is checked or valid waiver attached.

================================================================================
FILE: .ai/runtime/REVIEW_ENGINE.md
================================================================================

# REVIEW_ENGINE

**Version:** 1.0  
**Role:** 16-perspective self-review · every reviewer can BLOCK · resolve before complete  
**Invoked:** WORKFLOW Phases 9–10 · before PR merge

---

## Purpose

Simulate a world-class product org review in one Composer session. **Any BLOCK veto stops completion** until resolved or waived per QA_ENGINE rules.

---

## Review Table Template (required in PR)

```markdown
| Reviewer | Verdict | BLOCK? | Notes |
|----------|---------|--------|-------|
| CEO | pass/fail/waive | Y/N | |
| CPO | … | | |
| … | | | |
```

**Verdicts:** `pass` · `fail` (BLOCK) · `waive` (P2+ only, documented) · `n/a`

---

## Reviewers (all mandatory unless n/a justified)

| # | Reviewer | Lens | BLOCK if… | Primary refs |
|---|----------|------|-----------|--------------|
| 1 | **CEO** | Trust · focus · ten-year product | Vanity growth · trust betrayal · scope creep vs mission | COS 001 |
| 2 | **CPO** | First Success · feature gate · coach singularity | Feature fails 6 questions · fragments journey | COS 002, POS 02 |
| 3 | **CTO** | Architecture · ten-year · auth | Client-only security · migration risk · global paywall | COS 003, POS 10 |
| 4 | **Principal Engineer** | Simplicity · dedupe · craft | Complexity up · duplicate systems · untested auth path | AOS 000, 140 |
| 5 | **Senior Frontend Engineer** | UI modules · mobile · state | Monolith growth · broken portrait · state desync | AOS 070, 060 |
| 6 | **Senior Backend Engineer** | Routes · validation · SQL | Missing authz · N+1 · error swallow | AOS 080, 100 |
| 7 | **Senior Mobile Engineer** | PWA · WebView · native gaps | iOS/Android broken path · safe-area · touch | AOS 060 |
| 8 | **Game Director** | Motivation · fair play · world as reward | Login bonus · shame · casino · grind | COS 004, POS 06 |
| 9 | **Creative Director** | Handcrafted · 03A · premium | Cheap UI · stock art · style drift | COS 005, POS 03A |
| 10 | **Art Director** | Illustration · color · composition | AD violations · neon clutter · mixed styles | POS 03A, 00B |
| 11 | **UX Director** | Flow · load · child clarity | Dead ends · modal stacks · icon-only child nav | COS 006, POS 04 |
| 12 | **Accessibility Specialist** | WCAG · motor · cognitive | Critical a11y fail · no reduced motion | POS 03, 15 |
| 13 | **QA Director** | Severity · regression · ship | P0/P1 open · test:gate red · child path untested | COS 007 |
| 14 | **Security Engineer** | Auth · data · secrets | Authz hole · PII leak · secret committed | AOS 120 |
| 15 | **Performance Engineer** | p95 · bundle · battery | Hot path regression · huge assets | AOS 110 |
| 16 | **AI Systems Architect** | Runtime · governance boundary | Expanded frozen docs · skipped workflow · non-determinism | `.ai/runtime/` |

---

## Review Protocol (per reviewer)

For each row, execute **60-second structured pass**:

```
1. Read diff scope (files touched)
2. Apply reviewer BLOCK if table above
3. Run DECISION_ENGINE seven questions from that lens
4. Record pass | fail | n/a (one sentence evidence)
5. If fail → tag fix owner via TASK_ROUTER
```

**Rule R-01:** `n/a` requires: "No touch to [domain]" — not laziness.

---

## Child-Facing Missions (expanded pass)

When `audience` includes child, reviewers **8–12 cannot be n/a**.

When Min värld / PCB: reviewers **8–10** must cite PCB section.

---

## Backend-Only Missions (n/a allowed)

| Reviewer | n/a when |
|----------|----------|
| Game Director | Zero child/motivation effect |
| Creative Director | Zero visual/copy |
| Art Director | Zero visual |
| UX Director | Zero flow/copy |
| A11y | Zero UI |
| Mobile | Zero client |
| Frontend | Zero client (pure API) |

CEO, CPO, CTO, Principal, Backend, Security, QA, Performance, AI Architect — still review.

---

## Conflict Resolution

When reviewers disagree:

```
1. Identify BLOCK vs ADVISE (only BLOCK stops ship)
2. Apply authority: POS > COS > PCB > AOS > Runtime > code
3. Domain tie-breakers:
   - Child delight vs parent analytics → CPO (child protagonist)
   - Speed vs architecture → CTO unless P0 live
   - Visual vs clarity → UX Director breaks tie on flows; Creative on brand
   - Security vs feature → Security wins
   - QA vs scope date → QA Director wins on P0/P1
4. Document resolution in PR review table
5. Re-run affected gates (QA_ENGINE)
```

**Rule R-02:** Unresolved BLOCK = mission incomplete — no founder bypass in runtime.

---

## Disagreement Examples (deterministic outcomes)

| Conflict | Winner | Action |
|----------|--------|--------|
| CPO wants feature · Game Director BLOCK casino loop | Game + POS G-03 | Cut mechanic |
| Creative wants dense UI · UX BLOCK cognitive load | UX + POS C-03 | Simplify |
| Frontend wants client authz · Security BLOCK | Security + W-01 | Server enforce |
| CTO wants rewrite · CEO scope focus | CEO | Defer rewrite to debt mission |
| Performance BLOCK bundle · CPO wants animation | Performance unless core delight | Reduce motion budget |

---

## Self-Review Integration

Maps to `180-self-review.mdc` eight roles — REVIEW_ENGINE is **superset** for PRs. Both must pass.

---

## Waivers

- Only **P2+** issues  
- CEO + affected reviewer hat documented  
- Expiry date required  
- Never waiving: Security BLOCK on auth · QA P0/P1 · POS Constitution  

---

## Anti-Patterns

- All-pass table without reading diff  
- n/a every creative reviewer on child UI  
- Ignoring Performance on "small" JS change to child path  
- Skipping AI Systems Architect on `.ai/` changes  

---

## Completion

REVIEW_ENGINE complete when:

1. All 16 rows filled  
2. Zero unresolved BLOCK  
3. Waivers documented per QA_ENGINE  
4. Re-run test:gate after fixes from review  

================================================================================
FILE: .ai/runtime/SELF_IMPROVEMENT_ENGINE.md
================================================================================

# SELF_IMPROVEMENT_ENGINE

**Version:** 1.0  
**Role:** Continuous codebase improvement when primary mission completes or idle  
**Invoked:** WORKFLOW Phase 14 · between missions

---

## Purpose

Composer must **never stop at "good enough"** when long-term product value remains on the table. Automatically find, prioritize, and queue improvements — not random refactors.

---

## Activation Conditions

Run when **any** true:

1. Primary mission reached WORKFLOW Phase 13 (PR open) with capacity remaining  
2. User message: "continue" · "improve" · "what's next" · idle  
3. test:gate green + no open BLOCK reviews  
4. Explicit debt sprint mission  

**Rule SI-01:** Do not start improvement missions if primary mission BLOCK gates open.

---

## Discovery Scan (ordered)

Execute scans — record findings in **Improvement Backlog** (session artifact or `docs/ai-improvement-backlog.md` only if user wants persistence — default session only):

| # | Scan | Method | Finds |
|---|------|--------|-------|
| 1 | **Technical debt** | Grep TODO/FIXME/hack · large files list | Deferred work |
| 2 | **Duplicated logic** | Grep similar route handlers · copy-paste patterns | Dedupe targets |
| 3 | **Inconsistent UX** | Compare child header/nav patterns across pages | UX drift |
| 4 | **Outdated docs** | SYSTEM_ANALYSIS vs routes · stale comments | Doc fixes |
| 5 | **Architecture violations** | Global middleware · client authz · dual coaches | Structural fixes |
| 6 | **Missing tests** | test:gate coverage gaps · auth routes without contract tests | Test additions |
| 7 | **Slow components** | Large JS files · sync loops in hot paths | Perf targets |
| 8 | **Accessibility issues** | Missing labels · small targets in touched areas | A11y fixes |
| 9 | **Animation inconsistencies** | Celebration timing ≠ 03B | Motion alignment |
| 10 | **Design inconsistencies** | Off-palette · non-03A patterns in child UI | Visual debt |

**Rule SI-02:** Scans are read-only until item prioritized and promoted to mission.

---

## Prioritization Formula

Score each finding **Impact × Confidence / Effort** (1–5 each):

| Factor | 5 = | 1 = |
|--------|-----|-----|
| **Impact** | First Success / child trust / security | Admin cosmetic |
| **Confidence** | Proven user pain or failing test | Guess |
| **Effort** | ≤1 hour | Multi-day |

**Priority bands:**

| Score | Action |
|-------|--------|
| ≥40 | Promote to next mission immediately |
| 20–39 | Queue top 3 for session |
| 10–19 | Backlog note |
| <10 | Drop |

**Tie-break:** Security > child path > parent path > admin > docs.

---

## Improvement Mission Types

Promoted items become missions via MISSION_ENGINE:

| Type | Example |
|------|---------|
| `bugfix` | Flaky test · authz gap |
| `refactor` | Extract module per Fas 8 pattern |
| `debt` | Remove duplicate SQL |
| `feature` | Only if POS-aligned AND passes CPO gate — rare for idle |

**Rule SI-03:** Idle improvement default type is `refactor` or `debt` — not feature creep.

---

## Bounded Improvement Rules

| Rule | Detail |
|------|--------|
| SI-B01 | One improvement mission at a time |
|  SI-B02 | Each must pass full WORKFLOW (no shortcut) |
| SI-B03 | Max 3 idle improvements per session unless user asks more |
| SI-B04 | Never "improve" by expanding frozen governance |
| SI-B05 | SW bump only when static assets touched |

---

## Category → TASK_ROUTER mapping

| Finding category | Routed to |
|------------------|-----------|
| Duplicated logic | Principal + domain engineer |
| Missing tests | QA + domain engineer |
| Slow child path | Performance + Frontend |
| Animation drift | Game + Frontend |
| Design drift | Creative + Frontend |
| Architecture smell | Architect + CTO lens |
| A11y | Accessibility + Frontend |
| Stale SYSTEM_ANALYSIS | docs mission — runtime only update if approved |

---

## Stop Conditions

Stop self-improvement loop when:

- User ends session  
- BLOCK gate fails on improvement mission  
- 3 improvements completed in session  
- Backlog score <20 for all remaining items  
- Founder escalation open  

---

## Anti-Patterns

- Rewriting working code for style only  
- New features disguised as cleanup  
- Mass rename without mission  
- Updating frozen POS/AOS/COS/PCB without contradiction ADR  
- Running npm test full suite on live VPS with email keys  

---

## Example Idle Cycle

```
1. Mission complete: fix child PIN gate
2. SELF_IMPROVEMENT scan finds duplicate PIN check in client
3. Score: Impact 4 · Confidence 5 · Effort 2 → 10 → band 20–39
4. New mission: refactor — server-only PIN authority
5. Full WORKFLOW → PR #2
6. Scan again → no item ≥20 → stop
```

---

## Completion

Self-improvement cycle complete when backlog top items under threshold or session limits hit — documented in final PR comment or session summary.

================================================================================
FILE: .cursor/rules/200-runtime-platform.mdc
================================================================================

---
description: Autonomous AI Development Platform — runtime control plane. Governs Composer execution.
alwaysApply: true
---

# 200 — Runtime Platform (Autonomous Development)

## Authority stack (frozen v1.0 — do not expand)

1. `product-operating-system/` (POS)
2. `.ai/company/` (COS)
3. `product-content-bible/` (PCB)
4. `.ai/` + `.cursor/rules/` 000–190 (AOS)
5. **`.ai/runtime/`** (this platform — execution control)
6. Code

## Session start (feature request or fix)

Before code, read in order:

1. `.ai/runtime/WORKFLOW_ENGINE.md`
2. `.ai/runtime/MISSION_ENGINE.md` — produce Mission Brief
3. `.ai/runtime/PLANNING_ENGINE.md` + `TASK_ROUTER.md`
4. Execute phases per WORKFLOW — no skipped reviews

## Mandatory pipeline (summary)

Understand → Read POS → Identify systems → Review code → Risks → Architecture → Implement → Tests → Lint → Performance · A11y · Mobile · Security → POS · AOS · COS · PCB review → Executive review → REVIEW_ENGINE (16 reviewers) → Refactor → Commit → PR → SELF_IMPROVEMENT

Detail: `.ai/runtime/` engines — not duplicated here.

## Completion

Work is **not done** until:

- `QA_ENGINE` all applicable gates pass
- `REVIEW_ENGINE` zero BLOCK vetoes
- `DECISION_ENGINE` seven questions pass
- `190-definition-of-done.mdc` satisfied

## Rules

- Do **not** expand frozen POS/COS/PCB/AOS unless contradiction ADR
- Do **not** skip test:gate or REVIEW_ENGINE for user-facing changes
- Founder silence ≠ approval — gates = approval
- Apply `large-files.mdc` during research phase

## Entry point

`.ai/runtime/README.md`
