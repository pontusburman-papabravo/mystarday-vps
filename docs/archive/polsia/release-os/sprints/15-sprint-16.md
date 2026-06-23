# Sprint 16 — Capacitor Android smoke

| Fält | Värde |
|------|--------|
| **Kö-position** | 15 |
| **Polsia** | #2142930 |
| **P0** | — |
| **Timmar (plan)** | 4 |
| **Layer** | 3 |
| **Deploy** | En task = ett deploy till Polsia prod |

**Källor:** [app2.md](../../app2.md) · [ios-städ.md](../ios-städ.md) · [android.md](../../android.md)

---

## Polsia-prompt (copy-paste hela blocket)

```
Uppgift: Sprint 16 — Capacitor Android smoke (bygg + isNative)

Läs: android.md §1, app.md Steg 1

Gör endast:
1. Verifiera @capacitor/android installerat; npx cap sync android
2. Android Studio: bygg debug, starta mot mystarday.se (prod URL)
3. Verifiera window.Capacitor och Platform.isNative() === true
4. Verifiera body.is-native vid start (platform.js sprint 1.2)
5. Dokumentera eventuella android/build.gradle targetSdk

Gör INTE: Google login, FCM, store-upload

TEST:
□ App öppnas utan vit WebView-crash
□ Login-sida laddar

Release-gate Android: Capacitor bygger

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
