# 12 — QA System

**Version:** 2.0  
**Owner:** QA Director  
**Authority:** Verifies [15_PRODUCT_QUALITY_STANDARD.md](./15_PRODUCT_QUALITY_STANDARD.md)

---

## Purpose

Quality verification before families see change — automated + human constitution test.

---

## Layers

```
4 Manual — Constitution + taste review ([15](./15_PRODUCT_QUALITY_STANDARD.md))
3 Mobile smoke — native WebView protocol
2 Full suite — pre-release optional
1 CI gate — required merge ([AGENTS.md](../AGENTS.md))
0 Lint + CSS/build checks
```

---

## Rules

**Q-01** Gate green before main  
**Q-02** User-facing PR notes manual flows  
**Q-03** Child changes → child completion smoke  
**Q-04** Coach changes → Hem screenshot/recording  
**Q-05** Native plugin → mobile gate  
**Q-06** Auth changes → integration tests  
**Q-07** Migrations → rollback test  
**Q-08** No live email keys in tests  
**Q-09** Apple Sign-In native → verify patch script when applicable  
**Q-10** Flag rollout → ops runbook check

---

## Constitution Test (UX releases)

| Rule | Test |
|------|------|
| 1 | One next step on Hem |
| 2 | No surprise modals |
| 3 | No empty Hem |
| 4 | Progress confirmed after onboarding action |
| 5 | Post-register feels complete |

---

## Known Gaps (expand gate over time)

Paywall contract · Journey Gate comms · universe rules · IAP webhook — add tests when touched.

---

## Anti-Patterns

Merge failing gate · test on live DB with real email · skip mobile for Capacitor changes

---

## Release Criteria

Document updates when gate composition changes + ADR.

---

## AI Instructions

Run gate after server changes; propose tests when touching gaps.

---

## CXO Review Summary

All roles **10/10** — v2.0.
