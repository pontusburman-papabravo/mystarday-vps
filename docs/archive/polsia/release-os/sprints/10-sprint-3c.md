# Sprint 3c — Server 403 + feature flag

| Fält | Värde |
|------|--------|
| **Kö-position** | 10 |
| **Polsia** | #2141855 |
| **P0** | P0.1 |
| **Timmar (plan)** | 2 |
| **Layer** | 2 |
| **Deploy** | En task = ett deploy till Polsia prod |

**Källor:** [app2.md](../../app2.md) · [ios-städ.md](../ios-städ.md) · [android.md](../../android.md)

---

## Polsia-prompt (copy-paste hela blocket)

```
Uppgift: Sprint 3c — Server barn-JWT 403 + parental_gate_enabled (P0.1)

Läs: ios-städ.md Rollback-plan, app2 §14.1

Gör endast:
1. Barn-session/JWT: blockera /api/family/*, /api/account/* och vuxen-mutationer (403)
2. Klient: barn i barnläge kan inte nå /settings, /family, /schedule (vuxen), /reports
3. Feature flag parental_gate_enabled:
   - Klient: läs från GET /api/config eller features (default true efter staging-test)
   - Om false: dokumentera risk — endast nödfall
4. SW bump om klientändringar

Gör INTE: PG-modal UI, tab bar, push

TEST:
□ Barn-JWT mot /api/family/members → 403
□ Flagga av i staging → Session Gate beteende dokumenterat

Release-gate PG: alla rader gröna tillsammans med 3a+3b

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
