# Fas C — manuell GitHub-uppföljning

**Status:** Fas C **klar** på `main` (efter merge). Kvar: stäng epic #585.

## Epic

| Epic | Innehåll | Status |
|------|----------|--------|
| **#585** | Skattkammaren v1: mål + statusar + historik | mergad |

## Manuellt (1 min)

1. **Stäng** epic #585.
2. **Follow-up issue** (valfritt): Godkänd ≠ Genomförd persistent (`fulfilled_at` i `reward_redemption`).
3. **Nästa:** Fas D (#586) — minneskort i Min samling.

## Tester

```bash
NODE_ENV=test npm run test:gate
node --test test/barnets-samling-treasure-v1.test.js
```
