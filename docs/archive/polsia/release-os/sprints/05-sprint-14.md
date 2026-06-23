# Sprint 14 — Mandatory runtime layer

| Fält | Värde |
|------|--------|
| **Kö-position** | 5 |
| **Polsia** | #2143272 |
| **P0** | P0.6 |
| **Timmar (plan)** | 2 |
| **Layer** | 1 |
| **Deploy** | En task = ett deploy till Polsia prod |

**Källor:** [app2.md](../../app2.md) · [ios-städ.md](../ios-städ.md) · [android.md](../../android.md)

---

## Polsia-prompt (copy-paste hela blocket)

```
Uppgift: Sprint 14 — Mandatory runtime layer (observability)

Polsia: #2143272
Läs: app2 P0.6, app2 §14.11, android.md sprint 20.5

Gör endast:
1. Sentry ELLER Crashlytics — Capacitor iOS + Android (runtime safety tidigt i kedjan)
2. release: app-version + git commit (build-id) i varje event
3. Test-crash iOS + Android — stack traces läsbara
4. GDPR: ingen PII i breadcrumbs
5. Dokumentera env i Polsia Dashboard (ej i repo)

Gör INTE: PG, tab bar, deep links, parity

TEST:
□ Test-crash syns <5 min på båda plattformar
□ Version + commit i dashboard

Release-gate: Runtime layer ✓ — prioriteras om credits slut
Kill switch: se parity-manifest.md (kopplas till 23A/24 senare)

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
