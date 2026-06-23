# Sprint 1.2 — platform.js

| Fält | Värde |
|------|--------|
| **Kö-position** | 2 |
| **Polsia** | #2141409 |
| **P0** | P0.2 |
| **Timmar (plan)** | 3 |
| **Layer** | 1 |
| **Deploy** | En task = ett deploy till Polsia prod |

**Källor:** [app2.md](../../app2.md) · [ios-städ.md](../ios-städ.md) · [android.md](../../android.md)

---

## Polsia-prompt (copy-paste hela blocket)

```
Uppgift: Sprint 1.2 — platform.js frys + ladda på alla sidor

Läs: ios-städ.md §1 platform.js, § Arkitekturregel 2, app2 P0.2

Gör endast:
1. public/js/platform.js:
   - Vid Capacitor: body.is-native, is-native-ios på <html>
   - Platform.isNative(), isIOS(), isAndroid(), isWeb()
   - Platform.isAppleSignInAvailable() (native iOS ELLER iOS Safari)
   - Platform.isGoogleSignInAvailable() (native Android — stub OK om plugin ej klart)
   - INGEN Capacitor.isNativePlatform() exporterad till views
2. Ladda platform.js i <head> på: login, register, onboarding, settings, schedule, dashboard
   (lista saknade i commit-meddelande)
3. Skelett för Platform.session / Session Gate (tom funktion OK — 3a fyller i)

Gör INTE: login Apple-knapp, PG, tab bar, full gating

TEST:
□ Desktop: isWeb() beteende
□ Ingen ny plattformscheck i dashboard.js utanför platform.js

Release-gate: Auth förberedd (plattform)

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
