> **Efter #25**

# Sprint Dashboard polish — Dashboard polish

| Fält | Värde |
|------|--------|
| **Kö-position** | — |
| **Polsia** | #2143405 |
| **P0** | — |
| **Timmar (plan)** | — |
| **Layer** | — |
| **Deploy** | En task = ett deploy till Polsia prod |

**Källor:** [app2.md](../../app2.md) · [ios-städ.md](../ios-städ.md) · [android.md](../../android.md)

---

## Polsia-prompt (copy-paste hela blocket)

```
Uppgift: Dashboard polish — skeletons · transitions · polish

Polsia: #2143405
Läs: app2 (dashboard efter push), ej ny scope utan polish
Design: docs/mockups/DESIGN-dashboard-reimagined.md, DESIGN-dashboard-vuxen-barn.md, foraldra.html, barnvy.html

Gör endast:
1. Dashboard: loading skeletons där det saknas
2. Mjuka transitions mellan tillstånd (CSS/JS, inga tunga libs)
3. Visuell polish på barnkort/rad — INGA nya features eller API

Gör INTE: SSE, barn-wow, ny navigation, PG-ändringar

TEST:
□ Native + webb: dashboard känns snabbare/renare utan regression
□ SW bump om CSS/JS ändrats

Release-gate: Dashboard polish (parallellt med 9A OK)

FÖRBJUDET i denna task:
❌ Capacitor.isNativePlatform() i view-filer
❌ Plattformscheck utanför platform.js
❌ Blanda barn-PIN och app-lås-PIN
❌ Scope utanför listan "Gör endast"
❌ Refactor av orelaterade filer
```

---

## Verifiering efter deploy (Polsia kör)

```bash
cd /workspace  # Polsia: repo root
npm run lint
node --test test/
```

---

## Signering i PR

- [ ] Scope = endast denna sprint
- [ ] npm test + npm run lint (se [02-verify-and-tests.md](../02-verify-and-tests.md))
- [ ] SW bump om klient/HTML ändrats
- [ ] Commit-hash noterad i Polsia-svar
