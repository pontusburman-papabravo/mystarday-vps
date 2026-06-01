# Sprint 19 — FCM server

| Fält | Värde |
|------|--------|
| **Kö-position** | 18 |
| **Polsia** | #2143394 |
| **P0** | Push |
| **Timmar (plan)** | 2 |
| **Layer** | 3 |
| **Deploy** | En task = ett deploy till Polsia prod |

**Källor:** [app2.md](../../app2.md) · [ios-städ.md](../ios-städ.md) · [android.md](../../android.md)

---

## Polsia-prompt (copy-paste hela blocket)

```
Uppgift: Sprint 19 — Implementera sendFCM (server)

Läs: android.md §3 Server, src/lib/push-notifications.js, app.md Steg 5

Gör endast:
1. Implementera sendFCM() — FCM HTTP v1 (firebase-admin) ELLER server key
2. Env: FCM_SERVICE_ACCOUNT_JSON eller FCM_SERVER_KEY — dokumentera
3. Vid ogiltig token: rensa push_subscriptions (samma som APNs-mönster)
4. Logga fel utan PII

Gör INTE: klient push-manager, Google login

TEST:
□ Enhetstest eller manuell send till test-token från sprint 20
□ Utan env: tydlig warn, ingen crash

Release-gate: FCM server

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

Fokus: backend-routes — `node --test test/auth.test.js` om auth rörts.

---

## Signering i PR

- [ ] Scope = endast denna sprint
- [ ] npm test + npm run lint (se [02-verify-and-tests.md](../02-verify-and-tests.md))
- [ ] SW bump om klient/HTML ändrats
- [ ] Commit-hash noterad i Polsia-svar
