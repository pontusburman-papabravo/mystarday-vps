# Sprint 23A — Binary smoke gate

| Fält | Värde |
|------|--------|
| **Kö-position** | 23 |
| **Polsia** | #2143273 |
| **P0** | — |
| **Timmar (plan)** | 2 |
| **Layer** | 4 |
| **Deploy** | En task = ett deploy till Polsia prod |

**Källor:** [app2.md](../../app2.md) · [ios-städ.md](../ios-städ.md) · [android.md](../../android.md)

---

## Polsia-prompt (copy-paste hela blocket)

```
Uppgift: Sprint 23A — Binary smoke gate (6 pass/fail)

Polsia: #2143273
Läs: android.md Release-gate, app2 §9A (billig platta)

Förutsättning: Sprint 16–22b deployade.

Gör endast — signera PASS/FAIL per rad på FYSISK låg/mellanpris-Android:
1. App startar native (Platform.isNative, ingen vit WebView-crash)
2. Login: Google ELLER e-post → dashboard/onboarding
3. Ingen Apple-knapp på Android
4. FCM: token i DB + test-notis <60s
5. PG: hardware/gesture back kringgår inte barnläge
6. Deep link: push-tap ELLER adb VIEW invite → rätt route

Gör INTE: nya features · Play upload · 23B om någon rad FAIL

VI HÄNDER 23A FAIL:
→ 23B #2143274 BLOCKERAD
→ 48h eskalering
→ Överväg KILL_SWITCH_23A (docs/parity-manifest.md)

TEST: 6/6 PASS = 23A GREEN

Release-gate: 23A GREEN krävs för 23B + Gate 24

FÖRBJUDET i denna task:
❌ Capacitor.isNativePlatform() i view-filer
❌ Plattformscheck utanför platform.js
❌ Blanda barn-PIN och app-lås-PIN
❌ Scope utanför listan "Gör endast"
❌ Refactor av orelaterade filer
```

---

## Verifiering efter deploy (Polsia kör)

Manuell matris 6×PASS/FAIL på fysisk Android (låg/mellanpris). Se prompt.

---

## Signering i PR

- [ ] Scope = endast denna sprint
- [ ] npm test + npm run lint (se [02-verify-and-tests.md](../02-verify-and-tests.md))
- [ ] SW bump om klient/HTML ändrats
- [ ] Commit-hash noterad i Polsia-svar
