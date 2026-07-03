# Nightly Review Protocol

**COS v1.4 — run once per autonomous cycle before morning report**

---

## 1. CTO Review (one question)

> **If we started over today, would we still build it this way?**

Document honest answer in morning report. If **no** → propose ARC/IRC refactor or Kill Idea.

---

## 2. Kill Ideas

Ask: **What should we NOT build?**

| Field | Content |
|-------|---------|
| Planned | What we considered or started |
| Obsolete because | What made it redundant |
| Recommendation | Kill, defer, or merge |

Include at least one candidate per night (or explicit “none identified”).

---

## 3. Opportunity Discovery

Ask:

> **Which improvement gives the largest experience lift with the least code?**

Rank by ROI. Add top candidate to AMQ if not already queued.

---

## 4. Innovation Budget (10%)

- **10% of autonomous time** may be spent **investigating** better solutions
- **Not** for shipping unscoped features
- Output: spike notes in `.ai/knowledge/` or morning report — decision to implement goes through AMQ

---

## 5. Morning report replaces “next mission”

Use **Current Strategy** section — not “next uppdrag”.  
See `docs/reports/overnight-report-*.md` template in latest report.

---

## Related

- [STRATEGIC_INTENT.md](./STRATEGIC_INTENT.md)
- [REPOSITORY_VALUE_SCORE.md](./REPOSITORY_VALUE_SCORE.md)
- `.ai/knowledge/MISSION_QUEUE.md`
