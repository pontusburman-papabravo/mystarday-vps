# Mina personer — vision (V0)

**Status:** Tidig (V0 shipped)  
**Relaterat:** [barnmeny-v2.md](barnmeny-v2.md) §3.5 · [child-worlds-index.md](child-worlds-index.md) · [child-family-hall.js](../public/js/child-family-hall.js)

---

## Syfte

Barnet ska känna **vem som finns i familjen** och vad familjen bygger tillsammans — utan formulär, inställningar eller föräldra-dashboard i barnvyn (C-01, P-04).

---

## V0 (v1 minimum)

| Krav | Implementation |
|------|----------------|
| Läsbar familjehall | `ChildFamilyHall` via Mer → Familj |
| Mina personer-lista | Föräldrar + syskon från `GET /api/me/family` |
| Tom-states | Vänlig copy när inga personer/projekt/berättelse |
| Barn agerar inte som admin | Read-only — inga redigeringskontroller |

**Illustration:** `public/images/child/family/hall@2x.webp` (lazy via `child-world-bg-lazy.js`).

---

## Olle-test (V0)

Inom 5 sekunder, utan scroll:

1. Vem hjälper mig? → personkort med emoji + namn
2. Vad bygger vi? → familjeprojekt eller tom-state
3. Hur går det? → stjärnor i familjeskista (om aktiverad)

---

## Ej i V0 (defer)

- Redigera familjemedlemmar i barnvy
- Chatt eller meddelanden mellan barn
- Syskon-jämförelser eller leaderboards (POS forbidden)

---

## Definition of Done — V0

- [x] Familjehall mountas från barnmeny Mer → Familj
- [x] API read-only (`ChildFamily.load`)
- [x] Tom-states för personer, projekt, berättelse
- [ ] Full vision (interaktiv familjeberättelse, avatarer) — v1.1+
