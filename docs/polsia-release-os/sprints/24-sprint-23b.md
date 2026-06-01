# Sprint 23B — Bugfix containment

| Fält | Värde |
|------|--------|
| **Kö-position** | 24 |
| **Polsia** | #2143274 |
| **P0** | — |
| **Timmar (plan)** | 2 |
| **Layer** | 4 |
| **Deploy** | En task = ett deploy till Polsia prod |

**Källor:** [app2.md](../../app2.md) · [ios-städ.md](../ios-städ.md) · [android.md](../../android.md)

---

## Polsia-prompt (copy-paste hela blocket)

```
Uppgift: Sprint 23B — Bugfix containment (endast efter 23A GREEN)

Polsia: #2143274

BLOCKERAD om 23A #2143273 inte är GREEN.

Gör endast:
1. Fixa ENDAST rader som FAIL:ade i 23A
2. Re-kör 23A-matrisen — alla 6 ska bli PASS
3. Inga nya features, refactors, eller scope utanför FAIL-rader

Gör INTE: Gate 24, Dashboard, SSE, 9B

TEST:
□ 23A omkörd — 6/6 PASS
□ TESTLOGG: modell + Android-version i PR

Release-gate: Android ~8,5–9/10 → Gate 24 tillåten

FÖRBJUDET i denna task:
❌ Capacitor.isNativePlatform() i view-filer
❌ Plattformscheck utanför platform.js
❌ Blanda barn-PIN och app-lås-PIN
❌ Scope utanför listan "Gör endast"
❌ Refactor av orelaterade filer
```

---

## Verifiering efter deploy (Polsia kör)

Förutsättning: 23A GREEN. Re-kör 23A efter fix.

---

## Signering i PR

- [ ] Scope = endast denna sprint
- [ ] npm test + npm run lint (se [02-verify-and-tests.md](../02-verify-and-tests.md))
- [ ] SW bump om klient/HTML ändrats
- [ ] Commit-hash noterad i Polsia-svar
