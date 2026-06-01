# Sprint 20 — FCM client

| Fält | Värde |
|------|--------|
| **Kö-position** | 19 |
| **Polsia** | #2143395 |
| **P0** | Push |
| **Timmar (plan)** | 2 |
| **Layer** | 3 |
| **Deploy** | En task = ett deploy till Polsia prod |

**Källor:** [app2.md](../../app2.md) · [ios-städ.md](../ios-städ.md) · [android.md](../../android.md)

---

## Polsia-prompt (copy-paste hela blocket)

```
Uppgift: Sprint 20 — FCM klient + push-manager Android

Läs: android.md §3 Klient, app2 §14.4, push-manager.js

Gör endast:
1. @capacitor/push-notifications — Android permissions i manifest (via cap sync)
2. push-manager.js: Platform.push.subscribe() på native Android
3. POST token till backend med platform=android, native_token=…
4. Re-register vid app start; remove vid logout
5. SW bump om klient ändrad

Gör INTE: sendFCM server (sprint 19), APNs-ändringar

TEST:
□ Token syns i push_subscriptions platform=android
□ Test-push från admin/test-endpoint når enheten <60s

Release-gate: FCM klient ✓

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
