# Sprint 1.3 — login + register UI

| Fält | Värde |
|------|--------|
| **Kö-position** | 3 |
| **Polsia** | #2141410 |
| **P0** | P0.2 |
| **Timmar (plan)** | 3 |
| **Layer** | 1 |
| **Deploy** | En task = ett deploy till Polsia prod |

**Källor:** [app2.md](../../app2.md) · [ios-städ.md](../ios-städ.md) · [android.md](../../android.md)

---

## Polsia-prompt (copy-paste hela blocket)

```
Uppgift: Sprint 1.3 — login.html + register.html Universal Auth

Läs: ios-städ.md plattformsmatris Apple+Google, app2 §14.3

Gör endast:
1. Apple-knapp ENDAST om Platform.isAppleSignInAvailable() — INTE isNative() alone
2. Android native: INGEN Apple-knapp; Google-knapp om isGoogleSignInAvailable()
3. 409 email_conflict: data.error === 'email_conflict' → modal (INTE prompt())
4. handleAppleLink: skicka idToken; kräv lösenord-login först
5. Efter Apple 200: onboarding_completed === false → /onboarding, annars dashboard
6. E-post/lösenord: regression — ska fungera oförändrat

Gör INTE: PG, Session Gate routing, barnlogin, tab bar

TEST:
□ iOS Safari: Apple JS login
□ Desktop Chrome: e-post, ingen Apple
□ Android Chrome: ingen Apple-knapp

Release-gate Auth:
□ Apple native iOS (TestFlight ELLER "ej testbar — saknar ios/")
□ Google native Android (om scope)
□ E-post login webb

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
