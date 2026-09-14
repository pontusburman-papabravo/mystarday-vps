# Payments go-live — 1 oktober 2026

Slå **inte** på betalning nu. IAP-cutoff är `payment_start_at` = `2026-10-01T00:00:00+02:00` (00:00 Europe/Stockholm).

Livstidsgratis är ett **annat** datum: `lifetime_free_until` = `2026-09-14T00:00:00+02:00`. Alla familjer skapade **före** det ögonblicket (t.o.m. 13 september 2026, alla länder) är grandfatherade. Familjer som registrerar sig från 14 september **i Sverige** (intro-år-policy) får **1 år gratis** från registreringsögonblicket, därefter IAP.

Nya öppna-marknad-konton blockeras **inte** av `MARKET_BILLING_NOT_READY` mellan 14 september och 1 oktober — intro-året gör kontot användbart utan köpväg.

Detta öppnar **inte** Irland/Finland (`market_ie_open` / `market_fi_open` ska fortsätta vara AV tills separat beslut).

Irland är **inte** intro-år. Ny IE-familj ska få 7 dagars trial + billing-ready, se [`docs/ie-paid-launch-kravspec.md`](../ie-paid-launch-kravspec.md) och [ADR-023](../adr/ADR-023-market-commercial-policy.md). Detta runbook rör **Sveriges** IAP 1 oktober.

## Vad servern gör automatiskt

Scheduler `payment-go-live` (startas från `server.js`, hoppas över i `NODE_ENV=test`):

1. Väntar till cutoff (omstart fångar upp missat ögonblick).
2. Fail-closed: slår **inte** på något om `BILLING_UI_DISABLED` är satt, om `IAP_PAID_ROLLOUT_READY=0`, om go-live är avarmad, eller om RevenueCat-readiness saknas.
3. När villkoren är uppfyllda sätter den `app_settings.payment_enabled = true` **och** `iap_paid_rollout_ready = true`, och skriver `payment_go_live_applied_at`.
4. Efter lyckad apply: en admin som stänger `payment_enabled` vinner — schedulern slår **inte** på igen.

Armering är **på som default** (grundarbeslut 1 oktober). Avarma i Admin → Prenumeration om go-live måste stoppas.

## Måste göras före 1 oktober (människa / VPS)

`BILLING_UI_DISABLED` är en **env-kill-switch**. Koden kan inte ta bort den.

Gör detta **när som helst före cutoff** — det öppnar inte köp så länge `payment_enabled` och `iap_paid_rollout_ready` är false:

1. Ta bort `BILLING_UI_DISABLED` från VPS env (eller sätt inte `true`/`1`/`yes`).
2. Starta om apptjänsten på VPS, vänta 3 sekunder, kör `curl -s http://127.0.0.1:3000/health` (se deploy-ops).
3. Kontrollera `health.payment_go_live`:
   - `action: "wait"`
   - `blockers` tom, eller bara saker ni aktivt åtgärdar
   - `billing_ui_disabled: false`
   - `armed: true`

## RevenueCat / store (extern checklista)

Se `docs/PAYMENTS_STORE_COMPLIANCE.md`. Go-live kräver minst:

- `REVENUECAT_WEBHOOK_SECRET`
- `REVENUECAT_ALLOWED_APP_IDS`
- iOS + Android **public** SDK-nycklar
- `REVENUECAT_SECRET_API_KEY` (för `/api/iap/sync`)
- Produkt-allowlist som matchar `config/iap-product-contract.js`

Sandbox E2E på riktig enhet bör vara ifylld i `docs/PAYMENTS_V1_SANDBOX_E2E_RUN_LOG.md` innan ni litar på live-köp. Om den inte är körd: **avarma** go-live och åtgärda. Signup mellan 14 september och 1 oktober fungerar via intro-året även om IAP är av; från 1 oktober behövs köpväg för familjer vars intro-år senare löper ut.

## Natt till 1 oktober

Ingen deploy krävs för själva flaggbytet. Processen som redan kör måste vara uppe så schedulern tickar (eller starta om efter cutoff — catch-up körs vid boot).

Verifiera:

```bash
curl -s http://127.0.0.1:3000/health | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("payment_go_live")); print("paid", d.get("iap_paid_rollout_ready"))'
```

Förväntat efter lyckad go-live: `action: already_applied` eller `already_live`, `iap_paid_rollout_ready: true`.

## Nödstopp

1. Admin → Prenumeration → **Betalning aktiverad = AV**
2. Sätt `BILLING_UI_DISABLED=true` på VPS och starta om (hårdast)
3. `IAP_PAID_ROLLOUT_READY=0` tvångsavstänger paid-rollout

Efter ett lyckat go-live räcker (1) eller (2); schedulern re-enablar inte.

## POS

- Befintliga familjer t.o.m. 13 sep 2026: ingen överraskning (grandfather, alla länder). Konstitution 2.
- Nya familjer från 14 sep: 1 år gratis, sedan tydlig betald väg. Konstitution 2 + 5.
- Stjärnor köps inte. Barnytan har ingen IAP. R-02 / G-06.
