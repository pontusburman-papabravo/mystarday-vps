# Sprint 22b — Deep links client

| Fält | Värde |
|------|--------|
| **Kö-position** | 22 |
| **Polsia** | #2143404 |
| **P0** | P0.5 |
| **Timmar (plan)** | 2 |
| **Layer** | 3 |
| **Deploy** | En task = ett deploy till Polsia prod |

**Källor:** [app2.md](../../app2.md) · [ios-städ.md](../ios-städ.md) · [android.md](../../android.md)

---

## Polsia-prompt (copy-paste hela blocket)

```
Uppgift: Sprint 22b — Deep links client + push-tap routing

Polsia: #2143404
Läs: app2 P0.5, push-manager.js

Gör endast:
1. @capacitor/app (eller motsvarande) — lyssna på appUrlOpen / deep link
2. Route-hantering: invite, confirm-email, pedagog-invite → rätt vy i WebView
3. FCM-notis (sprint 20): tap med URL → samma route-handler
4. Fallback: öppna webb-URL om path okänd
5. SW bump om klient ändrad

Gör INTE: assetlinks (22a), IAP, SSE

TEST:
□ adb VIEW https://mystarday.se/invite/TEST → rätt vy
□ Push-tap → rätt route (inte bara dashboard root)

Release-gate: Deep links före 9B ✓

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
