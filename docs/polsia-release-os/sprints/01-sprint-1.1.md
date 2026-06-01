# Sprint 1.1 — Backend auth

| Fält | Värde |
|------|--------|
| **Kö-position** | 1 |
| **Polsia** | #2141408 |
| **P0** | P0.2 |
| **Timmar (plan)** | 2 |
| **Layer** | 1 |
| **Deploy** | En task = ett deploy till Polsia prod |

**Källor:** [app2.md](../../app2.md) · [ios-städ.md](../ios-städ.md) · [android.md](../../android.md)

---

## Polsia-prompt (copy-paste hela blocket)

```
Uppgift: Sprint 1.1 — Backend auth (JWKS, CSRF, lifetime_free)
Polsia: #2141408

Läs: ios-städ.md v2.1 Prio 1, app2.md §14.8

Gör endast:
1. src/routes/auth.js: fixa _jwkToPem med crypto.createPublicKey
2. src/middleware/csrf.js: exempt POST /api/auth/apple och /api/auth/apple/link
3. src/middleware/subscription.js: om is_lifetime_free === true → next() alltid

Gör INTE: login.html, platform.js, PG, tab bar, SW

TEST (signera i kommentar):
□ review@mystarday.se / grundarfamilj får inte 402
□ Apple JWT-verifiering kraschar inte (manuell POST /api/auth/apple om möjligt)

Release-gate (ios-städ): Subscription ✓ lifetime_free

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
