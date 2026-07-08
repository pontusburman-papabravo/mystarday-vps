# Fas C — manuell GitHub-uppföljning

**Status:** Fas C **godkänd och klar** på `main` (#629 mergad).

## Epic

| Epic | Innehåll | Status |
|------|----------|--------|
| **#585** | Skattkammaren v1 | stängd |

## Follow-up

| Issue | Innehåll |
|-------|----------|
| **#631** | Persistent Godkänd ≠ Genomförd (`fulfilled_at` + förälder ”markera genomförd”) |

## Manuellt kvar

1. **Stäng draft PR #628** — superseded by #629 (bot kan inte stänga PR).
2. **Fas D:** epic **#586** — minneskort i Min samling.

## Tester

```bash
NODE_ENV=test npm run test:gate
node --test test/barnets-samling-treasure-v1.test.js
```
