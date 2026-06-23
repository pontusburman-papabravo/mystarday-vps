> **Kör före sprint 16 (#15 i kön)**

# Sprint Gate 0 Native parity freeze — Gate 0 Native parity freeze

| Fält | Värde |
|------|--------|
| **Kö-position** | — |
| **Polsia** | #2142916 |
| **P0** | — |
| **Timmar (plan)** | — |
| **Layer** | — |
| **Deploy** | En task = ett deploy till Polsia prod |

**Källor:** [app2.md](../../app2.md) · [ios-städ.md](../ios-städ.md) · [android.md](../../android.md)

---

## Polsia-prompt (copy-paste hela blocket)

```
Uppgift: Sprint 0 — Gate 0: Native architecture freeze (före Android 16)

Läs: android.md § Sprint 0, ios-städ.md Arkitekturregel 1–2, app2 P0.2/P0.3

Gör endast:
1. Audit public/: rg/grep efter:
   - window.Capacitor / Capacitor.isNativePlatform()
   - navigator.userAgent (plattformsgrenar)
   - if (Android) / includes('Android') / includes('iPhone')
2. Tillåtna plattforms-API:er ska bo i platform.js:
   isNative(), isIOS(), isAndroid(), isAppleSignInAvailable(), isGoogleSignInAvailable()
3. Flytta kvarvarande träffar till platform.js wrappers — INGEN ny feature
4. Signera i PR-kommentar: antal filer fixade + "0 otillåtna träffar kvar"

Gör INTE: Capacitor android build, Google, FCM, PG-ändringar, tab bar

TEST:
□ rg Capacitor\.isNativePlatform public/js public/*.html → endast platform.js (ev. push-manager via Platform)
□ rg userAgent.*(Android|iPhone|iPad) public/ → 0 plattformsgrenar i views
□ Alla auth-sidor laddar platform.js

Release-gate: Gate 0 grön — Android sprint 16 tillåten

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
