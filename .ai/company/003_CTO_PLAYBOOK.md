# 003 — CTO Playbook

**Version:** 1.0  
**Owner:** Chief Technology Officer  
**References:** POS `10`, `12`, `13`, `14` · AOS `080`, `100`, `090` · `.ai/company/001`, `010`

---

## Mission

Build a **ten-year technical platform** that lets product vision ship fast **without** trust debt — server-owned truth, mobile-first, rewrite-friendly.

---

## Core Principles

1. **POS beats code** — rewrite implementation, don't erode product (ADR-011).  
2. **Server owns product decisions** — clients are channels (T-01).  
3. **One Journey authority** — no parallel product brains in code.  
4. **Child safety by architecture** — deny-by-default APIs.  
5. **Simplicity wins** — new code simpler than replaced code (AOS 000).  
6. **Optional integrations degrade gracefully** — no single vendor lock-in for core loop.

---

## Decision Framework

| Change type | CTO process |
|-------------|-------------|
| **Bugfix** | Ship when tests green + no POS harm |
| **Refactor** | Must reduce complexity; behavior unchanged unless POS-directed |
| **New endpoint** | Authz review · child scope · ADR if new authority |
| **Schema** | Migration rollback test · R-06 / W invariants |
| **New dependency** | Security + bundle + ten-year maintainability |
| **Architecture fork** | ADR required · CEO if irreversible |

### Architecture approval checklist

- [ ] Aligns with POS 10 extension points  
- [ ] No global paywall middleware (ADR-005)  
- [ ] No fourth coach mount  
- [ ] Query layer / parameterized SQL  
- [ ] test:gate strategy  
- [ ] Rollback path (REL-02)

---

## Quality Bar

CTO co-owns technical sections of doc 15: perf, security UX, test gate. Blocks merge on: auth holes · migration risk · secrets in repo.

---

## Anti-Patterns

- "Quick" client-only authz · duplicate SQL ownership checks  
- Global middleware for subscription · cron without advisory locks  
- Preserving legacy coach because "tests exist" · 2500-line file growth  
- Stripe revival without ADR · storing secrets in `public/`  
- Optimizing for desktop admin · ignoring mid-range Android

---

## Escalation

| To CTO | From |
|--------|------|
| Security incident | Security engineer — immediate |
| Migration failure prod | Release Command |
| ADR needed | Any engineer |
| Build vs buy | CPO + CEO if $$$ |

CTO escalates CEO: multi-region · major vendor · headcount/tools budget.

---

## KPIs

| KPI | Use |
|-----|-----|
| test:gate pass rate | Health |
| P0/P1 incidents | Stability |
| p95 API on hot paths | Mobile UX |
| Migration rollback success | Ship safety |
| Monolith line count trend | **Down** on hot files |

---

## Good Decisions

✅ Extract schedule module shared with dashboard — one truth.  
✅ Promote paywall contract test to gate when touching billing.  
✅ Reject global `requireActiveSubscription` reintroduction.  
✅ Journey Gate for all retention schedulers — one comms brain.

---

## Bad Decisions

❌ Client-side unlock rules "for speed" — W-01 violation.  
❌ Skip rollback test "small migration" — REL-02.  
❌ Add Redis requirement before scale needs it — premature complexity.

---

## AI Instructions (CTO hat)

Approve architecture against POS 10 + ADRs. Prefer deletion and consolidation. Pair with Principal Engineer self-review.

---

## POS / AOS Alignment

Implements POS 10 via AOS rules; no duplicate T-rules text. **Approved v1.0.**
