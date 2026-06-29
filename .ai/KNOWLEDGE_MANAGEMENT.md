# Knowledge Management

**Version:** 1.0  
**Rule:** AI agents **never create new product truth**. They classify, cite, and route to canonical sources.

---

## Canonical Sources (absolute truth)

| Class | Location | Agent action |
|-------|----------|--------------|
| Constitution | `docs/PRODUCT-CONSTITUTION.md` | Read · cite · enforce — **never edit** |
| Product OS | `product-operating-system/` | Read · cite · enforce — **never edit** |
| ADR | `product-operating-system/14_DECISION_LOG.md` | Read · cite · draft Level 3 — **never accept** |
| Team OS | `.ai/` (this tree) | Read · propose improvements via PR |
| Runtime ops | Root `AGENTS.md` | Read · update when env changes |

**Supremacy:** Constitution → POS → ADR → Team OS → Code → `SYSTEM_ANALYSIS.md` (context only).

---

## Knowledge Classes

### Working Knowledge

- **What:** In-session reasoning, grep results, test output, branch state  
- **Lifetime:** Session only  
- **Persistence:** Morning Report · PR description if needed  
- **Confidence:** N/A — verify before acting  

### Temporary Knowledge

- **What:** Draft specs, ADR drafts, spike branches, `.ai/reports/`  
- **Lifetime:** Until merged, rejected, or 30 days stale  
- **Owner:** Creating agent  
- **Validation:** Human or gate tests before promotion  

### Persistent Knowledge

- **What:** Merged code, accepted ADR, Team OS docs, POS  
- **Lifetime:** Until superseded  
- **Owner:** Role per domain (Architect → structure, CPO → product)  
- **Validation:** PR review + tests  

### Deprecated Knowledge

- **What:** Superseded ADR, archived docs, old patterns in code  
- **Lifetime:** Historical reference only  
- **Agent action:** Do not implement deprecated patterns; fix code to match POS  
- **Marking:** ADR status · archive folders · comments with migration path  

### Conflicting Knowledge

- **What:** POS vs code · ADR vs ADR · Team OS vs POS  
- **Resolution order:** See canonical stack above  
- **Agent action:** Stop · document both sides · escalate per [HUMAN_ESCALATION.md](HUMAN_ESCALATION.md)  
- **Never:** Pick the convenient source  

---

## Knowledge Validation

Before acting on any claim:

| Step | Question |
|------|----------|
| 1 | **Source class?** Canonical · persistent · temporary · working? |
| 2 | **Citation?** File path + section — not memory |
| 3 | **Freshness?** Merged date · ADR status · SW version if UI |
| 4 | **Confidence** | high = canonical + tests · medium = persistent doc · low = working — verify |
| 5 | **Conflict?** If yes → stop |

---

## Knowledge Lifetime

| Class | Max age without re-verify |
|-------|---------------------------|
| Working | Same session |
| Temporary | 30 days or until branch merged |
| Persistent | Until supersession event |
| Deprecated | Do not use for new work |

Stale temporary knowledge in `.ai/improvements/` or reports → archive or delete via PR (Level 2).

---

## Knowledge Confidence

| Level | Meaning | Action |
|-------|---------|--------|
| **High** | Canonical doc + passing tests | Proceed |
| **Medium** | Persistent Team OS / code pattern | Grep + test confirm |
| **Low** | Inference · old session · SYSTEM_ANALYSIS | Re-read canonical before act |
| **Unknown** | Undefined in POS | Level 4 escalate |

---

## Knowledge Ownership

| Domain | Owner role | Canonical |
|--------|------------|-----------|
| Product behavior | CPO | POS |
| Architecture | Architect | POS 10 · ADR |
| Child safety | Security | POS 04 · 120-security |
| Agent process | AI Operations | Team OS `.ai/` |
| Runtime env | Documentation | Root `AGENTS.md` |

Agents do not override owners — they route questions.

---

## What Agents Must Not Do

- ❌ Add "team lore" that contradicts POS  
- ❌ Treat `SYSTEM_ANALYSIS.md` as specification  
- ❌ Copy POS paragraphs into `.ai/standards/` (link only)  
- ❌ Accept ADR without human  
- ❌ Assume another agent's working knowledge is validated  

---

## References

- Improvement loop: [CONTINUOUS_IMPROVEMENT.md](CONTINUOUS_IMPROVEMENT.md)  
- Multi-agent shared state: [MULTI_AGENT_COORDINATION.md](MULTI_AGENT_COORDINATION.md)  
- Documentation standard: [standards/documentation.md](standards/documentation.md)
