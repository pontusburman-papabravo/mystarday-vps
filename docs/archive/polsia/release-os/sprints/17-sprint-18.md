# Sprint 18 — Google native client

| Fält | Värde |
|------|--------|
| **Kö-position** | 17 |
| **Polsia** | #2143391 |
| **P0** | P0.2 |
| **Timmar (plan)** | 2 |
| **Layer** | 3 |
| **Deploy** | En task = ett deploy till Polsia prod |

**Källor:** [app2.md](../../app2.md) · [ios-städ.md](../ios-städ.md) · [android.md](../../android.md)

---

## Polsia-prompt (copy-paste hela blocket)

```
Uppgift: Sprint 18 — Google Sign In native klient + login/register UI

Läs: android.md §2 Klient, ios-städ plattformsmatris, app2 §14.3

Gör endast:
1. platform.js: Platform.isGoogleSignInAvailable() — true endast native Android
2. Platform.googleSignIn.signIn() — Capacitor Google Auth plugin (dokumentera paket)
3. login.html + register.html: Google-knapp endast isGoogleSignInAvailable()
4. Android native: INGEN Apple-knapp (isAppleSignInAvailable false)
5. Redirect: onboarding vs dashboard efter svar
6. SW bump

Gör INTE: FCM, PG, tab bar

TEST (fysisk Android eller emulator):
□ Google login → dashboard eller onboarding
□ Ingen Apple-knapp synlig
□ E-post login regression OK

Release-gate: Google native Android ✓

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
