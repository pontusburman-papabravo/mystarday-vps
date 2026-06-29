# Standard — Product

**Version:** 1.0  
**Authority:** `docs/PRODUCT-CONSTITUTION.md` · `product-operating-system/` · ADR

> Product truth is **only** in Constitution + POS + ADR. Agents **enforce**, not invent.

---

## Constitution (always test)

| # | Rule | Test question |
|---|------|---------------|
| 1 | Produkten leder | Kan förälder veta nästa steg utan instruktioner? |
| 2 | Produkten överraskar inte | Skulle förälder undra "varför ser jag det här?" |
| 3 | Produkten visar nästa steg | Finns tom skärm eller död knapp? |
| 4 | Produkten minskar osäkerhet | Bekräftar UI att familjen gör rätt? |
| 5 | Produkten känns färdig | Känns mer komplett efter registrering? |
| 6 | Inga magiska tal | Är trösklar data-driven, inte hårdkodade? |

Full text: `docs/PRODUCT-CONSTITUTION.md`

---

## POS Read Set (before user-facing work)

| Doc | Topic |
|-----|-------|
| `00_PROJECT_CONSTITUTION.md` | Laws + constitution |
| `00A_EXPERIENCE_MANIFESTO.md` | How it must feel |
| `00B_PRODUCT_TASTE.md` | Premium vs cheap |
| `04`–`09` | Domain (child, parent, game, world, data) |
| `03A` / `03B` | Art · motion |
| `06A` | Mobile child experience |
| `15_PRODUCT_QUALITY_STANDARD.md` | Ship bar |

---

## Conflict Resolution

```
Constitution > Experience Manifesto > Taste > ADR > Code
```

If POS contradicts code → fix code.  
If POS contradicts itself → ADR + human (Level 4).

---

## Agent Checks (before PR)

- [ ] PR answers "Hur uppfyller detta konstitutionen?" for user-facing changes
- [ ] POS section cited in description
- [ ] CPO role self-review pass
- [ ] No anti-ship patterns (POS 02 matrix)
- [ ] First Success preserved (`docs/FIRST-SUCCESS.md`)

---

## Deep References

| Topic | Location |
|-------|----------|
| CPO role | [roles/cpo.md](../roles/cpo.md) |
| Parent Experience | [roles/parent-experience.md](../roles/parent-experience.md) |
| Game Director | [roles/game-director.md](../roles/game-director.md) |
| Product bibles | `.ai/product/` (PCB — world fiction) |
| Human escalation | [HUMAN_ESCALATION.md](../HUMAN_ESCALATION.md) |
