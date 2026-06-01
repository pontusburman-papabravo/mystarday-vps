> **Ej deploy**

# Sprint Family Delight — Family Delight

| Fält | Värde |
|------|--------|
| **Kö-position** | — |
| **Polsia** | #— |
| **P0** | — |
| **Timmar (plan)** | — |
| **Layer** | — |
| **Deploy** | En task = ett deploy till Polsia prod |

**Källor:** [app2.md](../../app2.md) · [ios-städ.md](../ios-städ.md) · [android.md](../../android.md)

---

## Polsia-prompt (copy-paste hela blocket)

```
Uppgift: Gate 25 — Family Delight Verification

Läs: android.md § Gate 25, app2 §16.5–16.6

Gör endast (4–6 veckor):
1. Rekrytera och följ 20 familjer (iOS och/eller Android — samma produkt)
2. Mät retention vecka 1 → vecka 4/6 (dokumentera metod + siffror)
3. Signera per kriterium:
   □ Barn använder appen frivilligt flera gånger/vecka
   □ Föräldrar behöver inte löpande support (PG, login, push, sync)
   □ Inga blockerande återkommande PG-/push-/sync-problem
4. Gate 25-rapport: retention, citat, kvarvarande P2/P3 — godkänd av produktägare

Gör INTE: nya stora features under perioden (riskerar att förstöra mätningen)

Förutsättningar (ska vara klart):
□ Live-synk (SSE) första version deployad
□ Barn-wow första version deployad
□ Gate 24 + 9B genomförd

TEST:
□ 20/20 familjer genomfört minst 4 veckor ELLER dokumenterat varför inte
□ Retention trend dokumenterad

Release-gate: "Min Stjärndag är 10/10" — först efter Gate 25 grön

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
