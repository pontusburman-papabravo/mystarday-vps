# Sprint 22a — Deep links server

| Fält | Värde |
|------|--------|
| **Kö-position** | 21 |
| **Polsia** | #2143403 |
| **P0** | P0.5 |
| **Timmar (plan)** | 2 |
| **Layer** | 3 |
| **Deploy** | En task = ett deploy till Polsia prod |

**Källor:** [app2.md](../../app2.md) · [ios-städ.md](../ios-städ.md) · [android.md](../../android.md)

---

## Polsia-prompt (copy-paste hela blocket)

```
Uppgift: Sprint 22a — Deep links server + FEATURE FREEZE + CI + ROLLBACK

Polsia: #2143403
Läs: android.md sprint 22, app2 P0.5

Gör endast:
1. /.well-known/assetlinks.json på mystarday.se (SHA256 signing key)
2. Capacitor/AndroidManifest intent filters: invite, confirm-email, pedagog-invite
3. Server/static: route-stöd för cold-start URLs (samma paths som iOS Universal Links där möjligt)
4. iOS AASA paritet om ändringar i well-known
5. FEATURE FREEZE: inga nya features i samma deploy — endast deep links + policy
6. Dokumentera CI-check + rollback (feature flags ios-städ) i PR

Gör INTE: @capacitor/app klient-routing (22b), Play public, SSE

TEST:
□ assetlinks.json validerar (Google Statement List Tester eller adb)
□ Intent filter dokumenterat i PR

Release-gate: Deep links server (del av P0.5)

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
