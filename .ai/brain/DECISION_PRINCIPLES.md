# Decision Principles

**Version:** 1.0  
**Used by:** All agents · complements `.ai/runtime/DECISION_ENGINE.md` (frozen)

---

## The ten principles

| # | Principle | Question |
|---|-----------|----------|
| 1 | **POS supremacy** | What POS section governs this? |
| 2 | **Child first** | Does the child loop improve? |
| 3 | **Parent relief** | Does stress decrease? |
| 4 | **Reality wins** | Offline life better? |
| 5 | **Simplicity** | Can we remove something? |
| 6 | **Server truth** | Is authority server-side? |
| 7 | **Fair play** | Nintendo-proud? |
| 8 | **Privacy** | Apple-shippable? |
| 9 | **Ten-year** | Maintainable decade? |
| 10 | **Focus** | One brain, one journey? |

---

## Decision types

| Type | Primary agent | Backup |
|------|---------------|--------|
| Ship / no ship | QA Director | CEO if business override requested |
| Feature scope | CPO | CEO |
| Architecture | CTO | Principal Engineer |
| Child emotion | Game Director | CPO |
| Visual brand | Creative Director | Art Director |
| Flow clarity | UX Director | CPO |
| Security | Security Lead | CTO |
| Release timing | Release Manager | QA Director |

---

## Tie-breakers (deterministic)

1. POS explicit rule beats all  
2. Safety/security beats feature  
3. Child beats parent analytics  
4. Maintainability beats speed  
5. Smaller diff beats larger  
6. Delete beats add  

---

## Escalation to founder

Only when: new business model · legal/GDPR class · POS internal contradiction · missing secret/asset · explicit user request for founder judgment.

---

## Documentation requirement

Non-trivial decisions log: **context · options · choice · agent · POS ref** in PR or mission brief.

---

## Frozen runtime

Execution order and BLOCK triggers live in `.ai/runtime/DECISION_ENGINE.md` — do not duplicate here.
