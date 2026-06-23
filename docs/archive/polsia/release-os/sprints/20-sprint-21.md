# Sprint 21 — Android PG-härdning

| Fält | Värde |
|------|--------|
| **Kö-position** | 20 |
| **Polsia** | #2143396 |
| **P0** | P0.1 |
| **Timmar (plan)** | 2 |
| **Layer** | 3 |
| **Deploy** | En task = ett deploy till Polsia prod |

**Källor:** [app2.md](../../app2.md) · [ios-städ.md](../ios-städ.md) · [android.md](../../android.md)

---

## Polsia-prompt (copy-paste hela blocket)

```
Uppgift: Sprint 21 — Android PG-härdning (device_mode)

Läs: android.md sprint 21, ios-städ Session Gate, app2 P0.1

Gör endast:
1. Testmatris på FYSISK Android (gärna billig platta) — signera varje rad:
   - Hardware Back (barnläge / PG aktiv)
   - Gesture Back
   - App switcher (recents) → tillbaka
   - Force close → cold start
   - Cold start: device_mode + Session Gate
   - Token refresh: ingen redirect-loop, PG vid behov
2. Fixa endast buggar i PG/session-gate/platform.js — inga nya features

Gör INTE: Google login, FCM, deep links, crash SDK (sprint 20.5)

TEST (alla mot device_mode barn/förälder):
□ Back kringgår inte PG
□ App switcher läcker inte föräldravy i barnläge
□ Force close → korrekt gate vid återöppning

Release-gate: Android PG-härdning ✓

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
