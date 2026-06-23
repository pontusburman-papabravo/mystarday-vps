# Sprint 3b — PG-modal + PIN + biometri

| Fält | Värde |
|------|--------|
| **Kö-position** | 9 |
| **Polsia** | #2141848 |
| **P0** | P0.1 |
| **Timmar (plan)** | 2 |
| **Layer** | 2 |
| **Deploy** | En task = ett deploy till Polsia prod |

**Källor:** [app2.md](../../app2.md) · [ios-städ.md](../ios-städ.md) · [android.md](../../android.md)

---

## Polsia-prompt (copy-paste hela blocket)

```
Uppgift: Sprint 3b — PG-modal + app-lås-PIN + biometri (P0.1)

Läs: app2 §14.1, ios-städ Session Gate

VIKTIGT — två PIN-typer (blanda INTE):
- Barn-PIN = child-login, befintlig /api/auth/child-login
- App-lås-PIN = PG, Secure Storage, endast förälder på denna enhet

Gör endast:
1. "Jag är vuxen" / ut ur barnläge → PG-modal (app-lås-PIN)
2. Rätt PIN → device_mode='parent' → dashboard
3. Fel PIN → stanna i barnläge, tydligt fel, lockout befintlig logik om möjligt
4. Biometri: @capacitor-community/biometric (iOS + Android native)
5. "Glömt PIN" → FULL logout + tvinga re-auth (e-post/Apple/Google) — INTE bypass
6. Endast PG sätter device_mode='parent'
7. OS back / history: ska inte kringgå PG (Capacitor App backButton där native)

Gör INTE: barnlogin redesign, tab bar, server 403 (det är 3c)

TEST:
□ 8-åring-test planerat (manuell)
□ Glömt PIN → hamnar på login, inte dashboard

Release-gate PG:
□ Back gesture kringgår inte PG
□ Token refresh behåller barnläge (testa om refresh finns)

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
