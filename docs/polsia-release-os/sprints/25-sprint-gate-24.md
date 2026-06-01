# Sprint Gate 24 — Parity gate + Manifest

| Fält | Värde |
|------|--------|
| **Kö-position** | 25 |
| **Polsia** | #2143329 |
| **P0** | — |
| **Timmar (plan)** | 1 |
| **Layer** | 4 |
| **Deploy** | En task = ett deploy till Polsia prod |

**Källor:** [app2.md](../../app2.md) · [ios-städ.md](../ios-städ.md) · [android.md](../../android.md)

---

## Polsia-prompt (copy-paste hela blocket)

```
Uppgift: Gate 24 — Parity gate + Parity Manifest + 72h + kill switches

Polsia: #2143329

Läs: docs/parity-manifest.md (SPOT), android.md § Gate 24, app2 §9B

Förutsättning: 23A #2143273 GREEN (23B om fixes behövdes).

Gör endast:
1. Fyll i docs/parity-manifest.md — alla 6 rader ✅ iOS OCH Android
2. Signering: datum, git commit, enhetsmodeller, signerad av
3. Parity Manifest = SPOT — engineering underhåller
4. Divergens: beteende → omedelbar fix · feature-gap → owner + ❌ i manifest
5. Gate 24 FAIL → re-open #2143329 · manifest uppdateras · re-test

72h-regel:
□ Varje ❌ har plan inom 72h (fix deploy eller godkänd undantag + owner)

Kill switch policy (dokumentera i manifest/PR):
□ KILL_SWITCH_23A — vid 23A FAIL/incident: blockerar 23B + bred Android-release
□ KILL_SWITCH_24 — endast produktägare + 72h remediation (parity bypass akut 9B)

Gör INTE: nya features, SSE, barn-wow, fältstudie

TEST:
□ parity-manifest.md 6/6 ✅
□ Kill switches AV om Gate 24 GREEN

VI HÄNDER Gate 24 FAIL:
→ Re-open #2143329 · manifest uppdateras · 9B blockerad

Release-gate: 9B tillåten

FÖRBJUDET i denna task:
❌ Capacitor.isNativePlatform() i view-filer
❌ Plattformscheck utanför platform.js
❌ Blanda barn-PIN och app-lås-PIN
❌ Scope utanför listan "Gör endast"
❌ Refactor av orelaterade filer
```

---

## Verifiering efter deploy (Polsia kör)

1. Uppdatera [parity-manifest.md](../parity-manifest.md) — 6/6 ✅ iOS + Android
2. Inga nya features — endast parity-fixar om ❌

---

## Signering i PR

- [ ] Scope = endast denna sprint
- [ ] npm test + npm run lint (se [02-verify-and-tests.md](../02-verify-and-tests.md))
- [ ] SW bump om klient/HTML ändrats
- [ ] Commit-hash noterad i Polsia-svar
