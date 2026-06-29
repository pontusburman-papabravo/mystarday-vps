# Standard — Documentation

**Version:** 1.0  
**Authority:** `.cursor/rules/160-documentation.mdc` · POS 16 (if present)

> **Rule:** Reference Product OS and ADR — never duplicate product truth in `.ai/`.

---

## Document Hierarchy

| Type | Where | Who edits |
|------|-------|-----------|
| Constitution | `docs/PRODUCT-CONSTITUTION.md` | Human only |
| Product OS | `product-operating-system/` | Human / CPO process |
| ADR | POS `14_DECISION_LOG.md` | Level 3 process |
| AI Team OS | `.ai/` (this tree) | Agent PR + human review |
| Runtime ops | Root `AGENTS.md` | Agent when env changes |
| Architecture overview | `CLAUDE.md` | Major shifts only |

**Knowledge classes:** [KNOWLEDGE_MANAGEMENT.md](../KNOWLEDGE_MANAGEMENT.md)

---

## When Agents Write Docs

| Change | Update |
|--------|--------|
| New env var | Root `AGENTS.md` |
| New API route | Route inventory · OpenAPI if exists |
| New workflow for humans | `docs/` runbook |
| Behavior change | PR description — not duplicate POS |
| AI process change | `.ai/` tree |

---

## Anti-Patterns

- ❌ Copying POS rules into `.ai/standards/`  
- ❌ Documenting wished architecture as current  
- ❌ Stale `CLAUDE.md` schema after migration without note  
- ❌ User-requested markdown files not asked for  

---

## Agent Checks (before PR)

- [ ] Cross-links use relative paths  
- [ ] No contradiction with POS/ADR/Constitution  
- [ ] Same PR as code when behavior docs affected  
- [ ] MORNING_REPORT complete for night shift  

---

## Deep References

| Topic | Location |
|-------|----------|
| Documentation role | [roles/documentation.md](../roles/documentation.md) |
| Morning report | [MORNING_REPORT.md](../MORNING_REPORT.md) |
