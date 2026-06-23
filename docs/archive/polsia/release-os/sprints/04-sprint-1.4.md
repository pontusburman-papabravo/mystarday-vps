# Sprint 1.4 — CSS scaffold + SW

| Fält | Värde |
|------|--------|
| **Kö-position** | 4 |
| **Polsia** | #2141411 |
| **P0** | P0.3 |
| **Timmar (plan)** | 1 |
| **Layer** | 1 |
| **Deploy** | En task = ett deploy till Polsia prod |

**Källor:** [app2.md](../../app2.md) · [ios-städ.md](../ios-städ.md) · [android.md](../../android.md)

---

## Polsia-prompt (copy-paste hela blocket)

```
Uppgift: Sprint 1.4 — platform-gating.css scaffold + SW bump

Läs: ios-städ.md Sprint 1.4 vs 2a-scope

Gör endast:
1. Skapa public/css/platform-gating.css med MINIMAL struktur (kommentar: full regler i Sprint 2a)
2. Länka CSS från platform.js eller login/register
3. public/sw.js version bump

Gör INTE: full PWA-dölj (det är 2a), tab bar, PG

TEST:
□ SW ny version laddar på login efter hård refresh

Release-gate: Drift ✓ SW deployad

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
