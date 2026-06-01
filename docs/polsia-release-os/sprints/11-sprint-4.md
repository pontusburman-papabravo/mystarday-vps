# Sprint 4 — Native tab bar vuxen

| Fält | Värde |
|------|--------|
| **Kö-position** | 11 |
| **Polsia** | #2141717 |
| **P0** | P0.4 |
| **Timmar (plan)** | 3 |
| **Layer** | 2 |
| **Deploy** | En task = ett deploy till Polsia prod |

**Källor:** [app2.md](../../app2.md) · [ios-städ.md](../ios-städ.md) · [android.md](../../android.md)

---

## Polsia-prompt (copy-paste hela blocket)

```
Uppgift: Sprint 4 — Native tab bar vuxen (P0.4) — #2141717

Läs: app2.md §4 P0.4, §14.6, ios-städ Uppdrag E
Design: docs/mockups/DESIGN-dashboard-reimagined.md (5 flikar förälder, 3 flikar barn)

Gör endast:
1. public/js/native-tab-bar.js — ENDAST Platform.isNative(); 5 flikar (Hem/Schema/Bibliotek/Familj/Inställningar)
2. Montera på dashboard, schedule, settings, family — INTE child-dashboard
3. body.has-native-tab-bar → dölj hamburger på dessa sidor; webb oförändrad
4. safe-area + Platform.haptics.light() vid flikbyte
5. Feature flag native_tabbar_enabled (default true) + SW bump

Gör INTE: PG, push, barnlogin, mobile-nav.js refactor på webb

TEST:
□ Native: tab bar, ingen hamburger på dashboard
□ Webb mobil: hamburger kvar
□ child-dashboard: ingen föräldra-tab bar

Release-gate Fas A+: Navigation native tab + webb hamburger (ios-städ)

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
