# 15 — Product Quality Standard

**Authority:** Ship gate — complements CI and COS Assurance Cell

---

## Section A — Constitution test (user-facing changes)

Manual or recorded spot-check:

| # | Question |
|---|----------|
| A1 | One next step obvious? (Rules 1, 3) |
| A2 | No surprise modals? (Rule 2) |
| A3 | Parent feels "doing right"? (Rule 4) |
| A4 | Post-change feels more complete? (Rule 5) |
| A5 | No magic numbers added? (Rule 6) |
| A6 | Child protagonist preserved? (P-02) |
| A7 | Reality before celebration? (G-01) |

Average screen checklist ≥4, no 1s.

---

## Section B — Craft

| Area | Bar |
|------|-----|
| Mobile | Portrait thumb, 44pt child, safe areas |
| Motion | ≤2s celebrations, skippable, reduced-motion |
| Security | Child scope server-enforced, no secrets in client |
| Performance | No hot-path regression, 60fps animations |
| Accessibility | WCAG AA on touched paths |

---

## Section C — Anti-ship list

- P0/P1 open · test:gate red · Security <10 · child path untested on mobile
- Constitution violation · dual coach · login bonus · star IAP
- Global paywall middleware · client-only unlock

---

## Automation

CI runs `npm run test:gate`. Tier T2+ requires self-review per `.cursor/rules/180-self-review.mdc`.

Quality Index floors: `.ai/brain/QUALITY_INDEX.md`
