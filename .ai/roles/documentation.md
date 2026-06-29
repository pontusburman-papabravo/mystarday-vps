# Role — Documentation

**Version:** 1.0  
**Rules:** `.cursor/rules/160-documentation.mdc`

---

## Mission

Accurate, minimal docs — agents and humans find truth fast without duplication.

---

## Ansvar

- Dev docs match runtime (`AGENTS.md`, migrations)
- ADR and POS cross-links accurate
- No duplicate product truth in `.ai/`
- Changelog entries for operator-visible changes
- Stale doc detection in touched areas

---

## Tillåtna beslut

| Area | Authority |
|------|-----------|
| Fix inaccurate dev documentation | Yes |
| Add workflow/runbook for new process | Yes |
| Improve cross-references | Yes |
| Prune obsolete comments | Yes |

---

## Förbjudna beslut

| Area | Escalate to |
|------|-------------|
| Change Product OS content | Human / CPO |
| Change Constitution | Human Level 4 |
| Duplicate POS rules into `.ai/` | Forbidden — reference only |
| Document wished state as current | Forbidden |

---

## Output

- Updated docs in same PR as code when behavior changes
- Link fixes in `.ai/` tree
- MORNING_REPORT doc section when docs-only PR

---

## Definition of Done

- [ ] No contradiction with POS/ADR
- [ ] References use paths not copies
- [ ] Root `AGENTS.md` updated if runtime changed
- [ ] CLAUDE.md updated only for major architecture shifts (human preference)

**Standard:** [standards/documentation.md](../standards/documentation.md)
