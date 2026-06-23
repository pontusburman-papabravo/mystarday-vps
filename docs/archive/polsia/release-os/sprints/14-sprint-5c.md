# Sprint 5c — add-child redirect

| Fält | Värde |
|------|--------|
| **Kö-position** | 14 |
| **Polsia** | #2141897 |
| **P0** | P1 |
| **Timmar (plan)** | 1 |
| **Layer** | 2 |
| **Deploy** | En task = ett deploy till Polsia prod |

**Källor:** [app2.md](../../app2.md) · [ios-städ.md](../ios-städ.md) · [android.md](../../android.md)

---

## Polsia-prompt (copy-paste hela blocket)

```
Uppgift: Sprint 5c — "+ Lägg till barn" → onboarding?flow=add-child

Läs: app2 §5.3.1, §14.2

Gör endast:
1. child-login eller login: knapp "+ Lägg till barn"
2. Redirect till /onboarding?flow=add-child
3. Onboarding tillåter wizard trots onboarding_completed (om ej redan fixat — minimal fix)

Gör INTE: smart copy syskon, tab bar

TEST:
□ Knapp når onboarding add-child-flöde

SW bump om HTML/JS ändrats

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
